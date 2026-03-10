import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = 12;
    const offset = (page - 1) * limit;

    try {
        // Query para buscar respostas do usuário com detalhes do formulário
        const responsesQuery = `
            SELECT
                fr.id as response_id,
                fr.submitted_at,
                fa.id as assignment_id,
                fa.due_date,
                COALESCE(fa.period_reference, '') as period_reference,
                fa.completed_at,
                f.id as form_id,
                f.title as form_title,
                f.description as form_description,
                COALESCE(u.first_name || ' ' || u.last_name, '—') as assigned_by_name
            FROM form_responses fr
            LEFT JOIN form_assignments fa ON fr.assignment_id = fa.id
            JOIN forms f ON fr.form_id = f.id
            LEFT JOIN users u ON fa.assigned_by = u.user_id
            WHERE fr.user_id = $1
            AND (f.title ILIKE $2 OR f.description ILIKE $2 OR COALESCE(fa.period_reference, '') ILIKE $2)
            ORDER BY fr.submitted_at DESC
            LIMIT $3 OFFSET $4
        `;

        // Contagem total para paginação
        const countQuery = `
            SELECT COUNT(*) as total
            FROM form_responses fr
            LEFT JOIN form_assignments fa ON fr.assignment_id = fa.id
            JOIN forms f ON fr.form_id = f.id
            WHERE fr.user_id = $1
            AND (f.title ILIKE $2 OR f.description ILIKE $2 OR COALESCE(fa.period_reference, '') ILIKE $2)
        `;

        // Estatísticas do usuário (2 queries: uma para form_responses, outra para form_assignments)
        const responseStatsQuery = `
            SELECT COUNT(*) as total_responses, COUNT(DISTINCT form_id) as unique_forms
            FROM form_responses WHERE user_id = $1
        `;
        const pendingStatsQuery = `
            SELECT COUNT(*) as pending_forms
            FROM form_assignments WHERE user_id = $1 AND is_completed = FALSE
        `;

        const [responsesRes, countRes, responseStatsRes, pendingStatsRes] = await Promise.all([
            pool.query(responsesQuery, [user.user_id, `%${search}%`, limit, offset]),
            pool.query(countQuery, [user.user_id, `%${search}%`]),
            pool.query(responseStatsQuery, [user.user_id]),
            pool.query(pendingStatsQuery, [user.user_id])
        ]);

        const totalItems = Number(countRes.rows[0].total);

        return {
            responses: responsesRes.rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            },
            stats: {
                totalResponses: Number(responseStatsRes.rows[0].total_responses),
                pendingForms: Number(pendingStatsRes.rows[0].pending_forms),
                uniqueForms: Number(responseStatsRes.rows[0].unique_forms)
            },
            search
        };

    } catch (e) {
        console.error('Erro ao carregar respostas:', e);
        return {
            responses: [],
            pagination: { page: 1, limit, totalItems: 0, totalPages: 1 },
            stats: { totalResponses: 0, pendingForms: 0, uniqueForms: 0 },
            search
        };
    }
};
