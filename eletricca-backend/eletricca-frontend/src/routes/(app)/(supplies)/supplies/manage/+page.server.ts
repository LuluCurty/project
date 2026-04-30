import { pool } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { guardAction } from '$lib/server/auth';
import { supplyLog } from '$lib/server/logger';

const LIMIT = 15;

export const load: PageServerLoad = async ({ url, locals, route }) => {
    guardAction(route.id, locals.user, 'manage')

    const status = url.searchParams.get('status') || 'quoted';
    const search = url.searchParams.get('search') || '';
    const page   = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const offset = (page - 1) * LIMIT;

    const statusFilter = ['pending', 'quoting', 'quoted', 'approved', 'denied'].includes(status) ? status : null;
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
                COUNT(sli.id)::int AS item_count,
                COUNT(DISTINCT q.id)::int AS quote_count,
                COALESCE((
                    SELECT MIN(qt.total)::float
                    FROM (
                        SELECT SUM(qi.price::float * sli2.quantity)
                        FROM supply_list_quotes q2
                        JOIN supply_list_quote_items qi ON qi.quote_id = q2.id
                        JOIN supplies_list_items sli2   ON sli2.id = qi.list_item_id
                        WHERE q2.list_id = sl.id
                        GROUP BY q2.id
                    ) AS qt(total)
                ), 0)::float AS total_value
            FROM supplies_lists sl
            LEFT JOIN client c ON sl.client_id = c.id
            LEFT JOIN users  u ON sl.created_by = u.user_id
            LEFT JOIN supplies_list_items sli ON sl.id = sli.list_id
            LEFT JOIN supply_list_quotes  q   ON q.list_id = sl.id
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
                COUNT(*) FILTER (WHERE list_status = 'quoting' )::int  AS quoting,
                COUNT(*) FILTER (WHERE list_status = 'quoted'  )::int  AS quoted,
                COUNT(*) FILTER (WHERE list_status = 'approved')::int  AS approved,
                COUNT(*) FILTER (WHERE list_status = 'denied'  )::int  AS denied
            FROM supplies_lists
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
    // Select which supplier quote to go with before approving
    selectQuote: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'manage');
        const data     = await request.formData();
        const listId   = Number(data.get('list_id'));
        const quoteId  = Number(data.get('quote_id'));
        if (!listId || !quoteId) return fail(400, { error: 'IDs inválidos.' });
        try {
            await pool.query(
                'UPDATE supplies_lists SET selected_quote_id = $1, updated_at = NOW() WHERE id = $2',
                [quoteId, listId]
            );
            supplyLog.info({ user_id: locals.user!.user_id, list_id: listId, quote_id: quoteId }, 'quote selected');
            return { success: true, action: 'selectQuote' };
        } catch (e) {
            supplyLog.error({ err: e }, 'failed to select quote');
            return fail(500, { error: 'Erro ao selecionar cotação.' });
        }
    },

    approve: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'manage')
        const data = await request.formData();
        const id   = Number(data.get('id'));
        if (!id) return fail(400, { error: 'ID inválido' });
        try {
            await pool.query(
                "UPDATE supplies_lists SET list_status = 'approved', updated_at = NOW() WHERE id = $1 AND list_status IN ('pending', 'quoted')",
                [id]
            );
            supplyLog.info({ user_id: locals.user!.user_id, list_id: id }, 'supply list approved');
            return { success: true };
        } catch (e) {
            supplyLog.error({ err: e, user_id: locals.user!.user_id, list_id: id }, 'failed to approve supply list');
            return fail(500, { error: 'Erro ao aprovar pedido' });
        }
    },

    deny: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'manage')
        const data = await request.formData();
        const id   = Number(data.get('id'));
        if (!id) return fail(400, { error: 'ID inválido' });
        try {
            await pool.query(
                "UPDATE supplies_lists SET list_status = 'denied', updated_at = NOW() WHERE id = $1 AND list_status IN ('pending', 'quoting', 'quoted')",
                [id]
            );
            supplyLog.info({ user_id: locals.user!.user_id, list_id: id }, 'supply list denied');
            return { success: true };
        } catch (e) {
            supplyLog.error({ err: e, user_id: locals.user!.user_id, list_id: id }, 'failed to deny supply list');
            return fail(500, { error: 'Erro ao recusar pedido' });
        }
    },

    delete: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'manage')

        const data = await request.formData();
        const id   = Number(data.get('id'));
        if (!id) return fail(400, { error: 'ID inválido.' });

        try {
            await pool.query('DELETE FROM supplies_lists WHERE id = $1', [id]);
            supplyLog.info({ user_id: locals.user!.user_id, list_id: id }, 'supply list deleted');
            return { success: true };
        } catch (e) {
            supplyLog.error({ err: e, user_id: locals.user!.user_id, list_id: id }, 'failed to delete supply list');
            return fail(500, { error: 'Erro ao excluir lista.' });
        }
    },
};
