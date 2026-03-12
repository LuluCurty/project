import { redirect, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const search = (url.searchParams.get('search') || '').trim();
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const searchCondition = search
            ? `AND (LOWER(t.title) LIKE $1 OR LOWER(t.description) LIKE $1)`
            : '';
        const searchParam = search ? `%${search.toLowerCase()}%` : null;

        const queryParams = searchParam ? [searchParam] : [];

        const [statsRes, tasksRes, countRes, deletedTasksRes] = await Promise.all([
            pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM tasks WHERE task_type = 'assigned' AND deleted_at IS NULL) as total,
                    (SELECT COUNT(*) FROM tasks WHERE task_type = 'assigned' AND deleted_at IS NULL AND status IN ('pending', 'in_progress')) as active,
                    (SELECT COUNT(*) FROM tasks WHERE task_type = 'assigned' AND deleted_at IS NULL AND status = 'completed') as completed,
                    (SELECT COUNT(*) FROM task_assignments ta JOIN tasks t ON ta.task_id = t.id WHERE t.deleted_at IS NULL) as total_assignments
            `),
            pool.query(`
                SELECT
                    t.id,
                    t.title,
                    t.description,
                    t.task_type,
                    t.priority,
                    COALESCE(tc.name, '') as category_name,
                    COALESCE(u.first_name || ' ' || u.last_name, '—') as created_by_name,
                    (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id) as step_count,
                    (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id) as assignment_count,
                    t.created_at,
                    t.updated_at
                FROM tasks t
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                LEFT JOIN users u ON t.created_by = u.user_id
                WHERE t.task_type = 'assigned'
                  AND t.deleted_at IS NULL
                  ${searchCondition}
                ORDER BY t.updated_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `, queryParams),
            pool.query(`
                SELECT COUNT(*) as total
                FROM tasks t
                WHERE t.task_type = 'assigned'
                  AND t.deleted_at IS NULL
                  ${searchCondition}
            `, queryParams),

            // Archived (soft-deleted) tasks — separate query, no search/pagination
            pool.query(`
                SELECT
                    t.id,
                    t.title,
                    t.priority,
                    COALESCE(tc.name, '') as category_name,
                    COALESCE(u.first_name || ' ' || u.last_name, '—') as created_by_name,
                    t.deleted_at,
                    (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id) as assignment_count
                FROM tasks t
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                LEFT JOIN users u ON t.created_by = u.user_id
                WHERE t.task_type = 'assigned'
                  AND t.deleted_at IS NOT NULL
                ORDER BY t.deleted_at DESC
            `)
        ]);

        const stats = {
            total: Number(statsRes.rows[0].total),
            active: Number(statsRes.rows[0].active),
            completed: Number(statsRes.rows[0].completed),
            totalAssignments: Number(statsRes.rows[0].total_assignments)
        };

        const tasks = tasksRes.rows.map((row: any) => ({
            ...row,
            step_count: Number(row.step_count),
            assignment_count: Number(row.assignment_count),
            created_at: row.created_at ? row.created_at.toISOString() : null,
            updated_at: row.updated_at ? row.updated_at.toISOString() : null
        }));

        const totalItems = Number(countRes.rows[0].total);

        const deletedTasks = deletedTasksRes.rows.map((row: any) => ({ //this one will have separeted permissions
            ...row,
            assignment_count: Number(row.assignment_count),
            deleted_at: row.deleted_at ? row.deleted_at.toISOString() : null
        }));

        return {
            tasks,
            stats,
            deletedTasks,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit) || 1
            }
        };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar manage tasks:', e);
        return {
            tasks: [],
            stats: { total: 0, active: 0, completed: 0, totalAssignments: 0 },
            deletedTasks: [],
            pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 }
        };
    }
};

export const actions: Actions = {
    deleteTask: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const taskId = Number(formData.get('taskId'));

        if (!taskId) return fail(400, { error: 'ID da tarefa é obrigatório.' });

        try {
            const res = await pool.query(
                `UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND task_type = 'assigned' AND deleted_at IS NULL RETURNING id`,
                [taskId]
            );

            if (res.rows.length === 0) {
                return fail(404, { error: 'Tarefa não encontrada.' });
            }

            return { success: true };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao excluir task:', e);
            return fail(500, { error: 'Erro ao excluir tarefa.' });
        }
    },

    // Restore a soft-deleted task back to active
    restoreTask: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const taskId = Number(formData.get('taskId'));

        if (!taskId) return fail(400, { error: 'ID inválido.' });

        try {
            const res = await pool.query(
                `UPDATE tasks SET deleted_at = NULL WHERE id = $1 AND task_type = 'assigned' AND deleted_at IS NOT NULL RETURNING id`,
                [taskId]
            );
            if (res.rows.length === 0) return fail(404, { error: 'Tarefa não encontrada no arquivo.' });
            return { success: true, action: 'restore' };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao restaurar task:', e);
            return fail(500, { error: 'Erro ao restaurar tarefa.' });
        }
    },

    // Permanent (hard) delete — only works on already soft-deleted tasks
    hardDeleteTask: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const taskId = Number(formData.get('taskId'));

        if (!taskId) return fail(400, { error: 'ID inválido.' });

        try {
            // Cascades: task_steps, task_assignments, task_step_progress, task_comments
            const res = await pool.query(
                `DELETE FROM tasks WHERE id = $1 AND task_type = 'assigned' AND deleted_at IS NOT NULL RETURNING id`,
                [taskId]
            );
            if (res.rows.length === 0) return fail(404, { error: 'Tarefa não encontrada no arquivo.' });
            return { success: true, action: 'hardDelete' };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao excluir permanentemente:', e);
            return fail(500, { error: 'Erro ao excluir tarefa permanentemente.' });
        }
    }
};
