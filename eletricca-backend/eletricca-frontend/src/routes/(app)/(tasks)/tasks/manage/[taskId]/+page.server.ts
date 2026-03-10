import { redirect, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const taskId = Number(params.taskId);
    if (!taskId) throw redirect(302, '/tasks/manage');

    try {
        const [taskRes, stepsRes, categoriesRes] = await Promise.all([
            pool.query(`
                SELECT
                    t.id,
                    t.title,
                    t.description,
                    t.task_type,
                    t.category_id,
                    COALESCE(tc.name, '') as category_name,
                    t.priority,
                    t.is_recurring,
                    t.recurrence_rule,
                    COALESCE(u.first_name || ' ' || u.last_name, '—') as created_by_name,
                    t.created_at,
                    t.updated_at,
                    (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id) as assignment_count
                FROM tasks t
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                LEFT JOIN users u ON t.created_by = u.user_id
                WHERE t.id = $1
                  AND t.task_type = 'assigned'
            `, [taskId]),
            pool.query(`
                SELECT id, title, description, step_order
                FROM task_steps
                WHERE task_id = $1
                ORDER BY step_order
            `, [taskId]),
            pool.query(`SELECT id, name FROM task_categories ORDER BY name`)
        ]);

        if (taskRes.rows.length === 0) throw redirect(302, '/tasks/manage');

        const row = taskRes.rows[0];
        const task = {
            ...row,
            assignment_count: Number(row.assignment_count),
            created_at: row.created_at ? row.created_at.toISOString() : null,
            updated_at: row.updated_at ? row.updated_at.toISOString() : null,
            steps: stepsRes.rows.map((s: any) => ({
                id: s.id,
                title: s.title,
                description: s.description || '',
                step_order: s.step_order
            }))
        };

        return { task, categories: categoriesRes.rows };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar tarefa:', e);
        throw redirect(302, '/tasks/manage');
    }
};

export const actions: Actions = {
    updateTask: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const taskId = Number(params.taskId);
        const formData = await request.formData();
        const title = (formData.get('title') as string || '').trim();
        const description = (formData.get('description') as string || '').trim();
        const categoryId = formData.get('category_id') as string || null;
        const priority = (formData.get('priority') as string || 'medium');
        const recurrenceRule = formData.get('recurrence_rule') as string || null;
        const stepsJson = formData.get('steps') as string || '[]';

        if (!title) return fail(400, { error: 'O título é obrigatório.' });

        let steps: { id: number; title: string; description: string }[] = [];
        try {
            steps = JSON.parse(stepsJson);
        } catch {
            return fail(400, { error: 'Formato de etapas inválido.' });
        }

        if (steps.length === 0) return fail(400, { error: 'Adicione pelo menos uma etapa.' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verifica que a task existe
            const taskCheck = await client.query(
                `SELECT id FROM tasks WHERE id = $1 AND task_type = 'assigned'`,
                [taskId]
            );
            if (taskCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return fail(404, { error: 'Tarefa não encontrada.' });
            }

            // Atualiza a task
            await client.query(`
                UPDATE tasks SET
                    title = $1,
                    description = $2,
                    category_id = $3,
                    priority = $4,
                    is_recurring = $5,
                    recurrence_rule = $6,
                    updated_at = NOW()
                WHERE id = $7
            `, [
                title,
                description || null,
                categoryId ? Number(categoryId) : null,
                priority,
                !!recurrenceRule,
                recurrenceRule || null,
                taskId
            ]);

            // IDs dos steps existentes no DB (ids pequenos = reais; ids grandes = Date.now() = novos)
            const REAL_ID_THRESHOLD = 1_000_000_000;
            const existingIds = steps.filter(s => s.id < REAL_ID_THRESHOLD).map(s => s.id);

            // Deleta steps removidos
            if (existingIds.length > 0) {
                await client.query(
                    `DELETE FROM task_steps WHERE task_id = $1 AND id != ALL($2)`,
                    [taskId, existingIds]
                );
            } else {
                await client.query(`DELETE FROM task_steps WHERE task_id = $1`, [taskId]);
            }

            // Upsert cada step com a nova order
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                if (!step.title?.trim()) continue;
                if (step.id < REAL_ID_THRESHOLD) {
                    // Atualiza existente
                    await client.query(`
                        UPDATE task_steps SET title = $1, description = $2, step_order = $3
                        WHERE id = $4 AND task_id = $5
                    `, [step.title.trim(), step.description?.trim() || null, i + 1, step.id, taskId]);
                } else {
                    // Insere novo
                    await client.query(`
                        INSERT INTO task_steps (task_id, title, description, step_order)
                        VALUES ($1, $2, $3, $4)
                    `, [taskId, step.title.trim(), step.description?.trim() || null, i + 1]);
                }
            }

            await client.query('COMMIT');
            return { success: true };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Erro ao atualizar tarefa:', e);
            return fail(500, { error: 'Erro ao salvar alterações. Tente novamente.' });
        } finally {
            client.release();
        }
    }
};
