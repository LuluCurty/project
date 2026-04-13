import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { Actions } from './$types';

export const actions: Actions = {
    default: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const data = await request.formData();

        const listName    = (data.get('list_name')   as string)?.trim();
        const clientId    =  data.get('client_id');
        const priority    = (data.get('priority')    as string) || 'medium';
        const description = (data.get('description') as string)?.trim() || null;
        const itemsRaw    =  data.get('items')        as string;

        if (!listName) return fail(400, { error: 'Nome da lista é obrigatório.' });
        if (!itemsRaw) return fail(400, { error: 'A lista precisa de pelo menos um item.' });

        let items: { supply_id: number; supplier_id: number | null; quantity: number; price: number }[];
        try {
            items = JSON.parse(itemsRaw);
        } catch {
            return fail(400, { error: 'Dados dos itens inválidos.' });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return fail(400, { error: 'A lista precisa de pelo menos um item.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const listRes = await client.query(`
                INSERT INTO supplies_lists (list_name, client_id, created_by, priority, description)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [listName, clientId ? Number(clientId) : null, locals.user.user_id, priority, description]);

            const listId = listRes.rows[0].id;

            for (const item of items) {
                await client.query(`
                    INSERT INTO supplies_list_items (list_id, supply_id, supplier_id, quantity, price)
                    VALUES ($1, $2, $3, $4, $5)
                `, [listId, item.supply_id, item.supplier_id, item.quantity, item.price]);
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Erro ao criar lista.' });
        } finally {
            client.release();
        }

        redirect(303, '/supplies/lists');
    }
};
