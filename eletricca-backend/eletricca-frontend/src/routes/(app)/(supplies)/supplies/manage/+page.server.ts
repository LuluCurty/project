import { pool } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const LIMIT = 15;

export const load: PageServerLoad = async ({ url, locals }) => {
    const status = url.searchParams.get('status') || 'pending';
    const search = url.searchParams.get('search') || '';
    const page   = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const offset = (page - 1) * LIMIT;

    const statusFilter = ['pending', 'approved', 'denied'].includes(status) ? status : null;
    const searchParam  = search.trim() || null;

    const [listRes, statsRes] = await Promise.all([
        pool.query(`
            SELECT
                sl.id,
                sl.list_name,
                sl.list_status,
                sl.priority,
                sl.creation_date,
                sl.description,
                sl.client_id,
                c.client_first_name,
                c.client_last_name,
                u.first_name  AS creator_first_name,
                u.last_name   AS creator_last_name,
                COUNT(sli.id)::int                        AS item_count,
                COALESCE(SUM(sli.quantity * sli.price), 0)::float AS total_value
            FROM supplies_lists sl
            LEFT JOIN client c ON sl.client_id = c.id
            LEFT JOIN users  u ON sl.created_by = u.user_id
            LEFT JOIN supplies_list_items sli ON sl.id = sli.list_id
            WHERE
                ($1::text IS NULL OR sl.list_status = $1)
                AND ($2::text IS NULL OR sl.list_name ILIKE '%' || $2 || '%'
                                      OR c.client_first_name ILIKE '%' || $2 || '%'
                                      OR c.client_last_name  ILIKE '%' || $2 || '%')
            GROUP BY sl.id, c.client_first_name, c.client_last_name, u.first_name, u.last_name
            ORDER BY
                CASE sl.list_status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                CASE sl.priority    WHEN 'high'    THEN 0 WHEN 'medium'   THEN 1 ELSE 2 END,
                sl.creation_date DESC
            LIMIT $3 OFFSET $4
        `, [statusFilter, searchParam, LIMIT, offset]),

        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE list_status = 'pending' )::int  AS pending,
                COUNT(*) FILTER (WHERE list_status = 'approved')::int  AS approved,
                COUNT(*) FILTER (WHERE list_status = 'denied'  )::int  AS denied,
                COALESCE(SUM(total_value) FILTER (WHERE list_status = 'pending'), 0)::float AS pending_value
            FROM (
                SELECT sl.id, sl.list_status,
                       COALESCE(SUM(sli.quantity * sli.price), 0) AS total_value
                FROM supplies_lists sl
                LEFT JOIN supplies_list_items sli ON sl.id = sli.list_id
                GROUP BY sl.id, sl.list_status
            ) t
        `, []),
    ]);

    const totalRes = await pool.query(`
        SELECT COUNT(DISTINCT sl.id)::int AS total
        FROM supplies_lists sl
        LEFT JOIN client c ON sl.client_id = c.id
        WHERE
            ($1::text IS NULL OR sl.list_status = $1)
            AND ($2::text IS NULL OR sl.list_name ILIKE '%' || $2 || '%'
                                  OR c.client_first_name ILIKE '%' || $2 || '%'
                                  OR c.client_last_name  ILIKE '%' || $2 || '%')
    `, [statusFilter, searchParam]);

    return {
        orders:     listRes.rows.map(r => ({ ...r, creation_date: r.creation_date.toISOString() })),
        stats:      statsRes.rows[0],
        totalItems: totalRes.rows[0].total,
        currentPage: page,
        statusFilter: status,
        search,
    };
};

export const actions: Actions = {
    approve: async ({ request, locals }) => {
        const data = await request.formData();
        const id   = Number(data.get('id'));
        if (!id) return fail(400, { error: 'ID inválido' });
        try {
            await pool.query(
                "UPDATE supplies_lists SET list_status = 'approved' WHERE id = $1",
                [id]
            );
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao aprovar pedido' });
        }
    },

    deny: async ({ request, locals }) => {
        const data = await request.formData();
        const id   = Number(data.get('id'));
        if (!id) return fail(400, { error: 'ID inválido' });
        try {
            await pool.query(
                "UPDATE supplies_lists SET list_status = 'denied' WHERE id = $1",
                [id]
            );
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao recusar pedido' });
        }
    },

    delete: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const data = await request.formData();
        const id   = Number(data.get('id'));
        if (!id) return fail(400, { error: 'ID inválido.' });

        try {
            await pool.query('DELETE FROM supplies_lists WHERE id = $1', [id]);
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao excluir lista.' });
        }
    },
};
