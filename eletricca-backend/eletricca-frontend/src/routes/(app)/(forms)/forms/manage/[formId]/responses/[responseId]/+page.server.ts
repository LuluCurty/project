import { error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAction } from '$lib/server/auth';
import { s3 } from '$lib/server/storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, route, params }) => {
    guardAction(route.id, locals.user, 'view');

    const formId = Number(params.formId);
    const responseId = Number(params.responseId);

    if (!formId || !responseId) throw error(404, 'Resposta não encontrada');

    try {
        // 1. Response metadata + form + user
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

        if (responseRes.rowCount === 0) throw error(404, 'Resposta não encontrada');

        const responseRow = responseRes.rows[0];
        const response = {
            ...responseRow,
            submitted_at: responseRow.submitted_at ? responseRow.submitted_at.toISOString() : null,
            due_date:     responseRow.due_date     ? responseRow.due_date.toISOString()     : null,
            assigned_at:  responseRow.assigned_at  ? responseRow.assigned_at.toISOString()  : null
        };

        // 2. Fields with aggregated answer values
        const fieldsRes = await pool.query(`
            SELECT
                ff.id,
                ff.field_type,
                ff.label,
                ff.is_required,
                ff.field_order,
                ff.condition_field_id,
                ff.condition_operator,
                ff.condition_value,
                STRING_AGG(frv.value, ',' ORDER BY frv.id) as answer_value
            FROM form_fields ff
            LEFT JOIN form_response_values frv
                ON frv.field_id = ff.id AND frv.response_id = $1
            WHERE ff.form_id = $2 AND ff.is_deleted = FALSE
            GROUP BY ff.id, ff.field_type, ff.label, ff.is_required, ff.field_order,
                     ff.condition_field_id, ff.condition_operator, ff.condition_value
            ORDER BY ff.field_order ASC
        `, [responseId, formId]);

        // 3. For file-type fields, look up the file via the file_id stored in answer_value
        //    and generate a pre-signed download URL.
        const fields = await Promise.all(fieldsRes.rows.map(async (field: any) => {
            if (field.field_type !== 'file' || !field.answer_value) {
                return { ...field, file: null };
            }

            const fileId = Number(field.answer_value);
            if (!fileId) return { ...field, file: null };

            const fileRes = await pool.query(`
                SELECT id, original_name, mime_type, file_size, object_key, bucket
                FROM files
                WHERE id = $1
            `, [fileId]);

            if (fileRes.rows.length === 0) return { ...field, file: null };

            const f = fileRes.rows[0];
            let file_url: string | null = null;
            try {
                file_url = await getSignedUrl(
                    s3,
                    new GetObjectCommand({ Bucket: f.bucket, Key: f.object_key }),
                    { expiresIn: 3600 }
                );
            } catch { /* não bloqueia a página */ }

            return {
                ...field,
                file: {
                    file_name: f.original_name,
                    file_size: f.file_size,
                    mime_type: f.mime_type,
                    file_url
                }
            };
        }));

        return { response, fields };

    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar resposta:', e);
        throw error(500, 'Erro ao carregar resposta');
    }
};
