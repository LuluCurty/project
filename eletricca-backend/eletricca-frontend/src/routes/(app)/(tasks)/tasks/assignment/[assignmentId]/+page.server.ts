import { redirect, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { createNotification } from '$lib/server/notifications';
import { s3, BUCKETS } from '$lib/server/storage';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PageServerLoad, Actions } from './$types';

// MIME types aceitos por categoria
const MIME_WHITELIST: Record<string, string[]> = {
    image:       ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
    excel:       ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
    word:        ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
    powerpoint:  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'],
    audio:       ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'],
    video:       ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp']
};

// Calcula e aplica o novo status do assignment após uma mudança de step
async function applyAssignmentStatus(assignmentId: number, taskId: number) {
    const totalRes = await pool.query(
        `SELECT COUNT(*) as total FROM task_steps WHERE task_id = $1`, [taskId]
    );
    const doneRes = await pool.query(
        `SELECT COUNT(*) as done FROM task_step_progress WHERE assignment_id = $1 AND is_completed = TRUE`, [assignmentId]
    );
    const total = Number(totalRes.rows[0].total);
    const done  = Number(doneRes.rows[0].done);

    let newStatus = 'pending';
    if (total > 0 && done === total) newStatus = 'completed';
    else if (done > 0)               newStatus = 'in_progress';

    const completedAtExpr = newStatus === 'completed' ? 'NOW()' : 'NULL::timestamptz';
    await pool.query(`
        UPDATE task_assignments SET status = $1, completed_at = ${completedAtExpr} WHERE id = $2
    `, [newStatus, assignmentId]);

    return newStatus;
}

// Auto-reseta um assignment recorrente após conclusão
async function autoResetRecurring(
    assignmentId: number,
    ownerRow: Record<string, any>,
    userId: number,
    taskTitle: string,
    recurrenceRule: string
) {
    function addInterval(date: Date | null, rule: string): Date | null {
        if (!date) return null;
        const next = new Date(date);
        switch (rule) {
            case 'daily':     next.setDate(next.getDate() + 1); break;
            case 'weekly':    next.setDate(next.getDate() + 7); break;
            case 'biweekly':  next.setDate(next.getDate() + 14); break;
            case 'monthly':   next.setMonth(next.getMonth() + 1); break;
            case 'quarterly': next.setMonth(next.getMonth() + 3); break;
            case 'yearly':    next.setFullYear(next.getFullYear() + 1); break;
        }
        return next;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const cycleRes = await client.query(
            `SELECT COALESCE(MAX(cycle), 0) + 1 as next_cycle FROM task_assignment_history WHERE assignment_id = $1`,
            [assignmentId]
        );
        const cycle = cycleRes.rows[0].next_cycle;

        const stepsSnapshotRes = await client.query(`
            SELECT tsp.step_id, ts.title, ts.step_order, tsp.completed_at,
                   f.id as file_id, f.original_name as file_name, f.object_key as file_key, f.bucket
            FROM task_step_progress tsp
            JOIN task_steps ts ON ts.id = tsp.step_id
            LEFT JOIN files f ON f.id = tsp.file_id
            WHERE tsp.assignment_id = $1 AND tsp.is_completed = TRUE
        `, [assignmentId]);

        const stepsSnapshot = stepsSnapshotRes.rows.map((s: any) => ({
            step_id:    s.step_id,
            title:      s.title,
            step_order: s.step_order,
            completed_at: s.completed_at ? s.completed_at.toISOString() : null,
            file_id:    s.file_id   ?? null,
            file_name:  s.file_name ?? null,
            file_key:   s.file_key  ?? null,
            bucket:     s.bucket    ?? null
        }));

        await client.query(`
            INSERT INTO task_assignment_history (assignment_id, cycle, assigned_at, completed_at, steps_snapshot)
            VALUES ($1, $2, $3, NOW(), $4)
        `, [assignmentId, cycle, ownerRow.assigned_at, JSON.stringify(stepsSnapshot)]);

        await client.query(`DELETE FROM task_step_progress WHERE assignment_id = $1`, [assignmentId]);

        const nextDueDate       = addInterval(ownerRow.due_date, recurrenceRule);
        const availableBase     = ownerRow.available_from ?? ownerRow.due_date ?? new Date();
        const nextAvailableFrom = addInterval(availableBase, recurrenceRule);

        await client.query(`
            UPDATE task_assignments
            SET status = 'pending', completed_at = NULL, assigned_at = NOW(),
                due_date = $1, available_from = $2
            WHERE id = $3
        `, [nextDueDate, nextAvailableFrom, assignmentId]);

        await client.query('COMMIT');

        await createNotification({
            userId,
            title: 'Próximo ciclo programado',
            message: `"${taskTitle}" será reiniciada em ${nextAvailableFrom?.toLocaleDateString('pt-BR') ?? 'breve'}`,
            type: 'task_assigned',
            referenceType: 'task_assignment',
            referenceId: assignmentId
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao auto-resetar ciclo recorrente:', err);
    } finally {
        client.release();
    }
}

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const assignmentId = Number(params.assignmentId);
    if (!assignmentId) throw redirect(302, '/tasks');

    try {
        const [assignmentRes, stepsRes] = await Promise.all([
            pool.query(`
                SELECT
                    ta.id as assignment_id,
                    ta.task_id,
                    ta.status,
                    ta.priority,
                    ta.due_date,
                    ta.available_from,
                    ta.assigned_at,
                    ta.completed_at,
                    t.title,
                    t.description,
                    COALESCE(tc.name, '') as category_name,
                    COALESCE(ab.first_name || ' ' || ab.last_name, '—') as assigned_by_name
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                LEFT JOIN users ab ON ta.assigned_by = ab.user_id
                WHERE ta.id = $1
                  AND ta.user_id = $2
                  AND ta.deleted_at IS NULL
            `, [assignmentId, user.user_id]),

            pool.query(`
                SELECT
                    ts.id,
                    ts.title,
                    ts.description,
                    ts.step_order,
                    ts.step_type,
                    ts.allowed_file_types,
                    COALESCE(tsp.is_completed, FALSE) as is_completed,
                    tsp.completed_at,
                    tsp.id as progress_id,
                    tsp.file_id,
                    f.original_name as file_name,
                    f.object_key as file_key
                FROM task_steps ts
                LEFT JOIN task_step_progress tsp
                    ON tsp.step_id = ts.id AND tsp.assignment_id = $1
                LEFT JOIN files f ON f.id = tsp.file_id
                WHERE ts.task_id = (
                    SELECT task_id FROM task_assignments WHERE id = $1 AND user_id = $2
                )
                ORDER BY ts.step_order
            `, [assignmentId, user.user_id])
        ]);

        if (assignmentRes.rows.length === 0) throw redirect(302, '/tasks');

        const row = assignmentRes.rows[0];
        const assignment = {
            ...row,
            due_date:       row.due_date       ? row.due_date.toISOString()       : null,
            available_from: row.available_from ? row.available_from.toISOString() : null,
            assigned_at:    row.assigned_at    ? row.assigned_at.toISOString()    : null,
            completed_at:   row.completed_at   ? row.completed_at.toISOString()   : null
        };

        // Gera pre-signed URLs para steps com arquivo
        const steps = await Promise.all(stepsRes.rows.map(async (s: any) => {
            let file_url: string | null = null;
            if (s.file_id && s.file_key) {
                try {
                    file_url = await getSignedUrl(
                        s3,
                        new GetObjectCommand({ Bucket: BUCKETS.tasks, Key: s.file_key }),
                        { expiresIn: 3600 }
                    );
                } catch { /* não bloqueia a página se a URL falhar */ }
            }
            return {
                ...s,
                allowed_file_types: s.allowed_file_types ?? [],
                completed_at: s.completed_at ? s.completed_at.toISOString() : null,
                file_url
            };
        }));

        return { assignment, steps };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar assignment:', e);
        throw redirect(302, '/tasks');
    }
};

export const actions: Actions = {
    toggleStep: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const assignmentId = Number(params.assignmentId);
        const formData = await request.formData();
        const stepId = Number(formData.get('stepId'));

        if (!stepId) return fail(400, { error: 'Step inválido.' });

        try {
            const ownerCheck = await pool.query(
                `SELECT ta.id, ta.task_id, ta.available_from, ta.assigned_at, ta.completed_at,
                        ta.due_date, t.is_recurring, t.recurrence_rule, t.title
                 FROM task_assignments ta
                 JOIN tasks t ON ta.task_id = t.id
                 WHERE ta.id = $1 AND ta.user_id = $2 AND ta.deleted_at IS NULL`,
                [assignmentId, user.user_id]
            );
            if (ownerCheck.rows.length === 0) return fail(403, { error: 'Atribuição não encontrada.' });

            const a = ownerCheck.rows[0];
            if (a.available_from && new Date(a.available_from) > new Date()) {
                return fail(403, { error: 'Esta tarefa ainda não está disponível.' });
            }

            // Garante que é um step do tipo check
            const stepCheck = await pool.query(
                `SELECT step_type FROM task_steps WHERE id = $1`, [stepId]
            );
            if (stepCheck.rows[0]?.step_type === 'file_upload') {
                return fail(400, { error: 'Use o envio de arquivo para esta etapa.' });
            }

            await pool.query(`
                INSERT INTO task_step_progress (assignment_id, step_id, is_completed, completed_at)
                VALUES ($1, $2, TRUE, NOW())
                ON CONFLICT (assignment_id, step_id) DO UPDATE
                    SET is_completed = NOT task_step_progress.is_completed,
                        completed_at = CASE
                            WHEN NOT task_step_progress.is_completed THEN NOW()
                            ELSE NULL::timestamptz
                        END
            `, [assignmentId, stepId]);

            const newStatus = await applyAssignmentStatus(assignmentId, a.task_id);

            if (newStatus === 'completed') {
                const infoRes = await pool.query(`
                    SELECT ta.assigned_by, u.first_name || ' ' || u.last_name as user_name
                    FROM task_assignments ta
                    JOIN users u ON ta.user_id = u.user_id
                    WHERE ta.id = $1
                `, [assignmentId]);

                if (infoRes.rows.length > 0) {
                    await createNotification({
                        userId: infoRes.rows[0].assigned_by,
                        title: 'Tarefa concluída',
                        message: `${infoRes.rows[0].user_name} concluiu "${a.title}"`,
                        type: 'task_completed',
                        referenceType: 'task_assignment',
                        referenceId: assignmentId
                    });
                }

                if (a.is_recurring && a.recurrence_rule) {
                    await autoResetRecurring(assignmentId, a, user.user_id, a.title, a.recurrence_rule);
                }
            }

            return { success: true };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao toggle step:', e);
            return fail(500, { error: 'Erro ao atualizar etapa.' });
        }
    },

    uploadFile: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const assignmentId = Number(params.assignmentId);
        const formData = await request.formData();
        const stepId = Number(formData.get('stepId'));
        const file   = formData.get('file') as File | null;

        if (!stepId || !file || file.size === 0) return fail(400, { error: 'Dados inválidos.' });
        if (file.size > 50 * 1024 * 1024) return fail(400, { error: 'Arquivo muito grande (máx 50MB).' });

        try {
            const ownerCheck = await pool.query(
                `SELECT ta.id, ta.task_id, ta.available_from, ta.assigned_at,
                        ta.due_date, t.is_recurring, t.recurrence_rule, t.title
                 FROM task_assignments ta
                 JOIN tasks t ON ta.task_id = t.id
                 WHERE ta.id = $1 AND ta.user_id = $2 AND ta.deleted_at IS NULL`,
                [assignmentId, user.user_id]
            );
            if (ownerCheck.rows.length === 0) return fail(403, { error: 'Atribuição não encontrada.' });

            const a = ownerCheck.rows[0];
            if (a.available_from && new Date(a.available_from) > new Date()) {
                return fail(403, { error: 'Esta tarefa ainda não está disponível.' });
            }

            // Valida que o step é do tipo file_upload e pertence a esta tarefa
            const stepCheck = await pool.query(
                `SELECT ts.step_type, ts.allowed_file_types
                 FROM task_steps ts
                 JOIN task_assignments ta ON ta.task_id = ts.task_id
                 WHERE ts.id = $1 AND ta.id = $2`,
                [stepId, assignmentId]
            );
            if (stepCheck.rows.length === 0) return fail(404, { error: 'Etapa não encontrada.' });
            if (stepCheck.rows[0].step_type !== 'file_upload') {
                return fail(400, { error: 'Esta etapa não é do tipo envio de arquivo.' });
            }

            // Valida MIME type
            const allowedCategories: string[] = stepCheck.rows[0].allowed_file_types ?? [];
            const allowedMimes = allowedCategories.flatMap(c => MIME_WHITELIST[c] ?? []);
            if (!allowedMimes.includes(file.type)) {
                return fail(400, { error: `Tipo de arquivo não permitido: ${file.type || 'desconhecido'}` });
            }

            // Upload para VersityGW
            const ext       = file.name.split('.').pop() ?? 'bin';
            const uuid      = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const objectKey = `assignments/${assignmentId}/${uuid}.${ext}`;

            try {
                await s3.send(new PutObjectCommand({
                    Bucket: BUCKETS.tasks,
                    Key: objectKey,
                    Body: Buffer.from(await file.arrayBuffer()),
                    ContentType: file.type,
                    Metadata: { 'original-name': encodeURIComponent(file.name) }
                }));
            } catch (e) {
                console.error('Erro no upload VersityGW:', e);
                return fail(500, { error: 'Falha ao enviar arquivo para o storage.' });
            }

            // Transação: salva file + upsert progress + atualiza status
            const client = await pool.connect();
            let newStatus = 'pending';
            let infoRow: any = null;

            try {
                await client.query('BEGIN');

                const fileRes = await client.query(`
                    INSERT INTO files (object_key, bucket, original_name, mime_type, file_size, uploaded_by, reference_type, reference_id)
                    VALUES ($1, $2, $3, $4, $5, $6, 'task_step_progress', NULL)
                    RETURNING id
                `, [objectKey, BUCKETS.tasks, file.name, file.type, file.size, user.user_id]);

                const fileId = fileRes.rows[0].id;

                await client.query(`
                    INSERT INTO task_step_progress (assignment_id, step_id, is_completed, completed_at, file_id)
                    VALUES ($1, $2, TRUE, NOW(), $3)
                    ON CONFLICT (assignment_id, step_id) DO UPDATE
                        SET is_completed = TRUE, completed_at = NOW(), file_id = $3
                `, [assignmentId, stepId, fileId]);

                // Conta steps totais e concluídos
                const totalRes = await client.query(
                    `SELECT COUNT(*) as total FROM task_steps WHERE task_id = $1`, [a.task_id]
                );
                const doneRes = await client.query(
                    `SELECT COUNT(*) as done FROM task_step_progress WHERE assignment_id = $1 AND is_completed = TRUE`, [assignmentId]
                );
                const total = Number(totalRes.rows[0].total);
                const done  = Number(doneRes.rows[0].done);

                if (total > 0 && done === total) newStatus = 'completed';
                else if (done > 0)               newStatus = 'in_progress';

                const completedAtExpr = newStatus === 'completed' ? 'NOW()' : 'NULL::timestamptz';
                await client.query(`
                    UPDATE task_assignments SET status = $1, completed_at = ${completedAtExpr} WHERE id = $2
                `, [newStatus, assignmentId]);

                if (newStatus === 'completed') {
                    const res = await client.query(`
                        SELECT ta.assigned_by, u.first_name || ' ' || u.last_name as user_name
                        FROM task_assignments ta
                        JOIN users u ON ta.user_id = u.user_id
                        WHERE ta.id = $1
                    `, [assignmentId]);
                    infoRow = res.rows[0] ?? null;
                }

                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                // Limpa o arquivo do storage
                try { await s3.send(new DeleteObjectCommand({ Bucket: BUCKETS.tasks, Key: objectKey })); } catch {}
                console.error('Erro ao salvar arquivo no banco:', e);
                return fail(500, { error: 'Erro ao registrar arquivo.' });
            } finally {
                client.release();
            }

            // Pós-commit: notificação e auto-reset
            if (newStatus === 'completed' && infoRow) {
                await createNotification({
                    userId: infoRow.assigned_by,
                    title: 'Tarefa concluída',
                    message: `${infoRow.user_name} concluiu "${a.title}"`,
                    type: 'task_completed',
                    referenceType: 'task_assignment',
                    referenceId: assignmentId
                });

                if (a.is_recurring && a.recurrence_rule) {
                    await autoResetRecurring(assignmentId, a, user.user_id, a.title, a.recurrence_rule);
                }
            }

            return { success: true };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro no uploadFile:', e);
            return fail(500, { error: 'Erro ao processar envio de arquivo.' });
        }
    }
};
