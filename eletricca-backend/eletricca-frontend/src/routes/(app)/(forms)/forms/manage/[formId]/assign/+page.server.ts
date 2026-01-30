import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAction } from '$lib/server/auth';
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
        try {
            await client.query('BEGIN');

            // BULK INSERT: Vamos inserir um por um dentro da transação.
            // Para milhares de usuários, faríamos um "unnest" no SQL, 
            // mas para < 100 usuários, um loop é seguro e legível.
            
            const query = `
                INSERT INTO form_assignments 
                (form_id, user_id, assigned_by, due_date, period_reference)
                VALUES ($1, $2, $3, $4, $5)
            `;

            const assignerId = locals.user!.user_id;
            const validDate = dueDate ? new Date(dueDate) : null;

            // Executa todas as promises em paralelo para ser rápido
            const promises = userIds.map(userId => 
                client.query(query, [formId, userId, assignerId, validDate, periodReference])
            );

            await Promise.all(promises);

            await client.query('COMMIT');

        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Erro ao atribuir formulários.' });
        } finally {
            client.release();
        }

        // Redireciona de volta para o gerenciamento do form ou exibe sucesso
        throw redirect(303, `/forms/manage`);
    }
};