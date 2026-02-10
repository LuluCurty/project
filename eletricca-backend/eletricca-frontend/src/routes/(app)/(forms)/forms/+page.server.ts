import { redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const search = url.searchParams.get('search') || '';
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        // Query principal: formulários com contagem de campos e respostas
        const formsQuery = `
            SELECT
                f.id,
                f.title,
                f.description,
                f.is_active,
                f.created_at,
                (
                    SELECT COUNT(*)
                    FROM form_fields ff
                    WHERE ff.form_id = f.id AND ff.is_deleted = FALSE
                ) as field_count,
                (
                    SELECT COUNT(*)
                    FROM form_responses fr
                    WHERE fr.form_id = f.id
                ) as response_count
            FROM forms f
            WHERE f.title ILIKE $1 OR f.description ILIKE $1
            ORDER BY f.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        // Contagem total para paginação
        const countQuery = `
            SELECT COUNT(*) as total
            FROM forms f
            WHERE f.title ILIKE $1 OR f.description ILIKE $1
        `;

        // Estatísticas gerais (sem filtro de busca)
        const statsQuery = `
            SELECT
                COUNT(*) as total_forms,
                COUNT(*) FILTER (WHERE is_active = TRUE) as active_forms,
                (SELECT COUNT(*) FROM form_responses) as total_responses
            FROM forms
        `;

        // Formulários pendentes do usuário atual
        const pendingQuery = `
            SELECT COUNT(*) as pending
            FROM form_assignments
            WHERE user_id = $1 AND is_completed = FALSE
        `;

        const [formsRes, countRes, statsRes, pendingRes] = await Promise.all([
            pool.query(formsQuery, [`%${search}%`, limit, offset]),
            pool.query(countQuery, [`%${search}%`]),
            pool.query(statsQuery),
            pool.query(pendingQuery, [user.user_id])
        ]);

        const totalItems = Number(countRes.rows[0].total);

        return {
            forms: formsRes.rows.map(row => ({
                ...row,
                field_count: Number(row.field_count),
                response_count: Number(row.response_count)
            })),
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            },
            stats: {
                totalForms: Number(statsRes.rows[0].total_forms),
                activeForms: Number(statsRes.rows[0].active_forms),
                totalResponses: Number(statsRes.rows[0].total_responses),
                pendingAssignments: Number(pendingRes.rows[0].pending)
            },
            search
        };

    } catch (e) {
        console.error('Erro ao carregar formulários:', e);
        throw error(500, 'Erro ao carregar formulários');
    }
};
