import { redirect, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const categoriesRes = await pool.query(
        `SELECT id, name FROM task_categories ORDER BY name`
    );

    return { categories: categoriesRes.rows };
};

export const actions: Actions = {
    createTask: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const title = (formData.get('title') as string || '').trim();
        const description = (formData.get('description') as string || '').trim();
        const categoryId = formData.get('category_id') as string || null;
        const recurrenceRule = formData.get('recurrence_rule') as string || null;
        const stepsJson = formData.get('steps') as string || '[]';

        if (!title) {
            return fail(400, { error: 'O título é obrigatório.' });
        }

        let steps: { title: string; description: string; step_type: string; allowed_file_types: string[] }[] = [];
        try {
            steps = JSON.parse(stepsJson);
        } catch {
            return fail(400, { error: 'Formato de etapas inválido.' });
        }

        if (steps.length === 0) {
            return fail(400, { error: 'Adicione pelo menos uma etapa à tarefa.' });
        }

        const fileUploadStepWithNoTypes = steps.find(
            s => s.step_type === 'file_upload' && (!s.allowed_file_types || s.allowed_file_types.length === 0)
        );
        if (fileUploadStepWithNoTypes) {
            return fail(400, { error: `A etapa "${fileUploadStepWithNoTypes.title}" requer pelo menos um tipo de arquivo selecionado.` });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const taskRes = await client.query(
                `INSERT INTO tasks (title, description, task_type, category_id, created_by, is_recurring, recurrence_rule)
                 VALUES ($1, $2, 'assigned', $3, $4, $5, $6)
                 RETURNING id`,
                [
                    title,
                    description || null,
                    categoryId ? Number(categoryId) : null,
                    user.user_id,
                    !!recurrenceRule,
                    recurrenceRule || null
                ]
            );

            const taskId = taskRes.rows[0].id;

            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                if (!step.title?.trim()) continue;
                await client.query(
                    `INSERT INTO task_steps (task_id, title, description, step_order, step_type, allowed_file_types)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        taskId,
                        step.title.trim(),
                        step.description?.trim() || null,
                        i + 1,
                        step.step_type || 'check',
                        step.step_type === 'file_upload' ? step.allowed_file_types : null
                    ]
                );
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Erro ao criar tarefa:', e);
            return fail(500, { error: 'Erro ao criar tarefa. Tente novamente.' });
        } finally {
            client.release();
        }

        throw redirect(302, '/tasks/manage');
    }
};
