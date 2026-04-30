import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { createNotificationBulk } from '$lib/server/notifications';
import { supplyLog } from '$lib/server/logger';
import type { Actions } from './$types';

export const actions: Actions = {
    default: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const data = await request.formData();

        const listName    = (data.get('list_name')   as string)?.trim();
        const clientId    =  data.get('client_id');
        const priority    = (data.get('priority')    as string) || 'medium';
        const description = (data.get('description') as string)?.trim() || null;
        const itemsRaw    =  data.get('items')        as string;

        if (!listName) return fail(400, { error: 'Nome da lista é obrigatório.' });
        if (!itemsRaw) return fail(400, { error: 'A lista precisa de pelo menos um item.' });

        // price and supplier_id are now optional — quotes handle pricing
        let items: { supply_id: number; quantity: number; supplier_id?: number | null; price?: number | null }[];
        try {
            items = JSON.parse(itemsRaw);
        } catch {
            return fail(400, { error: 'Dados dos itens inválidos.' });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return fail(400, { error: 'A lista precisa de pelo menos um item.' });
        }

        let listId = 0;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const listRes = await client.query(`
                INSERT INTO supplies_lists (list_name, client_id, created_by, priority, description)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [listName, clientId ? Number(clientId) : null, locals.user.user_id, priority, description]);

            listId = listRes.rows[0].id;

            for (const item of items) {
                await client.query(`
                    INSERT INTO supplies_list_items (list_id, supply_id, supplier_id, quantity, price)
                    VALUES ($1, $2, $3, $4, $5)
                `, [listId, item.supply_id, item.supplier_id ?? null, item.quantity, item.price ?? null]);
            }

            await client.query('COMMIT');
            supplyLog.info({ user_id: locals.user.user_id, list_id: listId, list_name: listName }, 'supply list created');
        } catch (e) {
            await client.query('ROLLBACK');
            supplyLog.error({ err: e, user_id: locals.user.user_id, list_name: listName }, 'failed to create supply list');
            return fail(500, { error: 'Erro ao criar lista.' });
        } finally {
            client.release();
        }

        // Notify quoters and managers about the new list
        try {
            const notifyRes = await pool.query<{ user_id: number }>(`
                SELECT DISTINCT user_id FROM (
                    SELECT u.user_id FROM users u WHERE u.is_super_admin = TRUE
                    UNION
                    SELECT u.user_id FROM users u
                        JOIN role_permissions rp ON rp.role_id = u.role_id
                        JOIN permissions p ON p.id = rp.permissions_id
                        WHERE p.slug IN ('supplies.manage', 'supplies.quote')
                    UNION
                    SELECT up.user_id FROM user_permissions up
                        JOIN permissions p ON p.id = up.permissions_id
                        WHERE p.slug IN ('supplies.manage', 'supplies.quote')
                ) targets
                WHERE user_id != $1
            `, [locals.user.user_id]);

            const ids = notifyRes.rows.map(r => r.user_id);
            if (ids.length > 0) {
                const creatorName = `${locals.user.first_name} ${locals.user.last_name}`;
                await createNotificationBulk(ids, {
                    title: 'Nova lista de materiais criada',
                    message: `${creatorName} criou a lista "${listName}"`,
                    type: 'supply_list_created',
                    referenceType: 'supply_list',
                    referenceId: listId,
                });
            }
        } catch (e) {
            supplyLog.error({ err: e }, 'failed to send supply list creation notifications');
        }

        redirect(303, '/supplies/lists');
    }
};
