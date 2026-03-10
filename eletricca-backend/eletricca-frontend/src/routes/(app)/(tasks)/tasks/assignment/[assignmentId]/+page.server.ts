import { redirect, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

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
            `, [assignmentId, user.user_id]),

            // Busca steps do template com o progresso individual deste assignment
            pool.query(`
                SELECT
                    ts.id,
                    ts.title,
                    ts.description,
                    ts.step_order,
                    COALESCE(tsp.is_completed, FALSE) as is_completed,
                    tsp.completed_at,
                    tsp.id as progress_id
                FROM task_steps ts
                LEFT JOIN task_step_progress tsp
                    ON tsp.step_id = ts.id AND tsp.assignment_id = $1
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
            due_date: row.due_date ? row.due_date.toISOString() : null,
            assigned_at: row.assigned_at ? row.assigned_at.toISOString() : null,
            completed_at: row.completed_at ? row.completed_at.toISOString() : null
        };

        const steps = stepsRes.rows.map((s: any) => ({
            ...s,
            completed_at: s.completed_at ? s.completed_at.toISOString() : null
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
            // Verifica que o assignment pertence ao usuário
            const ownerCheck = await pool.query(
                `SELECT ta.id, ta.task_id FROM task_assignments ta
                 WHERE ta.id = $1 AND ta.user_id = $2`,
                [assignmentId, user.user_id]
            );
            if (ownerCheck.rows.length === 0) return fail(403, { error: 'Atribuição não encontrada.' });

            const taskId = ownerCheck.rows[0].task_id;

            // Upsert na tabela de progresso individual
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

            // Auto-atualiza status do assignment
            const totalRes = await pool.query(
                `SELECT COUNT(*) as total FROM task_steps WHERE task_id = $1`,
                [taskId]
            );
            const doneRes = await pool.query(
                `SELECT COUNT(*) as done FROM task_step_progress WHERE assignment_id = $1 AND is_completed = TRUE`,
                [assignmentId]
            );

            const total = Number(totalRes.rows[0].total);
            const done = Number(doneRes.rows[0].done);

            let newStatus = 'pending';
            if (total > 0 && done === total) newStatus = 'completed';
            else if (done > 0) newStatus = 'in_progress';

            const completedAtExpr = newStatus === 'completed' ? 'NOW()' : 'NULL';
            await pool.query(`
                UPDATE task_assignments SET
                    status = $1,
                    completed_at = ${completedAtExpr}
                WHERE id = $2
            `, [newStatus, assignmentId]);

            return { success: true };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao toggle step:', e);
            return fail(500, { error: 'Erro ao atualizar etapa.' });
        }
    }
};
