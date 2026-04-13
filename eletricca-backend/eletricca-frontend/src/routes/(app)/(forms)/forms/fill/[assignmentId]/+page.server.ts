import { fail, redirect, error } from "@sveltejs/kit";
import { pool } from "$lib/server/db";
import { createNotification } from "$lib/server/notifications";
import { s3, BUCKETS } from "$lib/server/storage";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import type { PageServerLoad, Actions } from "./$types";

const MIME_WHITELIST: Record<string, string[]> = {
    image:      ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
    pdf:        ['application/pdf'],
    excel:      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
    word:       ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
    powerpoint: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'],
    audio:      ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'],
    video:      ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const assignmentId = params.assignmentId;

    try {
        const assignRes = await pool.query(`
            SELECT
                fa.id, fa.form_id, fa.is_completed, fa.due_date, fa.period_reference,
                f.title, f.description
            FROM form_assignments fa
            JOIN forms f ON fa.form_id = f.id
            WHERE fa.id = $1 AND fa.user_id = $2
        `, [assignmentId, user.user_id]);

        if (assignRes.rowCount === 0) throw error(404, 'Atribuição não encontrada');

        const row = assignRes.rows[0];
        const assignment = {
            ...row,
            due_date: row.due_date ? row.due_date.toISOString() : null
        };

        if (assignment.is_completed) {
            throw redirect(303, `/forms/view/${assignmentId}`);
        }

        const fieldsRes = await pool.query(`
            SELECT id, field_type, label, placeholder, options, is_required, field_order,
                   condition_field_id, condition_operator, condition_value, allowed_file_types
            FROM form_fields
            WHERE form_id = $1 AND is_deleted = FALSE
            ORDER BY field_order ASC
        `, [assignment.form_id]);

        return { assignment, fields: fieldsRes.rows };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar formulário:', e);
        throw error(500, 'Erro ao carregar formulário');
    }
};

export const actions: Actions = {
    submit: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const assignmentId = Number(params.assignmentId);
        const formData = await request.formData();

        // Verify assignment belongs to user and is not completed
        const assignCheck = await pool.query(`
            SELECT fa.form_id, fa.is_completed, fa.assigned_by, f.title AS form_title
            FROM form_assignments fa
            JOIN forms f ON f.id = fa.form_id
            WHERE fa.id = $1 AND fa.user_id = $2
        `, [assignmentId, user.user_id]);

        if (assignCheck.rowCount === 0) return fail(404, { error: 'Atribuição não encontrada.' });
        if (assignCheck.rows[0].is_completed) return fail(400, { error: 'Este formulário já foi respondido.' });

        const formId: number = assignCheck.rows[0].form_id;
        const assignedBy: number = assignCheck.rows[0].assigned_by;
        const formTitle: string = assignCheck.rows[0].form_title;

        // Load fields for validation
        const fieldsRes = await pool.query(`
            SELECT id, field_type, is_required, label,
                   condition_field_id, condition_operator, condition_value,
                   allowed_file_types
            FROM form_fields
            WHERE form_id = $1 AND is_deleted = FALSE
            ORDER BY field_order ASC
        `, [formId]);

        const fieldMap = new Map<number, any>(fieldsRes.rows.map((f: any) => [f.id, f]));

        // Build answer map for conditional visibility (server mirror of frontend logic)
        const submittedAnswers: Record<number, string> = {};
        for (const field of fieldsRes.rows) {
            const fKey = `field_${field.id}`;
            if (field.field_type === 'checkbox') {
                const vals = formData.getAll(fKey).map((v: any) => v.toString()).filter(Boolean);
                submittedAnswers[field.id] = vals.join(',');
            } else {
                const val = formData.get(fKey);
                submittedAnswers[field.id] = val instanceof File ? '' : (val ? val.toString() : '');
            }
        }

        function isFieldVisible(field: any): boolean {
            if (!field.condition_field_id) return true;
            const parentValue = submittedAnswers[field.condition_field_id];
            if (!parentValue || parentValue.trim() === '') return false;
            switch (field.condition_operator) {
                case 'equals':     return parentValue === field.condition_value;
                case 'not_equals': return parentValue !== field.condition_value;
                case 'contains':   return parentValue.includes(field.condition_value);
                default:           return true;
            }
        }

        // Server-side required field validation
        for (const field of fieldsRes.rows) {
            if (!field.is_required || !isFieldVisible(field)) continue;

            if (field.field_type === 'checkbox') {
                const values = formData.getAll(`field_${field.id}`);
                if (!values.length || (values.length === 1 && values[0] === '')) {
                    return fail(400, { error: `O campo "${field.label}" é obrigatório.` });
                }
            } else if (field.field_type === 'file') {
                const fileVal = formData.get(`field_${field.id}`);
                if (!(fileVal instanceof File) || fileVal.size === 0) {
                    return fail(400, { error: `O campo "${field.label}" requer um arquivo.` });
                }
            } else {
                const value = formData.get(`field_${field.id}`);
                if (!value || value.toString().trim() === '') {
                    return fail(400, { error: `O campo "${field.label}" é obrigatório.` });
                }
            }
        }

        // ── Step 1: validate and upload files to S3 before opening a DB transaction ──
        type UploadedFile = { fieldId: number; key: string; file: File };
        const uploadedFiles: UploadedFile[] = [];

        for (const [key, value] of formData.entries()) {
            if (!key.startsWith('field_') || !(value instanceof File) || value.size === 0) continue;
            const fieldId = Number(key.replace('field_', ''));
            const field = fieldMap.get(fieldId);
            if (!field || field.field_type !== 'file') continue;

            // MIME validation
            const allowedTypes: string[] = field.allowed_file_types ?? [];
            if (allowedTypes.length > 0) {
                const allowedMimes = allowedTypes.flatMap((cat: string) => MIME_WHITELIST[cat] ?? []);
                if (!allowedMimes.includes(value.type)) {
                    return fail(400, { error: `Tipo de arquivo não permitido para o campo "${field.label}".` });
                }
            }
            if (value.size > MAX_FILE_SIZE) {
                return fail(400, { error: `Arquivo do campo "${field.label}" excede o limite de 10MB.` });
            }

            const ext = value.name.split('.').pop()?.toLowerCase() ?? 'bin';
            const objectKey = `responses/${assignmentId}/${randomUUID()}.${ext}`;
            const buffer = Buffer.from(await value.arrayBuffer());

            await s3.send(new PutObjectCommand({
                Bucket: BUCKETS.forms,
                Key: objectKey,
                Body: buffer,
                ContentType: value.type,
                ContentLength: buffer.byteLength
            }));

            uploadedFiles.push({ fieldId, key: objectKey, file: value });
        }

        // ── Step 2: DB transaction ──
        const client = await pool.connect();
        let responseId = 0;

        try {
            await client.query('BEGIN');

            // Create response record
            const resQuery = await client.query(`
                INSERT INTO form_responses (form_id, user_id, assignment_id, submitted_at)
                VALUES ($1, $2, $3, NOW())
                RETURNING id
            `, [formId, user.user_id, assignmentId]);
            responseId = resQuery.rows[0].id;

            // Insert values for each field
            for (const [key, value] of formData.entries()) {
                if (!key.startsWith('field_')) continue;
                const fieldId = Number(key.replace('field_', ''));

                if (value instanceof File) {
                    if (value.size === 0) continue;
                    const uploaded = uploadedFiles.find(u => u.fieldId === fieldId);
                    if (!uploaded) continue;

                    // Insert into shared files table
                    const fileRes = await client.query(`
                        INSERT INTO files
                            (object_key, bucket, original_name, mime_type, file_size,
                             uploaded_by, reference_type, reference_id)
                        VALUES ($1, $2, $3, $4, $5, $6, 'form_response', $7)
                        RETURNING id
                    `, [
                        uploaded.key, BUCKETS.forms, uploaded.file.name,
                        uploaded.file.type, uploaded.file.size,
                        user.user_id, responseId
                    ]);

                    // Store the file id as the field value so we can retrieve it later
                    await client.query(`
                        INSERT INTO form_response_values (response_id, field_id, value)
                        VALUES ($1, $2, $3)
                    `, [responseId, fieldId, String(fileRes.rows[0].id)]);

                } else if (value !== null) {
                    await client.query(`
                        INSERT INTO form_response_values (response_id, field_id, value)
                        VALUES ($1, $2, $3)
                    `, [responseId, fieldId, value.toString()]);
                }
            }

            // Mark assignment complete
            await client.query(`
                UPDATE form_assignments
                SET is_completed = TRUE, completed_at = NOW()
                WHERE id = $1
            `, [assignmentId]);

            await client.query('COMMIT');

        } catch (e) {
            await client.query('ROLLBACK');
            // Delete any files already uploaded to S3
            if (uploadedFiles.length > 0) {
                await Promise.allSettled(
                    uploadedFiles.map(u =>
                        s3.send(new DeleteObjectCommand({ Bucket: BUCKETS.forms, Key: u.key }))
                    )
                );
            }
            console.error('Erro no submit do formulário:', e);
            return fail(500, { error: 'Erro ao salvar resposta.' });
        } finally {
            client.release();
        }

        // Notify the manager who assigned the form (after commit)
        const userName = `${user.first_name} ${user.last_name}`.trim();
        await createNotification({
            userId: assignedBy,
            title: 'Formulário respondido',
            message: `${userName} respondeu "${formTitle}"`,
            type: 'form_submitted',
            referenceType: 'form_response',
            referenceId: formId
        });

        throw redirect(303, '/forms/assigned?status=completed');
    }
};
