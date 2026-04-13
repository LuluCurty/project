import { pool } from '$lib/server/db';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /apiv2/supplies/lists/:id
export const GET: RequestHandler = async ({ locals, params }) => {
    if (!locals.user) return new Response('Unauthorized', { status: 401 });

    const listId = Number(params.id);
    if (isNaN(listId)) throw error(400, 'ID inválido');

    const [listRes, itemsRes] = await Promise.all([
        pool.query(`
            SELECT sl.id, sl.list_name, sl.description, sl.priority, sl.list_status,
                   sl.client_id,
                   c.client_first_name, c.client_last_name, c.client_email,
                   u.first_name AS creator_first_name, u.last_name AS creator_last_name
            FROM supplies_lists sl
            LEFT JOIN client c ON c.id       = sl.client_id
            LEFT JOIN users  u ON u.user_id  = sl.created_by
            WHERE sl.id = $1
        `, [listId]),
        pool.query(`
            SELECT sli.quantity, sli.price,
                   s.supply_name,
                   sup.supplier_name
            FROM supplies_list_items sli
            JOIN  supplies  s   ON s.id   = sli.supply_id
            LEFT JOIN supplier sup ON sup.id = sli.supplier_id
            WHERE sli.list_id = $1
            ORDER BY sli.id
        `, [listId]),
    ]);

    if (listRes.rowCount === 0) throw error(404, 'Lista não encontrada');

    const row = listRes.rows[0];

    return json({
        id:                row.id,
        list_name:         row.list_name,
        description:       row.description ?? '',
        priority:          row.priority,
        list_status:       row.list_status,
        client_first_name: row.client_first_name ?? null,
        client_last_name:  row.client_last_name  ?? null,
        client_email:      row.client_email      ?? null,
        items: itemsRes.rows.map(r => ({
            supply_name:   r.supply_name,
            supplier_name: r.supplier_name ?? null,
            quantity:      r.quantity,
            price:         Number(r.price),
        })),
    });
};
