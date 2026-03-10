import { error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAction } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, route, params }) => {
    guardAction(route.id, locals.user, 'view');

    const formId = Number(params.formId);
    const responseId = Number(params.responseId);

    if (!formId || !responseId) {
        throw error(404, 'Resposta não encontrada');
    }

    try {
        // 1. Buscar dados da resposta + formulário + usuário
        const responseRes = await pool.query(`
            SELECT
                fr.id as response_id,
                fr.submitted_at,
                fa.id as assignment_id,
                fa.period_reference,
                fa.due_date,
                fa.assigned_at,
                f.id as form_id,
                f.title as form_title,
                f.description as form_description,
                u.user_id,
                u.first_name,
                u.last_name,
                u.email,
                COALESCE(assigner.first_name || ' ' || assigner.last_name, '—') as assigned_by_name
            FROM form_responses fr
            LEFT JOIN form_assignments fa ON fr.assignment_id = fa.id
            JOIN forms f ON fr.form_id = f.id
            JOIN users u ON fr.user_id = u.user_id
            LEFT JOIN users assigner ON fa.assigned_by = assigner.user_id
            WHERE fr.id = $1 AND fr.form_id = $2
        `, [responseId, formId]);

        if (responseRes.rowCount === 0) {
            throw error(404, 'Resposta não encontrada');
        }

        const response = responseRes.rows[0];

        // 2. Buscar campos com respostas (agregando múltiplos valores)
        const fieldsRes = await pool.query(`
            SELECT
                ff.id,
                ff.form_id,
                ff.field_type,
                ff.label,
                ff.placeholder,
                ff.options,
                ff.is_required,
                ff.field_order,
                ff.condition_field_id,
                ff.condition_operator,
                ff.condition_value,
                STRING_AGG(frv.value, ',' ORDER BY frv.id) as answer_value
            FROM form_fields ff
            LEFT JOIN form_response_values frv ON frv.field_id = ff.id AND frv.response_id = $1
            WHERE ff.form_id = $2 AND ff.is_deleted = FALSE
            GROUP BY ff.id, ff.form_id, ff.field_type, ff.label, ff.placeholder, ff.options,
                     ff.is_required, ff.field_order, ff.condition_field_id, ff.condition_operator,
                     ff.condition_value
            ORDER BY ff.field_order ASC
        `, [responseId, formId]);

        // 3. Buscar arquivos enviados
        const filesRes = await pool.query(`
            SELECT
                field_id,
                file_name,
                file_path,
                file_type,
                file_size
            FROM form_files
            WHERE response_id = $1
        `, [responseId]);

        // Mapear arquivos por field_id
        const filesByField: Record<number, any> = {};
        for (const file of filesRes.rows) {
            filesByField[file.field_id] = file;
        }

        // Combinar campos com arquivos
        const fieldsWithAnswers = fieldsRes.rows.map(field => ({
            ...field,
            file: filesByField[field.id] || null
        }));

        return {
            response,
            fields: fieldsWithAnswers
        };

    } catch (e: any) {
        if (e.status) throw e;
        console.error('Erro ao carregar resposta:', e);
        throw error(500, 'Erro ao carregar resposta');
    }
};
