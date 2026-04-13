import { fail, redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const listId = Number(params.id);
    if (isNaN(listId)) throw error(404, 'Lista não encontrada');

    const [listRes, itemsRes] = await Promise.all([
        pool.query(`
            SELECT sl.id, sl.list_name, sl.description, sl.priority, sl.list_status,
                   sl.created_by, sl.client_id,
                   c.client_first_name, c.client_last_name, c.client_email
            FROM supplies_lists sl
            LEFT JOIN client c ON c.id = sl.client_id
            WHERE sl.id = $1
        `, [listId]),
        pool.query(`
            SELECT sli.id, sli.supply_id, sli.supplier_id, sli.quantity, sli.price,
                   s.supply_name,
                   sup.supplier_name
            FROM supplies_list_items sli
            JOIN supplies s ON s.id = sli.supply_id
            LEFT JOIN supplier sup ON sup.id = sli.supplier_id
            WHERE sli.list_id = $1
            ORDER BY sli.id
        `, [listId]),
    ]);

    if (listRes.rowCount === 0) throw error(404, 'Lista não encontrada');

    const row = listRes.rows[0];

    if (row.list_status !== 'pending') {
        redirect(303, '/supplies/lists?msg=not_pending');
    }

    const canManageAll = locals.user?.permissions.includes('supplies.manage') || locals.user?.is_super_admin;
    if (row.created_by !== locals.user?.user_id && !canManageAll) {
        redirect(303, '/supplies/lists?msg=no_permission');
    }

    return {
        list: {
            id:          row.id,
            list_name:   row.list_name,
            description: row.description ?? '',
            priority:    row.priority,
            list_status: row.list_status,
            client: row.client_id ? {
                id:                row.client_id,
                client_first_name: row.client_first_name,
                client_last_name:  row.client_last_name,
                client_email:      row.client_email,
            } : null,
        },
        items: itemsRes.rows.map(r => ({
            id:            r.id,
            supply_id:     r.supply_id,
            supply_name:   r.supply_name,
            supplier_id:   r.supplier_id   ?? null,
            supplier_name: r.supplier_name ?? null,
            quantity:      r.quantity,
            price:         Number(r.price),
        })),
    };
};

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const listId = Number(params.id);
        if (isNaN(listId)) return fail(400, { error: 'ID inválido.' });

        // Garante que a lista ainda está pendente
        const statusCheck = await pool.query(
            'SELECT list_status FROM supplies_lists WHERE id = $1',
            [listId]
        );
        if (statusCheck.rowCount === 0) return fail(404, { error: 'Lista não encontrada.' });
        if (statusCheck.rows[0].list_status !== 'pending') {
            return fail(403, { error: 'Esta lista não pode mais ser editada.' });
        }

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

            await client.query(`
                UPDATE supplies_lists
                SET list_name=$1, client_id=$2, priority=$3, description=$4, updated_at=NOW()
                WHERE id=$5
            `, [listName, clientId ? Number(clientId) : null, priority, description, listId]);

            // Substitui todos os itens
            await client.query('DELETE FROM supplies_list_items WHERE list_id=$1', [listId]);

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
            return fail(500, { error: 'Erro ao atualizar lista.' });
        } finally {
            client.release();
        }

        redirect(303, '/supplies/lists');
    }
};
