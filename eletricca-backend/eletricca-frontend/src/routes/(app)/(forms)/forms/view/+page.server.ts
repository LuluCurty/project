import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const search = url.searchParams.get('search') || '';
    const page = Number(url.searchParams.get('page')) || 1;
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
                fa.period_reference,
                fa.completed_at,
                f.id as form_id,
                f.title as form_title,
                f.description as form_description,
                u.first_name || ' ' || u.last_name as assigned_by_name,
                (
                    SELECT COUNT(*)
                    FROM form_response_values frv
                    WHERE frv.response_id = fr.id
                ) as answers_count
            FROM form_responses fr
            JOIN form_assignments fa ON fr.assignment_id = fa.id
            JOIN forms f ON fr.form_id = f.id
            JOIN users u ON fa.assigned_by = u.user_id
            WHERE fr.user_id = $1
            AND (f.title ILIKE $2 OR f.description ILIKE $2 OR fa.period_reference ILIKE $2)
            ORDER BY fr.submitted_at DESC
            LIMIT $3 OFFSET $4
        `;

        // Contagem total para paginação
        const countQuery = `
            SELECT COUNT(*) as total
            FROM form_responses fr
            JOIN form_assignments fa ON fr.assignment_id = fa.id
            JOIN forms f ON fr.form_id = f.id
            WHERE fr.user_id = $1
            AND (f.title ILIKE $2 OR f.description ILIKE $2 OR fa.period_reference ILIKE $2)
        `;

        // Estatísticas do usuário
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM form_responses WHERE user_id = $1) as total_responses,
                (SELECT COUNT(*) FROM form_assignments WHERE user_id = $1 AND is_completed = FALSE) as pending_forms,
                (
                    SELECT COUNT(DISTINCT form_id)
                    FROM form_responses
                    WHERE user_id = $1
                ) as unique_forms
            FROM (SELECT 1) as dummy
        `;

        const [responsesRes, countRes, statsRes] = await Promise.all([
            pool.query(responsesQuery, [user.user_id, `%${search}%`, limit, offset]),
            pool.query(countQuery, [user.user_id, `%${search}%`]),
            pool.query(statsQuery, [user.user_id])
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
                totalResponses: Number(statsRes.rows[0].total_responses),
                pendingForms: Number(statsRes.rows[0].pending_forms),
                uniqueForms: Number(statsRes.rows[0].unique_forms)
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
