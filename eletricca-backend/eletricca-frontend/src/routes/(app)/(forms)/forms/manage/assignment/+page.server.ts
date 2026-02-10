import { fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAction } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, route, url }) => {
    guardAction(route.id, locals.user, 'assign');

    const page = Number(url.searchParams.get('page')) || 1;
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all'; // all, pending, completed, overdue
    const formId = Number(url.searchParams.get('formId')) || 0;
    const limit = 15;
    const offset = (page - 1) * limit;

    try {
        // Filtro de status
        let statusFilter = '';
        if (status === 'pending') {
            statusFilter = 'AND fa.is_completed = FALSE AND (fa.due_date IS NULL OR fa.due_date >= NOW())';
        } else if (status === 'completed') {
            statusFilter = 'AND fa.is_completed = TRUE';
        } else if (status === 'overdue') {
            statusFilter = 'AND fa.is_completed = FALSE AND fa.due_date < NOW()';
        }

        // Filtro por formulário (parametrizado para evitar SQL injection)
        const formFilter = formId ? `AND fa.form_id = $4` : '';
        const formParams = formId ? [formId] : [];

        const listQuery = `
            SELECT
                fa.id,
                fa.form_id,
                fa.user_id,
                fa.assigned_at,
                fa.due_date,
                fa.period_reference,
                fa.is_completed,
                fa.completed_at,
                f.title as form_title,
                u.first_name || ' ' || u.last_name as user_name,
                u.email as user_email,
                assigner.first_name || ' ' || assigner.last_name as assigned_by_name,
                (SELECT COUNT(*) FROM form_responses fr WHERE fr.assignment_id = fa.id) as has_response
            FROM form_assignments fa
            JOIN forms f ON fa.form_id = f.id
            JOIN users u ON fa.user_id = u.user_id
            JOIN users assigner ON fa.assigned_by = assigner.user_id
            WHERE (
                f.title ILIKE $1
                OR u.first_name ILIKE $1
                OR u.last_name ILIKE $1
                OR u.email ILIKE $1
                OR fa.period_reference ILIKE $1
            )
            ${statusFilter}
            ${formFilter}
            ORDER BY
                CASE WHEN fa.is_completed = FALSE AND fa.due_date < NOW() THEN 0 ELSE 1 END,
                fa.assigned_at DESC
            LIMIT $2 OFFSET $3
        `;

        const countFormFilter = formId ? `AND fa.form_id = $2` : '';

        const countQuery = `
            SELECT COUNT(*) as total
            FROM form_assignments fa
            JOIN forms f ON fa.form_id = f.id
            JOIN users u ON fa.user_id = u.user_id
            WHERE (
                f.title ILIKE $1
                OR u.first_name ILIKE $1
                OR u.last_name ILIKE $1
                OR u.email ILIKE $1
                OR fa.period_reference ILIKE $1
            )
            ${statusFilter}
            ${countFormFilter}
        `;

        const statsQuery = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_completed = FALSE AND (due_date IS NULL OR due_date >= NOW()) THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN is_completed = FALSE AND due_date < NOW() THEN 1 ELSE 0 END) as overdue
            FROM form_assignments
        `;

        // Lista de formulários que possuem atribuições (para o filtro)
        const formsQuery = `
            SELECT DISTINCT f.id, f.title
            FROM forms f
            JOIN form_assignments fa ON fa.form_id = f.id
            ORDER BY f.title ASC
        `;

        const [listRes, countRes, statsRes, formsRes] = await Promise.all([
            pool.query(listQuery, [`%${search}%`, limit, offset, ...formParams]),
            pool.query(countQuery, [`%${search}%`, ...formParams]),
            pool.query(statsQuery),
            pool.query(formsQuery)
        ]);

        const totalItems = Number(countRes.rows[0].total);
        const stats = statsRes.rows[0];

        return {
            assignments: listRes.rows,
            forms: formsRes.rows as { id: number; title: string }[],
            selectedFormId: formId,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            },
            stats: {
                total: Number(stats.total),
                pending: Number(stats.pending),
                completed: Number(stats.completed),
                overdue: Number(stats.overdue)
            }
        };
    } catch (e) {
        console.error('Erro ao carregar atribuições:', e);
        return {
            assignments: [],
            forms: [],
            selectedFormId: 0,
            pagination: { page: 1, limit, totalItems: 0, totalPages: 0 },
            stats: { total: 0, pending: 0, completed: 0, overdue: 0 }
        };
    }
};

export const actions: Actions = {
    updateDueDate: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'assign');

        const data = await request.formData();
        const id = Number(data.get('id'));
        const dueDate = data.get('due_date') as string;

        if (!id) return fail(400, { error: 'ID inválido' });

        try {
            await pool.query(
                'UPDATE form_assignments SET due_date = $1 WHERE id = $2',
                [dueDate || null, id]
            );
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao atualizar prazo' });
        }

        return { success: true };
    },

    delete: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'assign');

        const data = await request.formData();
        const id = Number(data.get('id'));

        if (!id) return fail(400, { error: 'ID inválido' });

        try {
            await pool.query('DELETE FROM form_assignments WHERE id = $1', [id]);
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao excluir atribuição' });
        }

        return { success: true };
    }
};
