import { pool } from '$lib/server/db';
import { notificationEvents } from '$lib/server/events';

export type NotificationType =
    | 'info'
    | 'task_assigned'
    | 'task_completed'
    | 'task_comment'
    | 'form_assigned'
    | 'form_submitted'
    | 'supply_list_created'
    | 'supply_list_updated'
    | 'system';

export interface CreateNotificationParams {
    userId: number;
    title: string;
    message?: string;
    type?: NotificationType;
    referenceType?: string;
    referenceId?: number;
}

/**
 * Insere uma notificação no banco e emite evento SSE para o usuário.
 * Sempre usa pool diretamente — chame APÓS o commit da transação principal.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
    const { userId, title, message, type = 'info', referenceType, referenceId } = params;

    try {
        const res = await pool.query(`
            INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, title, message, type, reference_type, reference_id, is_read, created_at
        `, [userId, title, message ?? null, type, referenceType ?? null, referenceId ?? null]);

        const notification = {
            ...res.rows[0],
            created_at: res.rows[0].created_at.toISOString()
        };

        notificationEvents.emit(`notification:${userId}`, notification);
    } catch (e) {
        console.error('Erro ao criar notificação:', e);
    }
}

/**
 * Cria notificações para múltiplos usuários ao mesmo tempo.
 */
export async function createNotificationBulk(
    userIds: number[],
    params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
    await Promise.all(userIds.map(userId => createNotification({ ...params, userId })));
}
