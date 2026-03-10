import { error, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAction } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, route, params, url }) => {
    guardAction(route.id, locals.user, 'view');

    const formId = Number(params.formId);
    if (!formId) throw error(404, 'Formulário não encontrado');

    const search = url.searchParams.get('search') || '';
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;

    try {
        // 1. Buscar dados do formulário
        const formRes = await pool.query(`
            SELECT id, title, description, is_active, created_at
            FROM forms WHERE id = $1
        `, [formId]);

        if (formRes.rowCount === 0) {
            throw error(404, 'Formulário não encontrado');
        }

        // 2. Buscar respostas com dados do usuário
        // LEFT JOIN em assignments para mostrar respostas órfãs (atribuição deletada)
        const responsesQuery = `
            SELECT
                fr.id as response_id,
                fr.submitted_at,
                fa.id as assignment_id,
                fa.period_reference,
                fa.due_date,
                fa.assigned_at,
                u.user_id,
                u.first_name,
                u.last_name,
                u.email,
                COALESCE(assigner.first_name || ' ' || assigner.last_name, '—') as assigned_by_name,
                (
                    SELECT COUNT(*)
                    FROM form_response_values frv
                    WHERE frv.response_id = fr.id
                ) as answers_count
            FROM form_responses fr
            LEFT JOIN form_assignments fa ON fr.assignment_id = fa.id
            JOIN users u ON fr.user_id = u.user_id
            LEFT JOIN users assigner ON fa.assigned_by = assigner.user_id
            WHERE fr.form_id = $1
            AND (
                u.first_name ILIKE $2
                OR u.last_name ILIKE $2
                OR u.email ILIKE $2
                OR COALESCE(fa.period_reference, '') ILIKE $2
            )
            ORDER BY fr.submitted_at DESC
            LIMIT $3 OFFSET $4
        `;

        // 3. Contagem total para paginação
        const countQuery = `
            SELECT COUNT(*) as total
            FROM form_responses fr
            LEFT JOIN form_assignments fa ON fr.assignment_id = fa.id
            JOIN users u ON fr.user_id = u.user_id
            WHERE fr.form_id = $1
            AND (
                u.first_name ILIKE $2
                OR u.last_name ILIKE $2
                OR u.email ILIKE $2
                OR COALESCE(fa.period_reference, '') ILIKE $2
            )
        `;

        // 4. Estatísticas do formulário
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM form_responses WHERE form_id = $1) as total_responses,
                (SELECT COUNT(*) FROM form_assignments WHERE form_id = $1 AND is_completed = FALSE) as pending_assignments,
                (SELECT COUNT(*) FROM form_assignments WHERE form_id = $1) as total_assignments,
                (SELECT COUNT(*) FROM form_fields WHERE form_id = $1 AND is_deleted = FALSE) as field_count
        `;

        const [responsesRes, countRes, statsRes] = await Promise.all([
            pool.query(responsesQuery, [formId, `%${search}%`, limit, offset]),
            pool.query(countQuery, [formId, `%${search}%`]),
            pool.query(statsQuery, [formId])
        ]);

        const totalItems = Number(countRes.rows[0].total);
        const stats = statsRes.rows[0];

        return {
            form: formRes.rows[0],
            responses: responsesRes.rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            },
            stats: {
                totalResponses: Number(stats.total_responses),
                pendingAssignments: Number(stats.pending_assignments),
                totalAssignments: Number(stats.total_assignments),
                fieldCount: Number(stats.field_count),
                completionRate: stats.total_assignments > 0
                    ? Math.round((stats.total_responses / stats.total_assignments) * 100)
                    : 0
            },
            search
        };

    } catch (e: any) {
        if (e.status) throw e;
        console.error('Erro ao carregar respostas:', e);
        throw error(500, 'Erro ao carregar respostas');
    }
};

export const actions: Actions = {
    delete: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'manage');

        const data = await request.formData();
        const responseId = Number(data.get('responseId'));

        if (!responseId) return fail(400, { error: 'ID inválido' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Deletar arquivos da resposta
            await client.query('DELETE FROM form_files WHERE response_id = $1', [responseId]);

            // 2. Deletar valores da resposta
            await client.query('DELETE FROM form_response_values WHERE response_id = $1', [responseId]);

            // 3. Deletar a resposta
            await client.query('DELETE FROM form_responses WHERE id = $1', [responseId]);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Erro ao excluir resposta' });
        } finally {
            client.release();
        }

        return { success: true };
    }
};
