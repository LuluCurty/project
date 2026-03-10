import { redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const assignmentId = params.assignmentId;

    try {
        // 1. Buscar assignment + form + response
        const assignRes = await pool.query(`
            SELECT
                fa.id as assignment_id,
                fa.due_date,
                fa.period_reference,
                fa.is_completed,
                fa.completed_at,
                fa.assigned_at,
                f.id as form_id,
                f.title,
                f.description,
                fr.id as response_id,
                fr.submitted_at,
                u.first_name || ' ' || u.last_name as assigned_by_name
            FROM form_assignments fa
            JOIN forms f ON fa.form_id = f.id
            LEFT JOIN form_responses fr ON fr.assignment_id = fa.id
            JOIN users u ON fa.assigned_by = u.user_id
            WHERE fa.id = $1 AND fa.user_id = $2
        `, [assignmentId, user.user_id]);

        if (assignRes.rowCount === 0) {
            throw error(404, 'Resposta não encontrada');
        }

        const assignment = assignRes.rows[0];

        // Se não foi completado, redireciona para preencher
        if (!assignment.is_completed || !assignment.response_id) {
            throw redirect(303, `/forms/fill/${assignmentId}`);
        }

        // 2. Buscar campos do formulário (agregando múltiplos valores por campo)
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
        `, [assignment.response_id, assignment.form_id]);

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
        `, [assignment.response_id]);

        // Mapear arquivos por field_id
        const filesByField: Record<number, any> = {};
        for (const file of filesRes.rows) {
            filesByField[file.field_id] = file;
        }

        // Processar campos com suas respostas
        const fieldsWithAnswers = fieldsRes.rows.map(field => ({
            ...field,
            file: filesByField[field.id] || null
        }));

        return {
            assignment,
            fields: fieldsWithAnswers
        };

    } catch (e: any) {
        if (e.status || e.location) throw e; // Re-throw SvelteKit errors (HttpError e Redirect)
        console.error('Erro ao carregar resposta:', e);
        throw error(500, 'Erro ao carregar resposta');
    }
};
