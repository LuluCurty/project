import { pool } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /apiv2/suppliers/search?q=texto
// GET /apiv2/suppliers/search?q=texto&supply_id=X  → filtra pelo material e traz o preço cadastrado
export const GET: RequestHandler = async ({ locals, url }) => {
    if (!locals.user) return new Response('Unauthorized', { status: 401 });

    const q        = url.searchParams.get('q')?.trim() ?? '';
    const supplyId = url.searchParams.get('supply_id');

    let rows;

    // Sem query mas com supply_id → retorna apenas o fornecedor padrão desse material
    if (supplyId && q.length === 0) {
        rows = await pool.query(
            `SELECT s.id, s.supplier_name, sp.price, sp.is_default
             FROM supplier s
             INNER JOIN supply_pricing sp ON sp.supplier_id = s.id
             WHERE sp.supply_id = $1
               AND sp.is_default = TRUE
             LIMIT 1`,
            [Number(supplyId)]
        );
        return json(rows.rows);
    }

    if (q.length < 2) return json([]);

    if (supplyId) {
        rows = await pool.query(
            `SELECT s.id, s.supplier_name, sp.price, sp.is_default
             FROM supplier s
             INNER JOIN supply_pricing sp ON sp.supplier_id = s.id
             WHERE sp.supply_id = $1
               AND s.supplier_name ILIKE $2
             ORDER BY sp.is_default DESC NULLS LAST, s.supplier_name
             LIMIT 20`,
            [Number(supplyId), `%${q}%`]
        );
    } else {
        rows = await pool.query(
            `SELECT id, supplier_name, supplier_legal_name
             FROM supplier
             WHERE supplier_name ILIKE $1 OR supplier_legal_name ILIKE $1
             ORDER BY supplier_name
             LIMIT 20`,
            [`%${q}%`]
        );
    }

    return json(rows.rows);
};
