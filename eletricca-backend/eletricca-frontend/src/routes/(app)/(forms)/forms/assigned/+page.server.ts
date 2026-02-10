import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    // Filtro da URL: 'pending' (padrão) ou 'completed'
    const statusFilter = url.searchParams.get('status') || 'pending';
    
    // Paginação simples
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;

    try {
        const query = `
            SELECT 
                fa.id as assignment_id,
                fa.due_date,
                fa.period_reference,
                fa.is_completed,
                fa.completed_at,
                fa.assigned_at,
                f.title as form_title,
                f.description as form_description,
                u.first_name || ' ' || u.last_name as assigned_by_name
            FROM form_assignments fa
            JOIN forms f ON fa.form_id = f.id
            JOIN users u ON fa.assigned_by = u.user_id
            WHERE fa.user_id = $1
            AND ($2 = 'all' OR ($2 = 'pending' AND fa.is_completed = FALSE) OR ($2 = 'completed' AND fa.is_completed = TRUE))
            ORDER BY 
                -- Se pendente, ordena por data de entrega (mais urgente primeiro)
                -- Se concluído, ordena por data de conclusão (mais recente primeiro)
                CASE WHEN fa.is_completed THEN fa.completed_at END DESC,
                CASE WHEN NOT fa.is_completed THEN fa.due_date END ASC
            LIMIT $3 OFFSET $4
        `;

        const countQuery = `
            SELECT COUNT(*) as total 
            FROM form_assignments 
            WHERE user_id = $1
            AND ($2 = 'all' OR ($2 = 'pending' AND is_completed = FALSE) OR ($2 = 'completed' AND is_completed = TRUE))
        `;

        const [listRes, countRes] = await Promise.all([
            pool.query(query, [user.user_id, statusFilter, limit, offset]),
            pool.query(countQuery, [user.user_id, statusFilter])
        ]);

        return {
            assignments: listRes.rows,
            pagination: {
                page,
                limit,
                totalItems: Number(countRes.rows[0].total),
                totalPages: Math.ceil(Number(countRes.rows[0].total) / limit)
            },
            filter: statusFilter
        };

    } catch (e) {
        console.error(e);
        return { assignments: [], pagination: { totalItems: 0, limit: 1, totalPages: 1 }, filter: 'pending' };
    }
};