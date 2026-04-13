import { pool } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /apiv2/clients/search?q=texto
export const GET: RequestHandler = async ({ locals, url }) => {
    if (!locals.user) return new Response('Unauthorized', { status: 401 });

    const q = url.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) return json([]);

    const rows = await pool.query(
        `SELECT id, client_first_name, client_last_name, client_email
         FROM client
         WHERE client_first_name ILIKE $1 OR client_last_name ILIKE $1 OR client_email ILIKE $1
         ORDER BY client_first_name LIMIT 20`,
        [`%${q}%`]
    );

    return json(rows.rows);
};
