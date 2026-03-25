import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { s3, BUCKETS } from '$lib/server/storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const assignmentId = Number(params['completedTask']);
    if (!assignmentId) throw redirect(302, '/tasks/manage/assignment');

    try {
        const [assignmentRes, stepsRes, historyRes] = await Promise.all([
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
                    t.is_recurring,
                    t.recurrence_rule,
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
                  AND t.task_type = 'assigned'
            `, [assignmentId]),

            pool.query(`
                SELECT
                    ts.id,
                    ts.title,
                    ts.description,
                    ts.step_order,
                    ts.step_type,
                    COALESCE(tsp.is_completed, FALSE) as is_completed,
                    tsp.completed_at,
                    f.id as file_id,
                    f.original_name as file_name,
                    f.object_key as file_key
                FROM task_steps ts
                LEFT JOIN task_step_progress tsp
                    ON tsp.step_id = ts.id AND tsp.assignment_id = $1
                LEFT JOIN files f ON f.id = tsp.file_id
                WHERE ts.task_id = (
                    SELECT task_id FROM task_assignments WHERE id = $1
                )
                ORDER BY ts.step_order
            `, [assignmentId]),

            pool.query(`
                SELECT
                    h.id,
                    h.cycle,
                    h.assigned_at,
                    h.completed_at,
                    h.reset_at,
                    h.steps_snapshot,
                    u.first_name || ' ' || u.last_name as reset_by_name
                FROM task_assignment_history h
                LEFT JOIN users u ON h.reset_by = u.user_id
                WHERE h.assignment_id = $1
                ORDER BY h.cycle DESC
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

        const steps = await Promise.all(stepsRes.rows.map(async (s: any) => {
            let file_url: string | null = null;
            if (s.file_id && s.file_key) {
                try {
                    file_url = await getSignedUrl(
                        s3,
                        new GetObjectCommand({ Bucket: BUCKETS.tasks, Key: s.file_key }),
                        { expiresIn: 3600 }
                    );
                } catch { /* não bloqueia a página */ }
            }
            return {
                ...s,
                completed_at: s.completed_at ? s.completed_at.toISOString() : null,
                file_url
            };
        }));

        const history = await Promise.all(historyRes.rows.map(async (h: any) => {
            const snapshot: any[] = h.steps_snapshot ?? [];
            const snapshotWithUrls = await Promise.all(snapshot.map(async (s: any) => {
                let file_url: string | null = null;
                if (s.file_key && s.bucket) {
                    try {
                        file_url = await getSignedUrl(
                            s3,
                            new GetObjectCommand({ Bucket: s.bucket, Key: s.file_key }),
                            { expiresIn: 3600 }
                        );
                    } catch { /* não bloqueia */ }
                }
                return { ...s, file_url };
            }));
            return {
                ...h,
                assigned_at:  h.assigned_at  ? h.assigned_at.toISOString()  : null,
                completed_at: h.completed_at ? h.completed_at.toISOString() : null,
                reset_at:     h.reset_at     ? h.reset_at.toISOString()     : null,
                steps_snapshot: snapshotWithUrls
            };
        }));

        return { assignment, steps, history };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar detalhe da atribuição:', e);
        throw redirect(302, '/tasks/manage/assignment');
    }
};
