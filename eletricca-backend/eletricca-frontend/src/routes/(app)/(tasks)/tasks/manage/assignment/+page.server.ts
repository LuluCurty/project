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

        // $1 = user_id, $2 = searchParam (opcional)
        const searchCondition = searchParam
            ? `AND (LOWER(t.title) LIKE $2 OR LOWER(u.first_name || ' ' || u.last_name) LIKE $2 OR LOWER(u.email) LIKE $2)`
            : '';

        // Condição de status não usa parâmetros — são valores fixos seguros
        const statusCondition =
            statusFilter === 'pending'   ? `AND ta.status != 'completed'` :
            statusFilter === 'completed' ? `AND ta.status = 'completed'` :
            statusFilter === 'overdue'   ? `AND ta.due_date < NOW() AND ta.status != 'completed'` :
            '';

        const queryParams = searchParam ? [user.user_id, searchParam] : [user.user_id];

        const [statsRes, assignmentsRes, countRes] = await Promise.all([
            // Stats gerais — sem filtro de busca/status, sempre mostra o total real
            pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE ta.status != 'completed') as pending,
                    COUNT(*) FILTER (WHERE ta.status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE ta.due_date < NOW() AND ta.status != 'completed') as overdue
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                WHERE t.created_by = $1 AND t.task_type = 'assigned'
            `, [user.user_id]),

            // Atribuições paginadas com busca e filtro
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
                    COALESCE(ab.first_name || ' ' || ab.last_name, '—') as assigned_by_name,
                    (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id) as total_steps,
                    (SELECT COUNT(*) FROM task_step_progress WHERE assignment_id = ta.id AND is_completed = TRUE) as completed_steps
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                JOIN users u ON ta.user_id = u.user_id
                LEFT JOIN users ab ON ta.assigned_by = ab.user_id
                WHERE t.created_by = $1 AND t.task_type = 'assigned'
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
                WHERE t.created_by = $1 AND t.task_type = 'assigned'
                ${searchCondition}
                ${statusCondition}
            `, queryParams)
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
            due_date: row.due_date ? row.due_date.toISOString() : null,
            assigned_at: row.assigned_at ? row.assigned_at.toISOString() : null,
            completed_at: row.completed_at ? row.completed_at.toISOString() : null
        }));

        return {
            assignments,
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
            // DELETE com USING para garantir ownership via task
            const res = await pool.query(`
                DELETE FROM task_assignments ta
                USING tasks t
                WHERE ta.id = $1
                  AND ta.task_id = t.id
                  AND t.created_by = $2
                RETURNING ta.id
            `, [assignmentId, user.user_id]);

            if (res.rows.length === 0) {
                return fail(403, { error: 'Atribuição não encontrada.' });
            }

            return { success: true };
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao remover atribuição:', e);
            return fail(500, { error: 'Erro ao remover atribuição.' });
        }
    }
};
