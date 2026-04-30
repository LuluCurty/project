import { fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

const LIMIT = 15;
const VALID_STATUSES = ['pending', 'quoting', 'quoted', 'approved', 'denied'];

export const load: PageServerLoad = async ({ url, locals }) => {
    const currentUser = locals.user!;
    const status  = url.searchParams.get('status') || 'pending';
    const search  = url.searchParams.get('search') || '';
    const pageNum = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const offset  = (pageNum - 1) * LIMIT;

    const statusFilter = VALID_STATUSES.includes(status) ? status : null;
    const searchParam  = search.trim() || null;

    const [listRes, countRes, statsRes] = await Promise.all([
        pool.query(`
            SELECT
                sl.id,
                sl.list_name,
                sl.list_status,
                sl.priority,
                sl.creation_date,
                sl.created_by,
                sl.client_id,
                c.client_first_name,
                c.client_last_name,
                u.first_name AS creator_first_name,
                u.last_name  AS creator_last_name,
                COUNT(sli.id)::int AS item_count,
                COUNT(DISTINCT q.id)::int AS quote_count,
                COALESCE(SUM(sli.quantity * sli.price), 0)::float AS total_value
            FROM supplies_lists sl
            LEFT JOIN client c   ON c.id       = sl.client_id
            LEFT JOIN users  u   ON u.user_id  = sl.created_by
            LEFT JOIN supplies_list_items sli ON sli.list_id = sl.id
            LEFT JOIN supply_list_quotes  q   ON q.list_id  = sl.id
            WHERE
                ($1::text IS NULL OR sl.list_status = $1)
                AND ($2::text IS NULL
                    OR sl.list_name        ILIKE '%' || $2 || '%'
                    OR c.client_first_name ILIKE '%' || $2 || '%'
                    OR c.client_last_name  ILIKE '%' || $2 || '%')
            GROUP BY sl.id, c.client_first_name, c.client_last_name, u.first_name, u.last_name
            ORDER BY
                CASE sl.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                sl.creation_date DESC
            LIMIT $3 OFFSET $4
        `, [statusFilter, searchParam, LIMIT, offset]),

        pool.query(`
            SELECT COUNT(DISTINCT sl.id)::int AS total
            FROM supplies_lists sl
            LEFT JOIN client c ON c.id = sl.client_id
            WHERE
                ($1::text IS NULL OR sl.list_status = $1)
                AND ($2::text IS NULL
                    OR sl.list_name        ILIKE '%' || $2 || '%'
                    OR c.client_first_name ILIKE '%' || $2 || '%'
                    OR c.client_last_name  ILIKE '%' || $2 || '%')
        `, [statusFilter, searchParam]),

        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE list_status = 'pending' )::int AS pending,
                COUNT(*) FILTER (WHERE list_status = 'quoting' )::int AS quoting,
                COUNT(*) FILTER (WHERE list_status = 'quoted'  )::int AS quoted,
                COUNT(*) FILTER (WHERE list_status = 'approved')::int AS approved,
                COUNT(*) FILTER (WHERE list_status = 'denied'  )::int AS denied
            FROM supplies_lists
        `, []),
    ]);

    return {
        lists: listRes.rows.map(r => ({
            ...r,
            creation_date: (r.creation_date as Date).toISOString(),
        })),
        totalItems:    countRes.rows[0].total,
        stats:         statsRes.rows[0],
        statusFilter:  status,
        search,
        currentPage:   pageNum,
        currentUserId: currentUser.user_id,
        canManageAll:  currentUser.permissions.includes('supplies.manage') || currentUser.is_super_admin,
        canQuote:      currentUser.permissions.includes('supplies.quote')  || currentUser.is_super_admin,
    };
};

export const actions: Actions = {
    delete: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const data   = await request.formData();
        const listId = Number(data.get('id'));
        if (!listId) return fail(400, { error: 'ID inválido.' });

        const check = await pool.query(
            'SELECT list_status, created_by FROM supplies_lists WHERE id = $1',
            [listId]
        );
        if (check.rowCount === 0) return fail(404, { error: 'Lista não encontrada.' });

        const { list_status, created_by } = check.rows[0];
        if (list_status !== 'pending') {
            return fail(403, { error: 'Apenas listas pendentes podem ser excluídas.' });
        }

        const canManage = locals.user.permissions.includes('supplies.manage') || locals.user.is_super_admin;
        if (created_by !== locals.user.user_id && !canManage) {
            return fail(403, { error: 'Você não tem permissão para excluir esta lista.' });
        }

        await pool.query('DELETE FROM supplies_lists WHERE id = $1', [listId]);
        return { success: true };
    },
};
