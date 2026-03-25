import { redirect, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const filter = url.searchParams.get('filter') || 'all';
    const page   = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit  = 20;
    const offset = (page - 1) * limit;

    const filterCondition =
        filter === 'unread' ? `AND n.is_read = FALSE` :
        filter === 'task'   ? `AND n.type IN ('task_assigned', 'task_completed', 'task_comment')` :
        filter === 'form'   ? `AND n.type IN ('form_assigned', 'form_submitted')` :
        '';

    try {
        const [notifRes, countRes, unreadRes] = await Promise.all([
            pool.query(`
                SELECT id, title, message, type, reference_type, reference_id, is_read, created_at
                FROM notifications n
                WHERE n.user_id = $1 ${filterCondition}
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            `, [user.user_id, limit, offset]),

            pool.query(`
                SELECT COUNT(*) as total
                FROM notifications n
                WHERE n.user_id = $1 ${filterCondition}
            `, [user.user_id]),

            pool.query(
                `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
                [user.user_id]
            )
        ]);

        return {
            notifications: notifRes.rows.map(n => ({
                ...n,
                created_at: n.created_at.toISOString()
            })),
            pagination: {
                page,
                limit,
                totalItems: Number(countRes.rows[0].total),
                totalPages: Math.ceil(Number(countRes.rows[0].total) / limit)
            },
            unreadCount: Number(unreadRes.rows[0].count),
            filter
        };
    } catch (e) {
        console.error('Erro ao carregar notificações:', e);
        return {
            notifications: [],
            pagination: { page: 1, limit, totalItems: 0, totalPages: 0 },
            unreadCount: 0,
            filter
        };
    }
};

export const actions: Actions = {
    markRead: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();
        const id = Number(data.get('id'));
        if (!id) return fail(400);

        await pool.query(
            `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
            [id, user.user_id]
        );
        return { success: true };
    },

    markAllRead: async ({ locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        await pool.query(
            `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
            [user.user_id]
        );
        return { success: true };
    }
};
