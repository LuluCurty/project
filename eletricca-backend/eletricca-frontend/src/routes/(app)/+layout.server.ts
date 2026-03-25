import { pool } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

interface Announcement {
    message: string;
    link: string;
}

export const load: LayoutServerLoad = async ({ locals }) => {
    const user = locals.user;

    // 1. Anuncio mais recente
    let announcement: Announcement | null = null;
    try {
        const res = await pool.query(`SELECT message, link FROM announcements ORDER BY id DESC LIMIT 1`);
        announcement = res.rows[0] || null;
    } catch (e) {
        console.error('Erro ao carregar anuncios:', e);
    }

    // 2. Notificacoes do usuario
    let unreadCount = 0;
    let notifications: any[] = [];

    if (user) {
        try {
            const [unreadRes, notifRes] = await Promise.all([
                pool.query(
                    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
                    [user.user_id]
                ),
                pool.query(
                    `SELECT id, title, message, type, reference_type, reference_id, is_read, created_at
                     FROM notifications
                     WHERE user_id = $1
                     ORDER BY created_at DESC
                     LIMIT 10`,
                    [user.user_id]
                )
            ]);

            unreadCount = Number(unreadRes.rows[0].count);
            notifications = notifRes.rows.map((n: any) => ({
                ...n,
                created_at: n.created_at.toISOString()
            }));
        } catch (e) {
            console.error('Erro ao carregar notificacoes:', e);
        }
    }

    return {
        user,
        announcement,
        unreadCount,
        notifications
    };
};
