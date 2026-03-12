import { redirect, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const search = (url.searchParams.get('search') || '').trim();
    const statusFilter = url.searchParams.get('status') || 'all';
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const searchParam = search ? `%${search.toLowerCase()}%` : null;

        // $1 = searchParam (opcional)
        const searchCondition = searchParam
            ? `AND (LOWER(t.title) LIKE $1 OR LOWER(u.first_name || ' ' || u.last_name) LIKE $1 OR LOWER(u.email) LIKE $1)`
            : '';

        // Condição de status não usa parâmetros — são valores fixos seguros
        const statusCondition =
            statusFilter === 'pending'   ? `AND ta.status != 'completed'` :
            statusFilter === 'completed' ? `AND ta.status = 'completed'` :
            statusFilter === 'overdue'   ? `AND ta.due_date < NOW() AND ta.status != 'completed'` :
            '';

        const queryParams = searchParam ? [searchParam] : [];

        const [statsRes, assignmentsRes, countRes, deletedAssignmentsRes] = await Promise.all([
            // Stats gerais — sem filtro de busca/status, sempre mostra o total real
            pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE ta.status != 'completed') as pending,
                    COUNT(*) FILTER (WHERE ta.status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE ta.due_date < NOW() AND ta.status != 'completed') as overdue
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                WHERE t.task_type = 'assigned'
                  AND ta.deleted_at IS NULL
            `),

            // Atribuições paginadas com busca e filtro
            pool.query(`
                SELECT
                    ta.id,
                    ta.task_id,
                    t.title as task_title,
                    t.is_recurring,
                    t.recurrence_rule,
                    u.first_name || ' ' || u.last_name as user_name,
                    u.email as user_email,
                    ta.status,
                    ta.priority,
                    ta.due_date,
                    ta.assigned_at,
                    ta.completed_at,
                    COALESCE(ab.first_name || ' ' || ab.last_name, '—') as assigned_by_name,
                    (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id) as total_steps,
                    (SELECT COUNT(*) FROM task_step_progress WHERE assignment_id = ta.id AND is_completed = TRUE) as completed_steps,
                    (SELECT COUNT(*) FROM task_assignment_history WHERE assignment_id = ta.id) as history_count
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                JOIN users u ON ta.user_id = u.user_id
                LEFT JOIN users ab ON ta.assigned_by = ab.user_id
                WHERE t.task_type = 'assigned'
                  AND ta.deleted_at IS NULL
                ${searchCondition}
                ${statusCondition}
                ORDER BY ta.assigned_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `, queryParams),

            // Contagem para paginação (mesmos filtros da query principal)
            pool.query(`
                SELECT COUNT(*) as total
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                JOIN users u ON ta.user_id = u.user_id
                WHERE t.task_type = 'assigned'
                  AND ta.deleted_at IS NULL
                ${searchCondition}
                ${statusCondition}
            `, queryParams),

            // Atribuições arquivadas (soft-deleted) — sem search/paginação, separado do resto
            pool.query(`
                SELECT
                    ta.id,
                    ta.task_id,
                    t.title as task_title,
                    u.first_name || ' ' || u.last_name as user_name,
                    u.email as user_email,
                    ta.status,
                    ta.priority,
                    ta.due_date,
                    ta.assigned_at,
                    ta.completed_at,
                    ta.deleted_at,
                    COALESCE(ab.first_name || ' ' || ab.last_name, '—') as assigned_by_name,
                    (SELECT COUNT(*) FROM task_step_progress WHERE assignment_id = ta.id AND is_completed = TRUE) as completed_steps,
                    (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id) as total_steps
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                JOIN users u ON ta.user_id = u.user_id
                LEFT JOIN users ab ON ta.assigned_by = ab.user_id
                WHERE t.task_type = 'assigned'
                  AND ta.deleted_at IS NOT NULL
                ORDER BY ta.deleted_at DESC
            `)
        ]);

        const stats = {
            total: Number(statsRes.rows[0].total),
            pending: Number(statsRes.rows[0].pending),
            completed: Number(statsRes.rows[0].completed),
            overdue: Number(statsRes.rows[0].overdue)
        };

        const assignments = assignmentsRes.rows.map((row: any) => ({
            ...row,
            total_steps: Number(row.total_steps),
            completed_steps: Number(row.completed_steps),
            history_count: Number(row.history_count),
            is_recurring: Boolean(row.is_recurring),
            due_date: row.due_date ? row.due_date.toISOString() : null,
            assigned_at: row.assigned_at ? row.assigned_at.toISOString() : null,
            completed_at: row.completed_at ? row.completed_at.toISOString() : null
        }));

        const deletedAssignments = deletedAssignmentsRes.rows.map((row: any) => ({ // will have separated permissions
            ...row,
            total_steps: Number(row.total_steps),
            completed_steps: Number(row.completed_steps),
            due_date: row.due_date ? row.due_date.toISOString() : null,
            assigned_at: row.assigned_at ? row.assigned_at.toISOString() : null,
            completed_at: row.completed_at ? row.completed_at.toISOString() : null,
            deleted_at: row.deleted_at ? row.deleted_at.toISOString() : null
        }));

        return {
            assignments,
            deletedAssignments,
            stats,
            statusFilter,
            pagination: {
                page,
                limit,
                totalItems: Number(countRes.rows[0].total),
                totalPages: Math.ceil(Number(countRes.rows[0].total) / limit) || 1
            }
        };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar atribuições:', e);
        return {
            assignments: [],
            deletedAssignments: [],
            stats: { total: 0, pending: 0, completed: 0, overdue: 0 },
            statusFilter,
            pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 }
        };
    }
};

export const actions: Actions = {
    deleteAssignment: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const assignmentId = Number(formData.get('assignmentId'));

        if (!assignmentId) return fail(400, { error: 'ID inválido.' });

        try {
            // Soft delete — preserves history
            const res = await pool.query(
                `UPDATE task_assignments SET deleted_at = NOW()
                 WHERE id = $1 AND deleted_at IS NULL
                 RETURNING id`,
                [assignmentId]
            );

            if (res.rows.length === 0) {
                return fail(404, { error: 'Atribuição não encontrada.' });
            }

            return { success: true };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao remover atribuição:', e);
            return fail(500, { error: 'Erro ao remover atribuição.' });
        }
    },

    // Restore a soft-deleted assignment back to active
    restoreAssignment: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const assignmentId = Number(formData.get('assignmentId'));

        if (!assignmentId) return fail(400, { error: 'ID inválido.' });

        try {
            const res = await pool.query(
                `UPDATE task_assignments SET deleted_at = NULL
                 WHERE id = $1 AND deleted_at IS NOT NULL
                 RETURNING id`,
                [assignmentId]
            );
            if (res.rows.length === 0) return fail(404, { error: 'Atribuição não encontrada no arquivo.' });
            return { success: true, action: 'restore' };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao restaurar atribuição:', e);
            return fail(500, { error: 'Erro ao restaurar atribuição.' });
        }
    },

    // Permanent (hard) delete — only works on already soft-deleted assignments
    hardDeleteAssignment: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const assignmentId = Number(formData.get('assignmentId'));

        if (!assignmentId) return fail(400, { error: 'ID inválido.' });

        try {
            // Cascades: task_step_progress via FK ON DELETE CASCADE
            const res = await pool.query(
                `DELETE FROM task_assignments WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id`,
                [assignmentId]
            );
            if (res.rows.length === 0) return fail(404, { error: 'Atribuição não encontrada no arquivo.' });
            return { success: true, action: 'hardDelete' };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao excluir atribuição permanentemente:', e);
            return fail(500, { error: 'Erro ao excluir atribuição permanentemente.' });
        }
    },

    // Reset a completed recurring assignment for a new cycle
    resetAssignment: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const assignmentId = Number(formData.get('assignmentId'));

        if (!assignmentId) return fail(400, { error: 'ID inválido.' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get current assignment with task recurrence info
            const assignRes = await client.query(`
                SELECT ta.id, ta.assigned_at, ta.completed_at, ta.due_date, ta.available_from,
                       t.is_recurring, t.recurrence_rule
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                WHERE ta.id = $1 AND ta.status = 'completed' AND ta.deleted_at IS NULL
            `, [assignmentId]);

            if (assignRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return fail(404, { error: 'Atribuição não encontrada ou não está concluída.' });
            }

            const a = assignRes.rows[0];
            if (!a.is_recurring) {
                await client.query('ROLLBACK');
                return fail(400, { error: 'Esta tarefa não é recorrente.' });
            }

            // 2. Determine next cycle number
            const cycleRes = await client.query(
                `SELECT COALESCE(MAX(cycle), 0) + 1 as next_cycle FROM task_assignment_history WHERE assignment_id = $1`,
                [assignmentId]
            );
            const cycle = Number(cycleRes.rows[0].next_cycle);

            // 3. Build steps snapshot from current progress
            const stepsRes = await client.query(`
                SELECT ts.id as step_id, ts.title, ts.step_order, tsp.completed_at
                FROM task_step_progress tsp
                JOIN task_steps ts ON tsp.step_id = ts.id
                WHERE tsp.assignment_id = $1
                ORDER BY ts.step_order
            `, [assignmentId]);

            const stepsSnapshot = stepsRes.rows.map((s: any) => ({
                step_id: s.step_id,
                title: s.title,
                step_order: s.step_order,
                completed_at: s.completed_at ? s.completed_at.toISOString() : null
            }));

            // 4. Archive current cycle to history
            await client.query(`
                INSERT INTO task_assignment_history
                    (assignment_id, cycle, assigned_at, completed_at, reset_by, steps_snapshot)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [assignmentId, cycle, a.assigned_at, a.completed_at, user.user_id, JSON.stringify(stepsSnapshot)]);

            // 5. Clear step progress for this assignment
            await client.query(
                `DELETE FROM task_step_progress WHERE assignment_id = $1`,
                [assignmentId]
            );

            // 6. Calculate next due_date and available_from based on recurrence_rule
            function addInterval(date: Date | null, rule: string | null): Date | null {
                if (!date || !rule) return null;
                const next = new Date(date);
                switch (rule) {
                    case 'daily':     next.setDate(next.getDate() + 1); break;
                    case 'weekly':    next.setDate(next.getDate() + 7); break;
                    case 'biweekly': next.setDate(next.getDate() + 14); break;
                    case 'monthly':   next.setMonth(next.getMonth() + 1); break;
                    case 'quarterly': next.setMonth(next.getMonth() + 3); break;
                    case 'yearly':    next.setFullYear(next.getFullYear() + 1); break;
                }
                return next;
            }

            const nextDueDate = addInterval(a.due_date, a.recurrence_rule);
            const nextAvailableFrom = addInterval(a.available_from, a.recurrence_rule);

            // 7. Reset the assignment for the new cycle
            await client.query(`
                UPDATE task_assignments
                SET status = 'pending',
                    completed_at = NULL,
                    assigned_at = NOW(),
                    due_date = $1,
                    available_from = $2
                WHERE id = $3
            `, [nextDueDate, nextAvailableFrom, assignmentId]);

            await client.query('COMMIT');
            return { success: true, action: 'reset' };
        } catch (e: any) {
            await client.query('ROLLBACK');
            if (e.status || e.location) throw e;
            console.error('Erro ao reiniciar ciclo:', e);
            return fail(500, { error: 'Erro ao reiniciar ciclo.' });
        } finally {
            client.release();
        }
    }
};
