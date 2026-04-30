import { error, json } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) throw error(401, 'Não autenticado.');
    const canManage = locals.user.is_super_admin || locals.user.permissions.includes('supplies.manage');
    if (!canManage) throw error(403, 'Sem permissão.');

    const listId = Number(params.id);
    if (isNaN(listId)) throw error(404, 'Lista não encontrada.');

    const [listRes, itemsRes, quotesRes] = await Promise.all([
        pool.query(`
            SELECT sl.id, sl.list_name, sl.list_status, sl.priority,
                   sl.description, sl.creation_date, sl.selected_quote_id,
                   c.client_first_name, c.client_last_name,
                   u.first_name AS creator_first_name, u.last_name AS creator_last_name
            FROM supplies_lists sl
            LEFT JOIN client c ON c.id = sl.client_id
            LEFT JOIN users  u ON u.user_id = sl.created_by
            WHERE sl.id = $1
        `, [listId]),

        pool.query(`
            SELECT sli.id, sli.quantity, s.supply_name
            FROM supplies_list_items sli
            JOIN supplies s ON s.id = sli.supply_id
            WHERE sli.list_id = $1
            ORDER BY s.supply_name
        `, [listId]),

        pool.query(`
            SELECT
                q.id, sup.supplier_name,
                COALESCE(
                    json_agg(
                        json_build_object('list_item_id', qi.list_item_id, 'price', qi.price::float)
                        ORDER BY qi.list_item_id
                    ) FILTER (WHERE qi.id IS NOT NULL),
                    '[]'
                ) AS items
            FROM supply_list_quotes q
            JOIN supplier sup ON sup.id = q.supplier_id
            LEFT JOIN supply_list_quote_items qi ON qi.quote_id = q.id
            WHERE q.list_id = $1
            GROUP BY q.id, sup.supplier_name
            ORDER BY q.id
        `, [listId]),
    ]);

    if (listRes.rowCount === 0) throw error(404, 'Lista não encontrada.');

    const list  = listRes.rows[0];
    const items = itemsRes.rows.map((r: any) => ({
        id:          r.id,
        supply_name: r.supply_name,
        quantity:    Number(r.quantity),
    }));

    const quotes = quotesRes.rows.map((q: any) => {
        const priceMap: Record<number, number> = Object.fromEntries(
            (q.items as { list_item_id: number; price: number }[]).map(i => [i.list_item_id, i.price])
        );
        const total = items.reduce((sum, item) => sum + (priceMap[item.id] ?? 0) * item.quantity, 0);
        return { id: q.id, supplier_name: q.supplier_name, priceMap, total };
    });

    return json({
        id:                list.id,
        list_name:         list.list_name,
        list_status:       list.list_status,
        priority:          list.priority,
        description:       list.description ?? '',
        client_first_name: list.client_first_name ?? null,
        client_last_name:  list.client_last_name  ?? null,
        creation_date:     (list.creation_date as Date).toISOString(),
        creator_first_name: list.creator_first_name ?? '',
        creator_last_name:  list.creator_last_name  ?? '',
        selected_quote_id: list.selected_quote_id ?? null,
        items,
        quotes,
    });
};
