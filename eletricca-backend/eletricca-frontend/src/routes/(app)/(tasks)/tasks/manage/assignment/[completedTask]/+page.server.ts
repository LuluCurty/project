import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const assignmentId = Number(params['completedTask']);
    if (!assignmentId) throw redirect(302, '/tasks/manage/assignment');

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
                    u.first_name || ' ' || u.last_name as user_name,
                    u.email as user_email,
                    COALESCE(ab.first_name || ' ' || ab.last_name, '—') as assigned_by_name
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                JOIN users u ON ta.user_id = u.user_id
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                LEFT JOIN users ab ON ta.assigned_by = ab.user_id
                WHERE ta.id = $1
                  AND t.created_by = $2
                  AND t.task_type = 'assigned'
            `, [assignmentId, user.user_id]),

            pool.query(`
                SELECT
                    ts.id,
                    ts.title,
                    ts.description,
                    ts.step_order,
                    COALESCE(tsp.is_completed, FALSE) as is_completed,
                    tsp.completed_at
                FROM task_steps ts
                LEFT JOIN task_step_progress tsp
                    ON tsp.step_id = ts.id AND tsp.assignment_id = $1
                WHERE ts.task_id = (
                    SELECT task_id FROM task_assignments WHERE id = $1
                )
                ORDER BY ts.step_order
            `, [assignmentId])
        ]);

        if (assignmentRes.rows.length === 0) throw redirect(302, '/tasks/manage/assignment');

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
        console.error('Erro ao carregar detalhe da atribuição:', e);
        throw redirect(302, '/tasks/manage/assignment');
    }
};
