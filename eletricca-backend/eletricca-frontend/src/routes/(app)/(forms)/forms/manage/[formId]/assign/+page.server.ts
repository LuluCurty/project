import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAction } from '$lib/server/auth';
import { createNotification } from '$lib/server/notifications';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, route, params, url }) => {
    guardAction(route.id, locals.user, 'manage');

    const formId = Number(params.formId);
    const page = Number(url.searchParams.get('page')) || 1;
    const search = url.searchParams.get('search') || '';
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        // 1. Dados do Formulário (Título)
        const formRes = await pool.query('SELECT title FROM forms WHERE id = $1', [formId]);
        if (formRes.rowCount === 0) throw redirect(302, '/forms/manage');

        // 2. Lista de Usuários (Para seleção)
        // Trazemos apenas o necessário. Adicionei um filtro para não mostrar admins se não quiser.
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

        return {
            form: formRes.rows[0],
            users: usersRes.rows,
            pagination: {
                page,
                limit,
                totalItems: Number(countRes.rows[0].total),
                totalPages: Math.ceil(Number(countRes.rows[0].total) / limit)
            }
        };

    } catch (e) {
        console.error(e);
        return { form: null, users: [], pagination: { totalItems: 0 } };
    }
};

export const actions: Actions = {
    default: async ({ request, locals, params, route }) => {
        guardAction(route.id, locals.user, 'manage');

        const formId = Number(params.formId);
        const data = await request.formData();
        
        // Dados da Configuração
        const dueDate = data.get('due_date') as string;
        const periodReference = data.get('period_reference') as string;
        
        // IDs dos usuários selecionados (vem como string JSON)
        const userIdsJson = data.get('selected_users') as string;
        
        let userIds: number[] = [];
        try {
            userIds = JSON.parse(userIdsJson);
        } catch {
            return fail(400, { error: 'Seleção de usuários inválida' });
        }

        if (userIds.length === 0) {
            return fail(400, { error: 'Selecione pelo menos um usuário.' });
        }

        if (!periodReference) {
            return fail(400, { error: 'A referência do período é obrigatória (ex: Jan/2025).' });
        }

        const client = await pool.connect();
        let insertedAssignments: { id: number; user_id: number }[] = [];
        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO form_assignments
                (form_id, user_id, assigned_by, due_date, period_reference)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, user_id
            `;

            const assignerId = locals.user!.user_id;
            const validDate = dueDate ? new Date(dueDate) : null;

            const results = await Promise.all(
                userIds.map(userId =>
                    client.query(query, [formId, userId, assignerId, validDate, periodReference])
                )
            );

            insertedAssignments = results.map(r => r.rows[0]);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Erro ao atribuir formulários.' });
        } finally {
            client.release();
        }

        // Notificações após COMMIT + release do client
        const formTitleRes = await pool.query('SELECT title FROM forms WHERE id = $1', [formId]);
        const formTitle = formTitleRes.rows[0]?.title ?? '';

        await Promise.all(
            insertedAssignments.map(a => createNotification({
                userId: a.user_id,
                title: 'Novo formulário atribuído',
                message: formTitle,
                type: 'form_assigned',
                referenceType: 'form_assignment',
                referenceId: a.id
            }))
        );

        throw redirect(303, `/forms/manage`);
    }
};