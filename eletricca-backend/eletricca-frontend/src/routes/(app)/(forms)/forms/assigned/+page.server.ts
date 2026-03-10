import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    // Filtro da URL: 'pending' (padrão) ou 'completed'
    let status = url.searchParams.get('status') || 'pending';
    if (status !== 'pending' && status !== 'completed') {
        status = 'pending';
    }
    
    const statusFilter = status;
    // Paginação simples
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = 12;
    const offset = (page - 1) * limit;

    try {
        const conditions = ['fa.user_id = $1'];
        const params: (string | number)[] = [user.user_id];

        if (statusFilter === 'pending') {
            conditions.push('fa.is_completed = FALSE');
        } else if (statusFilter === 'completed') {
            conditions.push('fa.is_completed = TRUE');
        }

        const whereClause = conditions.join(' AND ');

        const orderBy = statusFilter === 'completed'
            ? 'fa.completed_at DESC NULLS LAST'
            : 'fa.due_date ASC NULLS LAST, fa.assigned_at DESC';

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
            WHERE ${whereClause}
            ORDER BY ${orderBy}
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM form_assignments fa
            WHERE ${whereClause}
        `;

        const [listRes, countRes] = await Promise.all([
            pool.query(query, [...params, limit, offset]),
            pool.query(countQuery, params)
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
        return { assignments: [], pagination: { totalItems: 0, page, limit: 1, totalPages: 1 }, filter: 'pending' };
    }
};