import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const [
            overviewRes,
            assignmentStatsRes,
            monthlyRes,
            byCategoryRes,
            byPriorityRes,
            topTasksRes,
            topPerformersRes
        ] = await Promise.all([

            pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM tasks WHERE task_type = 'assigned') as total_tasks,
                    (SELECT COUNT(*) FROM task_assignments WHERE deleted_at IS NULL) as total_assignments,
                    (SELECT COUNT(*) FROM task_categories) as total_categories,
                    (SELECT COUNT(*) FROM task_assignments WHERE status = 'completed' AND deleted_at IS NULL) as completed,
                    (SELECT COUNT(*) FROM task_assignments WHERE status != 'completed' AND deleted_at IS NULL) as pending,
                    (SELECT COUNT(*) FROM task_assignments
                     WHERE due_date::date < CURRENT_DATE AND status != 'completed' AND deleted_at IS NULL) as overdue
            `),

            pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE due_date::date < CURRENT_DATE AND status != 'completed') as overdue
                FROM task_assignments
                WHERE deleted_at IS NULL
            `),

            pool.query(`
                SELECT
                    to_char(completed_at, 'YYYY-MM') as month,
                    to_char(completed_at, 'Mon/YYYY') as month_label,
                    COUNT(*) as count
                FROM task_assignments
                WHERE completed_at >= NOW() - INTERVAL '6 months'
                  AND status = 'completed'
                  AND deleted_at IS NULL
                GROUP BY month, month_label
                ORDER BY month ASC
            `),

            pool.query(`
                SELECT
                    COALESCE(tc.name, 'Sem categoria') as category_name,
                    COUNT(DISTINCT t.id) as task_count,
                    COUNT(DISTINCT ta.id) as assignment_count,
                    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'completed') as completed_count,
                    CASE
                        WHEN COUNT(DISTINCT ta.id) > 0
                        THEN ROUND((COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'completed')::numeric
                             / COUNT(DISTINCT ta.id)) * 100, 1)
                        ELSE 0
                    END as completion_rate
                FROM tasks t
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.deleted_at IS NULL
                WHERE t.task_type = 'assigned'
                GROUP BY tc.name
                ORDER BY assignment_count DESC
                LIMIT 10
            `),

            pool.query(`
                SELECT
                    priority,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed
                FROM task_assignments
                WHERE deleted_at IS NULL
                GROUP BY priority
                ORDER BY
                    CASE priority
                        WHEN 'urgent' THEN 1 WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3 WHEN 'low'  THEN 4
                    END
            `),

            pool.query(`
                SELECT
                    t.id, t.title,
                    COALESCE(tc.name, '—') as category_name,
                    COUNT(ta.id) as assignment_count,
                    COUNT(ta.id) FILTER (WHERE ta.status = 'completed') as completed_count,
                    CASE WHEN COUNT(ta.id) > 0
                        THEN ROUND((COUNT(ta.id) FILTER (WHERE ta.status = 'completed')::numeric / COUNT(ta.id)) * 100, 1)
                        ELSE 0 END as completion_rate
                FROM tasks t
                LEFT JOIN task_categories tc ON t.category_id = tc.id
                LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.deleted_at IS NULL
                WHERE t.task_type = 'assigned'
                GROUP BY t.id, t.title, tc.name
                ORDER BY assignment_count DESC
                LIMIT 10
            `),

            pool.query(`
                SELECT
                    u.user_id,
                    u.first_name || ' ' || u.last_name as name,
                    u.email,
                    COUNT(ta.id) as total_assignments,
                    COUNT(ta.id) FILTER (WHERE ta.status = 'completed') as completed_count,
                    CASE WHEN COUNT(ta.id) > 0
                        THEN ROUND((COUNT(ta.id) FILTER (WHERE ta.status = 'completed')::numeric / COUNT(ta.id)) * 100, 1)
                        ELSE 0 END as completion_rate
                FROM users u
                JOIN task_assignments ta ON ta.user_id = u.user_id AND ta.deleted_at IS NULL
                GROUP BY u.user_id, u.first_name, u.last_name, u.email
                ORDER BY completed_count DESC
                LIMIT 10
            `)
        ]);

        const ov = overviewRes.rows[0];
        const st = assignmentStatsRes.rows[0];
        const total = Number(st.total);
        const completionRate = total > 0 ? Math.round((Number(st.completed) / total) * 100) : 0;

        const priorityLabels: Record<string, string> = {
            urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa'
        };

        return {
            overview: {
                totalTasks:       Number(ov.total_tasks),
                totalAssignments: Number(ov.total_assignments),
                totalCategories:  Number(ov.total_categories),
                completed:        Number(ov.completed),
                pending:          Number(ov.pending),
                overdue:          Number(ov.overdue)
            },
            stats: { total, completed: Number(st.completed), inProgress: Number(st.in_progress), pending: Number(st.pending), overdue: Number(st.overdue), completionRate },
            monthlyCompletions: monthlyRes.rows.map((m: any) => ({ month: m.month, label: m.month_label, count: Number(m.count) })),
            byCategory: byCategoryRes.rows.map((c: any) => ({
                name: c.category_name, taskCount: Number(c.task_count),
                assignmentCount: Number(c.assignment_count), completedCount: Number(c.completed_count),
                completionRate: Number(c.completion_rate)
            })),
            byPriority: byPriorityRes.rows.map((p: any) => ({
                priority: p.priority, label: priorityLabels[p.priority] ?? p.priority,
                total: Number(p.total), completed: Number(p.completed),
                completionRate: Number(p.total) > 0 ? Math.round((Number(p.completed) / Number(p.total)) * 100) : 0
            })),
            topTasks: topTasksRes.rows.map((t: any) => ({
                id: t.id, title: t.title, categoryName: t.category_name,
                assignmentCount: Number(t.assignment_count), completedCount: Number(t.completed_count),
                completionRate: Number(t.completion_rate)
            })),
            topPerformers: topPerformersRes.rows.map((u: any) => ({
                userId: u.user_id, name: u.name, email: u.email,
                totalAssignments: Number(u.total_assignments), completedCount: Number(u.completed_count),
                completionRate: Number(u.completion_rate)
            }))
        };
    } catch (e) {
        console.error('Erro ao carregar estatísticas de tarefas:', e);
        return {
            overview: { totalTasks: 0, totalAssignments: 0, totalCategories: 0, completed: 0, pending: 0, overdue: 0 },
            stats: { total: 0, completed: 0, inProgress: 0, pending: 0, overdue: 0, completionRate: 0 },
            monthlyCompletions: [], byCategory: [], byPriority: [], topTasks: [], topPerformers: []
        };
    }
};
