import { pool } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /apiv2/supplies/search?q=texto
export const GET: RequestHandler = async ({ locals, url }) => {
    if (!locals.user) return new Response('Unauthorized', { status: 401 });

    const q = url.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) return json([]);

    const rows = await pool.query(
        `SELECT id, supply_name FROM supplies WHERE supply_name ILIKE $1 ORDER BY supply_name LIMIT 20`,
        [`%${q}%`]
    );

    return json(rows.rows);
};
