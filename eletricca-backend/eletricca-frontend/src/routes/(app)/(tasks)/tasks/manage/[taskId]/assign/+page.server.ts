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

        // $1 = taskId, $2 = searchParam (if present)
        const userSearchCondition = searchParam
            ? `AND (LOWER(u.first_name || ' ' || u.last_name) LIKE $2 OR LOWER(u.email) LIKE $2)`
            : '';
        const usersParams = searchParam ? [taskId, searchParam] : [taskId];

        const [taskRes, assignmentsRes, usersRes, countRes] = await Promise.all([
            pool.query(`
                SELECT t.id, t.title,
                    (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id) as step_count
                FROM tasks t
                WHERE t.id = $1
                  AND t.task_type = 'assigned'
                  AND t.deleted_at IS NULL
            `, [taskId]),

            // Active assignments with user info
            pool.query(`
                SELECT
                    ta.id,
                    ta.user_id,
                    ta.status,
                    ta.priority,
                    ta.due_date,
                    ta.available_from,
                    ta.assigned_at,
                    ta.completed_at,
                    u.first_name,
                    u.last_name,
                    u.email,
                    COALESCE(r.name, u.user_role::text, '—') as role_name
                FROM task_assignments ta
                JOIN users u ON ta.user_id = u.user_id
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE ta.task_id = $1
                  AND ta.deleted_at IS NULL
                ORDER BY ta.assigned_at DESC
            `, [taskId]),

            // Users NOT currently actively assigned (for adding)
            pool.query(`
                SELECT
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    COALESCE(r.name, u.user_role::text, '—') as role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE NOT EXISTS (
                    SELECT 1 FROM task_assignments ta
                    WHERE ta.task_id = $1
                      AND ta.user_id = u.user_id
                      AND ta.deleted_at IS NULL
                )
                ${userSearchCondition}
                ORDER BY u.first_name, u.last_name
                LIMIT ${limit} OFFSET ${offset}
            `, usersParams),

            // Count of unassigned users (for pagination)
            pool.query(`
                SELECT COUNT(*) as total FROM users u
                WHERE NOT EXISTS (
                    SELECT 1 FROM task_assignments ta
                    WHERE ta.task_id = $1
                      AND ta.user_id = u.user_id
                      AND ta.deleted_at IS NULL
                )
                ${userSearchCondition}
            `, usersParams)
        ]);

        if (taskRes.rows.length === 0) throw redirect(302, '/tasks/manage');

        const task = {
            id: taskRes.rows[0].id,
            title: taskRes.rows[0].title,
            step_count: Number(taskRes.rows[0].step_count)
        };

        const assignments = assignmentsRes.rows.map((a: any) => ({
            ...a,
            due_date: a.due_date ? a.due_date.toISOString() : null,
            available_from: a.available_from ? a.available_from.toISOString() : null,
            assigned_at: a.assigned_at ? a.assigned_at.toISOString() : null,
            completed_at: a.completed_at ? a.completed_at.toISOString() : null
        }));

        const totalItems = Number(countRes.rows[0].total);

        return {
            task,
            assignments,
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
    // Add new assignments — additive only, never touches existing ones
    addAssignments: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const taskId = Number(params.taskId);
        const formData = await request.formData();
        const newAssignmentsJson = formData.get('newAssignments') as string || '[]';

        let newAssignments: Array<{ userId: number; priority: string; dueDate: string; availableFrom: string }> = [];
        try {
            newAssignments = JSON.parse(newAssignmentsJson);
        } catch {
            return fail(400, { error: 'Formato de atribuições inválido.' });
        }

        if (newAssignments.length === 0) return fail(400, { error: 'Selecione ao menos um usuário.' });

        const taskCheck = await pool.query(
            `SELECT id FROM tasks WHERE id = $1 AND task_type = 'assigned' AND deleted_at IS NULL`,
            [taskId]
        );
        if (taskCheck.rows.length === 0) return fail(404, { error: 'Tarefa não encontrada.' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const a of newAssignments) {
                // Check if a soft-deleted record exists (to re-activate instead of inserting)
                const existing = await client.query(
                    `SELECT id, deleted_at FROM task_assignments WHERE task_id = $1 AND user_id = $2`,
                    [taskId, a.userId]
                );

                if (existing.rows.length > 0 && existing.rows[0].deleted_at !== null) {
                    // Re-activate: clear old step progress and reset assignment
                    await client.query(
                        `DELETE FROM task_step_progress WHERE assignment_id = $1`,
                        [existing.rows[0].id]
                    );
                    await client.query(`
                        UPDATE task_assignments
                        SET deleted_at = NULL,
                            priority = $1,
                            due_date = $2,
                            available_from = $3,
                            assigned_by = $4,
                            assigned_at = NOW(),
                            status = 'pending',
                            completed_at = NULL
                        WHERE id = $5
                    `, [a.priority || 'medium', a.dueDate || null, a.availableFrom || null, user.user_id, existing.rows[0].id]);
                } else if (existing.rows.length === 0) {
                    await client.query(`
                        INSERT INTO task_assignments (task_id, user_id, assigned_by, priority, due_date, available_from)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [taskId, a.userId, user.user_id, a.priority || 'medium', a.dueDate || null, a.availableFrom || null]);
                }
                // If already active, skip (UI should prevent this)
            }

            await client.query('COMMIT');
            return { success: true, action: 'add', count: newAssignments.length };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Erro ao adicionar atribuições:', e);
            return fail(500, { error: 'Erro ao adicionar atribuições.' });
        } finally {
            client.release();
        }
    },

    // Update priority/due_date for existing active assignments
    updateAssignments: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const taskId = Number(params.taskId);
        const formData = await request.formData();
        const updatesJson = formData.get('updates') as string || '[]';

        let updates: Array<{ id: number; priority: string; dueDate: string; availableFrom: string }> = [];
        try {
            updates = JSON.parse(updatesJson);
        } catch {
            return fail(400, { error: 'Formato inválido.' });
        }

        if (updates.length === 0) return { success: true, action: 'update', count: 0 };

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const u of updates) {
                await client.query(`
                    UPDATE task_assignments
                    SET priority = $1, due_date = $2, available_from = $3
                    WHERE id = $4
                      AND task_id = $5
                      AND deleted_at IS NULL
                `, [u.priority || 'medium', u.dueDate || null, u.availableFrom || null, u.id, taskId]);
            }
            await client.query('COMMIT');
            return { success: true, action: 'update', count: updates.length };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Erro ao atualizar atribuições:', e);
            return fail(500, { error: 'Erro ao salvar alterações.' });
        } finally {
            client.release();
        }
    },

    // Reset a completed assignment so the user can do it again
    resetAssignment: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const taskId = Number(params.taskId);
        const formData = await request.formData();
        const assignmentId = Number(formData.get('assignmentId'));

        if (!assignmentId) return fail(400, { error: 'ID da atribuição inválido.' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verify it belongs to this task and is currently completed
            const check = await client.query(
                `SELECT id, assigned_at, completed_at FROM task_assignments
                 WHERE id = $1 AND task_id = $2 AND deleted_at IS NULL AND status = 'completed'`,
                [assignmentId, taskId]
            );
            if (check.rows.length === 0) return fail(404, { error: 'Atribuição não encontrada ou não está concluída.' });

            const current = check.rows[0];

            // Determine next cycle number
            const cycleRes = await client.query(
                `SELECT COALESCE(MAX(cycle), 0) + 1 as next_cycle FROM task_assignment_history WHERE assignment_id = $1`,
                [assignmentId]
            );
            const nextCycle = cycleRes.rows[0].next_cycle;

            // Build JSONB snapshot of completed steps
            const snapshotRes = await client.query(
                `SELECT ts.id as step_id, ts.title, ts.step_order, tsp.completed_at
                 FROM task_step_progress tsp
                 JOIN task_steps ts ON ts.id = tsp.step_id
                 WHERE tsp.assignment_id = $1
                 ORDER BY ts.step_order`,
                [assignmentId]
            );
            const stepsSnapshot = JSON.stringify(snapshotRes.rows.map((r: any) => ({
                step_id: r.step_id,
                title: r.title,
                step_order: r.step_order,
                completed_at: r.completed_at ? r.completed_at.toISOString() : null
            })));

            // Save history record
            await client.query(
                `INSERT INTO task_assignment_history (assignment_id, cycle, assigned_at, completed_at, reset_by, steps_snapshot)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [assignmentId, nextCycle, current.assigned_at, current.completed_at, user.user_id, stepsSnapshot]
            );

            // Clear all step progress
            await client.query(
                `DELETE FROM task_step_progress WHERE assignment_id = $1`,
                [assignmentId]
            );

            // Reset assignment to pending
            await client.query(
                `UPDATE task_assignments
                 SET status = 'pending', completed_at = NULL, assigned_at = NOW(), assigned_by = $1
                 WHERE id = $2`,
                [user.user_id, assignmentId]
            );

            await client.query('COMMIT');
            return { success: true, action: 'reset' };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Erro ao resetar atribuição:', e);
            return fail(500, { error: 'Erro ao reatribuir tarefa.' });
        } finally {
            client.release();
        }
    },

    // Soft delete — preserves history and step progress
    removeAssignment: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const taskId = Number(params.taskId);
        const formData = await request.formData();
        const assignmentId = Number(formData.get('assignmentId'));

        if (!assignmentId) return fail(400, { error: 'ID da atribuição inválido.' });

        try {
            const res = await pool.query(
                `UPDATE task_assignments SET deleted_at = NOW()
                 WHERE id = $1 AND task_id = $2 AND deleted_at IS NULL
                 RETURNING id`,
                [assignmentId, taskId]
            );
            if (res.rows.length === 0) return fail(404, { error: 'Atribuição não encontrada.' });
            return { success: true, action: 'remove' };
        } catch (e) {
            console.error('Erro ao remover atribuição:', e);
            return fail(500, { error: 'Erro ao remover atribuição.' });
        }
    }
};
