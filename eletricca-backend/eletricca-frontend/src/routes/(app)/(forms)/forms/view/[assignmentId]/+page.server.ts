import { redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { s3 } from '$lib/server/storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const assignmentId = params.assignmentId;

    try {
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

        if (assignRes.rowCount === 0) throw error(404, 'Resposta não encontrada');

        const assignRow = assignRes.rows[0];
        const assignment = {
            ...assignRow,
            due_date:     assignRow.due_date     ? assignRow.due_date.toISOString()     : null,
            completed_at: assignRow.completed_at ? assignRow.completed_at.toISOString() : null,
            assigned_at:  assignRow.assigned_at  ? assignRow.assigned_at.toISOString()  : null,
            submitted_at: assignRow.submitted_at ? assignRow.submitted_at.toISOString() : null
        };

        if (!assignment.is_completed || !assignment.response_id) {
            throw redirect(303, `/forms/fill/${assignmentId}`);
        }

        // Fields with aggregated answer values
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
        `, [assignment.response_id, assignment.form_id]);

        // For file-type fields, answer_value contains the file_id (integer stored as text).
        // Look up file metadata and generate a pre-signed download URL.
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

        return { assignment, fields };

    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar resposta:', e);
        throw error(500, 'Erro ao carregar resposta');
    }
};
