import { pool } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PATCH /api/notifications?id=X  — marca uma notificação como lida
// PATCH /api/notifications        — marca todas como lidas
export const PATCH: RequestHandler = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) return new Response('Unauthorized', { status: 401 });

    const id = url.searchParams.get('id');

    try {
        if (id) {
            await pool.query(
                `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
                [Number(id), user.user_id]
            );
        } else {
            await pool.query(
                `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
                [user.user_id]
            );
        }
        return json({ success: true });
    } catch (e) {
        console.error('Erro ao marcar notificação:', e);
        return json({ success: false }, { status: 500 });
    }
};
