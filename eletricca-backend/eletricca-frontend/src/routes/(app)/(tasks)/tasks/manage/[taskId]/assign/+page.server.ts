import { redirect, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const taskId = Number(params.taskId);
    if (!taskId) throw redirect(302, '/tasks/manage');

    const search = (url.searchParams.get('search') || '').trim();
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const searchParam = search ? `%${search.toLowerCase()}%` : null;

        // usersRes: $1 = taskId (no EXISTS), $2 = searchParam (opcional)
        const userSearchCondition = searchParam
            ? `AND (LOWER(u.first_name || ' ' || u.last_name) LIKE $2 OR LOWER(u.email) LIKE $2)`
            : '';
        const usersParams = searchParam ? [taskId, searchParam] : [taskId];

        // countRes: não usa taskId, $1 = searchParam (opcional)
        const countSearchCondition = searchParam
            ? `AND (LOWER(u.first_name || ' ' || u.last_name) LIKE $1 OR LOWER(u.email) LIKE $1)`
            : '';
        const countParams = searchParam ? [searchParam] : [];

        const [taskRes, assignedRes, usersRes, countRes] = await Promise.all([
            // Busca task com ownership check
            pool.query(`
                SELECT t.id, t.title,
                    (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id) as step_count
                FROM tasks t
                WHERE t.id = $1
                  AND t.task_type = 'assigned'
                  AND t.created_by = $2
            `, [taskId, user.user_id]),

            // Todos os user_ids já atribuídos (sem paginação, para manter seleção entre páginas)
            pool.query(`
                SELECT user_id FROM task_assignments WHERE task_id = $1
            `, [taskId]),

            // Usuários paginados com flag is_assigned
            pool.query(`
                SELECT
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    COALESCE(r.name, u.user_role::text, '—') as role_name,
                    EXISTS(
                        SELECT 1 FROM task_assignments
                        WHERE task_id = $1 AND user_id = u.user_id
                    ) as is_assigned
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE 1=1 ${userSearchCondition}
                ORDER BY u.first_name, u.last_name
                LIMIT ${limit} OFFSET ${offset}
            `, usersParams),

            // Contagem total
            pool.query(`
                SELECT COUNT(*) as total FROM users u
                WHERE 1=1 ${countSearchCondition}
            `, countParams)
        ]);

        if (taskRes.rows.length === 0) throw redirect(302, '/tasks/manage');

        const task = {
            id: taskRes.rows[0].id,
            title: taskRes.rows[0].title,
            step_count: Number(taskRes.rows[0].step_count)
        };

        const assignedUserIds: number[] = assignedRes.rows.map((r: any) => r.user_id);
        const totalItems = Number(countRes.rows[0].total);

        return {
            task,
            assignedUserIds,
            users: usersRes.rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit) || 1
            }
        };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar atribuições:', e);
        throw redirect(302, '/tasks/manage');
    }
};

export const actions: Actions = {
    saveAssignments: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const taskId = Number(params.taskId);
        const formData = await request.formData();
        const userIdsJson = formData.get('userIds') as string || '[]';
        const priority = (formData.get('priority') as string) || 'medium';
        const dueDate = (formData.get('due_date') as string) || null;

        let newUserIds: number[] = [];
        try {
            newUserIds = JSON.parse(userIdsJson);
        } catch {
            return fail(400, { error: 'Formato de usuários inválido.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verifica ownership
            const ownerRes = await client.query(
                `SELECT id FROM tasks WHERE id = $1 AND task_type = 'assigned' AND created_by = $2`,
                [taskId, user.user_id]
            );
            if (ownerRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return fail(403, { error: 'Tarefa não encontrada.' });
            }

            if (newUserIds.length === 0) {
                // Remove todas as atribuições
                await client.query(
                    `DELETE FROM task_assignments WHERE task_id = $1`,
                    [taskId]
                );
            } else {
                // Remove atribuições de usuários que saíram da seleção
                await client.query(
                    `DELETE FROM task_assignments WHERE task_id = $1 AND user_id != ALL($2)`,
                    [taskId, newUserIds]
                );

                // Upsert para cada usuário selecionado
                for (const userId of newUserIds) {
                    await client.query(`
                        INSERT INTO task_assignments (task_id, user_id, assigned_by, priority, due_date)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (task_id, user_id) DO UPDATE
                            SET priority = EXCLUDED.priority,
                                due_date = EXCLUDED.due_date
                    `, [taskId, userId, user.user_id, priority, dueDate || null]);
                }
            }

            await client.query('COMMIT');
            return { success: true, count: newUserIds.length };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Erro ao salvar atribuições:', e);
            return fail(500, { error: 'Erro ao salvar atribuições. Tente novamente.' });
        } finally {
            client.release();
        }
    }
};
