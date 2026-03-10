import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const tab = url.searchParams.get('tab') || 'personal';
    const filter = url.searchParams.get('filter') || (tab === 'personal' ? 'active' : 'pending');
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

    try {
        // Categorias para o dialog de criação
        const categoriesRes = await pool.query(`SELECT id, name FROM task_categories ORDER BY name`);

        // Stats: sempre buscar para os 4 cards
        const statsRes = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM tasks WHERE task_type = 'personal' AND created_by = $1 AND status IN ('pending', 'in_progress')) as personal_active,
                (SELECT COUNT(*) FROM tasks WHERE task_type = 'personal' AND created_by = $1 AND status = 'completed') as personal_completed,
                (SELECT COUNT(*) FROM task_assignments WHERE user_id = $1 AND status IN ('pending', 'in_progress')) as assigned_pending,
                (SELECT COUNT(*) FROM task_assignments WHERE user_id = $1 AND status = 'completed') as assigned_completed
        `, [user.user_id]);

        const stats = {
            personalActive: Number(statsRes.rows[0].personal_active),
            personalCompleted: Number(statsRes.rows[0].personal_completed),
            assignedPending: Number(statsRes.rows[0].assigned_pending),
            assignedCompleted: Number(statsRes.rows[0].assigned_completed)
        };

        if (tab === 'personal') {
            const statusCondition = filter === 'completed'
                ? "AND t.status = 'completed'"
                : "AND t.status IN ('pending', 'in_progress')";

            const tasksRes = await pool.query(`
                SELECT
                    t.id,
                    t.title,
                    t.description,
                    t.status,
                    t.priority,
                    t.due_date,
                    t.completed_at,
                    t.created_at,
                    COALESCE(tc.name, '') as category_name,
                    (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id) as total_steps,
                    (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id AND is_completed = TRUE) as completed_steps
                FROM tasks t
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                WHERE t.task_type = 'personal'
                  AND t.created_by = $1
                  ${statusCondition}
                ORDER BY
                    CASE t.priority
                        WHEN 'urgent' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END,
                    t.created_at DESC
            `, [user.user_id]);

            return {
                tab,
                filter,
                stats,
                categories: categoriesRes.rows,
                personalTasks: tasksRes.rows,
                assignedTasks: [],
                pagination: { page: 1, limit: 12, totalItems: 0, totalPages: 1 }
            };
        }

        // Tab: assigned
        const limit = 12;
        const offset = (page - 1) * limit;

        const statusCondition = filter === 'completed'
            ? "AND ta.status = 'completed'"
            : "AND ta.status IN ('pending', 'in_progress')";

        const [tasksRes, countRes] = await Promise.all([
            pool.query(`
                SELECT
                    ta.id as assignment_id,
                    ta.status,
                    ta.priority,
                    ta.due_date,
                    ta.assigned_at,
                    ta.completed_at,
                    t.id as task_id,
                    t.title,
                    t.description,
                    COALESCE(tc.name, '') as category_name,
                    COALESCE(u.first_name || ' ' || u.last_name, '—') as assigned_by_name,
                    (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id) as total_steps,
                    (
                        SELECT COUNT(*) FROM task_step_progress tsp
                        WHERE tsp.assignment_id = ta.id AND tsp.is_completed = TRUE
                    ) as completed_steps
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                LEFT JOIN users u ON ta.assigned_by = u.user_id
                WHERE ta.user_id = $1
                  ${statusCondition}
                ORDER BY
                    CASE ta.priority
                        WHEN 'urgent' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END,
                    ta.assigned_at DESC
                LIMIT $2 OFFSET $3
            `, [user.user_id, limit, offset]),
            pool.query(`
                SELECT COUNT(*) as total
                FROM task_assignments ta
                WHERE ta.user_id = $1
                  ${statusCondition}
            `, [user.user_id])
        ]);

        const totalItems = Number(countRes.rows[0].total);

        return {
            tab,
            filter,
            stats,
            categories: categoriesRes.rows,
            personalTasks: [],
            assignedTasks: tasksRes.rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit) || 1
            }
        };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar tasks:', e);
        return {
            tab,
            filter,
            stats: { personalActive: 0, personalCompleted: 0, assignedPending: 0, assignedCompleted: 0 },
            categories: [],
            personalTasks: [],
            assignedTasks: [],
            pagination: { page: 1, limit: 12, totalItems: 0, totalPages: 1 }
        };
    }
};

export const actions: Actions = {
    createPersonal: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const title = String(formData.get('title') || '').trim();
        const description = String(formData.get('description') || '').trim();
        const priority = String(formData.get('priority') || 'medium');
        const dueDate = formData.get('due_date') ? String(formData.get('due_date')) : null;
        const categoryId = formData.get('category_id') ? Number(formData.get('category_id')) : null;
        const stepsJson = formData.get('steps');

        if (!title) return { success: false, error: 'Título é obrigatório.' };

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const taskRes = await client.query(`
                INSERT INTO tasks (title, description, task_type, created_by, status, priority, due_date, category_id)
                VALUES ($1, $2, 'personal', $3, 'pending', $4, $5, $6)
                RETURNING id
            `, [title, description || null, user.user_id, priority, dueDate, categoryId]);

            const taskId = taskRes.rows[0].id;

            if (stepsJson) {
                const steps = JSON.parse(String(stepsJson)) as Array<{ title: string; step_order: number }>;
                for (const step of steps) {
                    await client.query(`
                        INSERT INTO task_steps (task_id, title, step_order)
                        VALUES ($1, $2, $3)
                    `, [taskId, step.title, step.step_order]);
                }
            }

            await client.query('COMMIT');
            return { success: true };
        } catch (e: any) {
            await client.query('ROLLBACK');
            if (e.status || e.location) throw e;
            console.error('Erro ao criar task:', e);
            return { success: false, error: 'Erro ao criar tarefa.' };
        } finally {
            client.release();
        }
    }
};
