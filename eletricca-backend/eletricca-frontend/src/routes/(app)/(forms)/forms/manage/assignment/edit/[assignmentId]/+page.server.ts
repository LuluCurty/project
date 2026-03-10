import { fail, redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAction } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, route, params, url }) => {
    guardAction(route.id, locals.user, 'assign');

    const assignmentId = Number(params.assignmentId);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const search = url.searchParams.get('search') || '';
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        // 1. Buscar atribuição com detalhes
        const assignRes = await pool.query(`
            SELECT
                fa.id,
                fa.form_id,
                fa.user_id,
                fa.due_date,
                fa.period_reference,
                fa.is_completed,
                f.title as form_title,
                u.first_name || ' ' || u.last_name as user_name,
                u.email as user_email,
                assigner.first_name || ' ' || assigner.last_name as assigned_by_name
            FROM form_assignments fa
            JOIN forms f ON fa.form_id = f.id
            JOIN users u ON fa.user_id = u.user_id
            JOIN users assigner ON fa.assigned_by = assigner.user_id
            WHERE fa.id = $1
        `, [assignmentId]);

        if (assignRes.rowCount === 0) {
            throw error(404, 'Atribuição não encontrada');
        }

        const assignment = assignRes.rows[0];

        // Não permite editar atribuições concluídas
        if (assignment.is_completed) {
            throw redirect(303, '/forms/manage/assignment');
        }

        // 2. Lista de usuários paginada com busca
        const usersQuery = `
            SELECT user_id, first_name, last_name, email, user_role,
            (SELECT name FROM roles WHERE id = u.role_id) as role_name
            FROM users u
            WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)
            ORDER BY first_name ASC
            LIMIT $2 OFFSET $3
        `;

        const countQuery = `
            SELECT COUNT(*) as total FROM users
            WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)
        `;

        const [usersRes, countRes] = await Promise.all([
            pool.query(usersQuery, [`%${search}%`, limit, offset]),
            pool.query(countQuery, [`%${search}%`])
        ]);

        const totalItems = Number(countRes.rows[0].total);

        return {
            assignment,
            users: usersRes.rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            },
            search
        };

    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error('Erro ao carregar atribuição para edição:', e);
        throw error(500, 'Erro ao carregar atribuição');
    }
};

export const actions: Actions = {
    default: async ({ request, locals, params, route }) => {
        guardAction(route.id, locals.user, 'assign');

        const assignmentId = Number(params.assignmentId);
        const data = await request.formData();

        const dueDate = data.get('due_date') as string;
        const periodReference = data.get('period_reference') as string;
        const newUserId = Number(data.get('new_user_id'));

        if (!periodReference || !periodReference.trim()) {
            return fail(400, { error: 'A referência do período é obrigatória.' });
        }

        if (!newUserId) {
            return fail(400, { error: 'Selecione um usuário.' });
        }

        try {
            // Verificar que a atribuição existe e está pendente
            const check = await pool.query(
                'SELECT id FROM form_assignments WHERE id = $1 AND is_completed = FALSE',
                [assignmentId]
            );

            if (check.rowCount === 0) {
                return fail(400, { error: 'Atribuição não encontrada ou já foi concluída.' });
            }

            await pool.query(`
                UPDATE form_assignments
                SET due_date = $1, period_reference = $2, user_id = $3
                WHERE id = $4 AND is_completed = FALSE
            `, [dueDate || null, periodReference.trim(), newUserId, assignmentId]);

        } catch (e: any) {
            if (e.status || e.location) throw e;
            console.error('Erro ao atualizar atribuição:', e);
            return fail(500, { error: 'Erro ao atualizar atribuição.' });
        }

        throw redirect(303, '/forms/manage/assignment');
    }
};
