import { redirect, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const taskId = Number(params.taskId);

    try {
        const [taskRes, stepsRes, categoriesRes] = await Promise.all([
            pool.query(`
                SELECT
                    t.id,
                    t.title,
                    t.description,
                    t.task_type,
                    t.status,
                    t.priority,
                    t.due_date,
                    t.completed_at,
                    t.created_at,
                    t.updated_at,
                    t.category_id,
                    COALESCE(tc.name, '') as category_name
                FROM tasks t
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                WHERE t.id = $1
                  AND t.task_type = 'personal'
                  AND t.created_by = $2
            `, [taskId, user.user_id]),
            pool.query(`
                SELECT id, title, step_order, is_completed, completed_at
                FROM task_steps
                WHERE task_id = $1
                ORDER BY step_order ASC
            `, [taskId]),
            pool.query(`SELECT id, name FROM task_categories ORDER BY name`)
        ]);

        if (taskRes.rows.length === 0) {
            throw redirect(302, '/tasks');
        }

        const row = taskRes.rows[0];
        const task = {
            ...row,
            due_date: row.due_date ? row.due_date.toISOString() : null,
            completed_at: row.completed_at ? row.completed_at.toISOString() : null,
            created_at: row.created_at ? row.created_at.toISOString() : null,
            updated_at: row.updated_at ? row.updated_at.toISOString() : null,
            steps: stepsRes.rows.map((s: any) => ({
                ...s,
                completed_at: s.completed_at ? s.completed_at.toISOString() : null
            }))
        };

        return { task, categories: categoriesRes.rows };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar task:', e);
        throw redirect(302, '/tasks');
    }
};

export const actions: Actions = {
    updateTask: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const taskId = Number(params.taskId);
        const formData = await request.formData();

        const title = String(formData.get('title') || '').trim();
        const description = String(formData.get('description') || '').trim();
        const priority = String(formData.get('priority') || 'medium');
        const status = String(formData.get('status') || 'pending');
        const dueDate = formData.get('due_date') ? String(formData.get('due_date')) : null;
        const categoryId = formData.get('category_id') ? Number(formData.get('category_id')) : null;

        if (!title) return fail(400, { error: 'Título é obrigatório.' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verify ownership
            const ownerCheck = await client.query(
                `SELECT id FROM tasks WHERE id = $1 AND task_type = 'personal' AND created_by = $2`,
                [taskId, user.user_id]
            );
            if (ownerCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return fail(403, { error: 'Tarefa não encontrada.' });
            }

            const completedAt = status === 'completed' ? 'NOW()' : 'NULL';

            await client.query(`
                UPDATE tasks SET
                    title = $1,
                    description = $2,
                    priority = $3,
                    status = $4,
                    due_date = $5,
                    category_id = $6,
                    completed_at = ${completedAt},
                    updated_at = NOW()
                WHERE id = $7
            `, [title, description || null, priority, status, dueDate, categoryId, taskId]);

            // Sync steps: parse JSON from form
            const stepsJson = formData.get('steps');
            if (stepsJson) {
                const steps = JSON.parse(String(stepsJson)) as Array<{
                    id?: number;
                    title: string;
                    step_order: number;
                    is_completed: boolean;
                }>;

                // Get existing step IDs
                const existingRes = await client.query(
                    `SELECT id FROM task_steps WHERE task_id = $1`,
                    [taskId]
                );
                const existingIds = new Set(existingRes.rows.map((r: any) => r.id));
                const incomingIds = new Set(steps.filter(s => s.id && typeof s.id === 'number' && s.id < 1000000000).map(s => s.id));

                // Delete removed steps
                for (const existingId of existingIds) {
                    if (!incomingIds.has(existingId)) {
                        await client.query(`DELETE FROM task_steps WHERE id = $1 AND task_id = $2`, [existingId, taskId]);
                    }
                }

                // Upsert steps
                for (const step of steps) {
                    const isExisting = step.id && typeof step.id === 'number' && step.id < 1000000000 && existingIds.has(step.id);

                    if (isExisting) {
                        await client.query(`
                            UPDATE task_steps SET
                                title = $1,
                                step_order = $2,
                                is_completed = $3,
                                completed_at = CASE WHEN $3 = TRUE AND is_completed = FALSE THEN NOW()
                                                    WHEN $3 = FALSE THEN NULL
                                                    ELSE completed_at END
                            WHERE id = $4 AND task_id = $5
                        `, [step.title, step.step_order, step.is_completed, step.id, taskId]);
                    } else {
                        await client.query(`
                            INSERT INTO task_steps (task_id, title, step_order, is_completed, completed_at)
                            VALUES ($1, $2, $3, $4, CASE WHEN $4 = TRUE THEN NOW() ELSE NULL END)
                        `, [taskId, step.title, step.step_order, step.is_completed]);
                    }
                }
            }

            await client.query('COMMIT');
            return { success: true };
        } catch (e: any) {
            await client.query('ROLLBACK');
            if (e.status || e.location) throw e;
            console.error('Erro ao atualizar task:', e);
            return fail(500, { error: 'Erro ao salvar tarefa.' });
        } finally {
            client.release();
        }
    },

    toggleComplete: async ({ locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const taskId = Number(params.taskId);

        try {
            const res = await pool.query(
                `SELECT status FROM tasks WHERE id = $1 AND task_type = 'personal' AND created_by = $2`,
                [taskId, user.user_id]
            );
            if (res.rows.length === 0) return fail(403, { error: 'Tarefa não encontrada.' });

            const currentStatus = res.rows[0].status;
            const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

            await pool.query(`
                UPDATE tasks SET
                    status = $1,
                    completed_at = ${newStatus === 'completed' ? 'NOW()' : 'NULL'},
                    updated_at = NOW()
                WHERE id = $2
            `, [newStatus, taskId]);

            return { success: true };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao alternar status:', e);
            return fail(500, { error: 'Erro ao atualizar status.' });
        }
    },

    deleteTask: async ({ locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const taskId = Number(params.taskId);

        try {
            const res = await pool.query(
                `DELETE FROM tasks WHERE id = $1 AND task_type = 'personal' AND created_by = $2 RETURNING id`,
                [taskId, user.user_id]
            );
            if (res.rows.length === 0) return fail(403, { error: 'Tarefa não encontrada.' });

            throw redirect(302, '/tasks');
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao excluir task:', e);
            return fail(500, { error: 'Erro ao excluir tarefa.' });
        }
    },

    toggleStep: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const taskId = Number(params.taskId);
        const formData = await request.formData();
        const stepId = Number(formData.get('stepId'));

        try {
            // Verify ownership
            const ownerCheck = await pool.query(
                `SELECT t.id FROM tasks t
                 JOIN task_steps ts ON ts.task_id = t.id
                 WHERE t.id = $1 AND t.task_type = 'personal' AND t.created_by = $2 AND ts.id = $3`,
                [taskId, user.user_id, stepId]
            );
            if (ownerCheck.rows.length === 0) return fail(403, { error: 'Etapa não encontrada.' });

            await pool.query(`
                UPDATE task_steps SET
                    is_completed = NOT is_completed,
                    completed_at = CASE WHEN is_completed = TRUE THEN NULL ELSE NOW() END
                WHERE id = $1
            `, [stepId]);

            // Auto-update task status based on steps
            const stepsRes = await pool.query(
                `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_completed = TRUE) as done
                 FROM task_steps WHERE task_id = $1`,
                [taskId]
            );
            const { total, done } = stepsRes.rows[0];
            if (Number(total) > 0) {
                if (Number(done) === Number(total)) {
                    await pool.query(
                        `UPDATE tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
                        [taskId]
                    );
                } else if (Number(done) > 0) {
                    await pool.query(
                        `UPDATE tasks SET status = 'in_progress', completed_at = NULL, updated_at = NOW() WHERE id = $1 AND status != 'in_progress'`,
                        [taskId]
                    );
                }
            }

            return { success: true };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao toggle step:', e);
            return fail(500, { error: 'Erro ao atualizar etapa.' });
        }
    }
};
