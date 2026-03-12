import { redirect, fail, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const assignmentId = Number(params.assignmentId);
    if (!assignmentId) throw redirect(302, '/tasks/manage/assignment');

    try {
        const res = await pool.query(`
            SELECT
                ta.id,
                ta.task_id,
                ta.status,
                ta.priority,
                ta.due_date,
                ta.available_from,
                ta.assigned_at,
                ta.completed_at,
                t.title as task_title,
                u.first_name || ' ' || u.last_name as user_name,
                u.email as user_email,
                COALESCE(ab.first_name || ' ' || ab.last_name, '—') as assigned_by_name
            FROM task_assignments ta
            JOIN tasks t ON ta.task_id = t.id
            JOIN users u ON ta.user_id = u.user_id
            LEFT JOIN users ab ON ta.assigned_by = ab.user_id
            WHERE ta.id = $1
              AND ta.deleted_at IS NULL
        `, [assignmentId]);

        if (res.rows.length === 0) throw error(404, 'Atribuição não encontrada');

        const row = res.rows[0];
        return {
            assignment: {
                ...row,
                due_date: row.due_date ? row.due_date.toISOString() : null,
                available_from: row.available_from ? row.available_from.toISOString() : null,
                assigned_at: row.assigned_at ? row.assigned_at.toISOString() : null,
                completed_at: row.completed_at ? row.completed_at.toISOString() : null
            }
        };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar atribuição:', e);
        throw redirect(302, '/tasks/manage/assignment');
    }
};

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const assignmentId = Number(params.assignmentId);
        const formData = await request.formData();

        const priority = String(formData.get('priority') || 'medium');
        const dueDate = formData.get('due_date') ? String(formData.get('due_date')) : null;
        const availableFrom = formData.get('available_from') ? String(formData.get('available_from')) : null;

        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            return fail(400, { error: 'Prioridade inválida.' });
        }

        try {
            const res = await pool.query(`
                UPDATE task_assignments
                SET priority = $1,
                    due_date = $2,
                    available_from = $3
                WHERE id = $4
                  AND deleted_at IS NULL
                RETURNING id
            `, [priority, dueDate || null, availableFrom || null, assignmentId]);

            if (res.rows.length === 0) {
                return fail(404, { error: 'Atribuição não encontrada.' });
            }
        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao atualizar atribuição:', e);
            return fail(500, { error: 'Erro ao salvar alterações.' });
        }

        throw redirect(303, '/tasks/manage/assignment');
    }
};
