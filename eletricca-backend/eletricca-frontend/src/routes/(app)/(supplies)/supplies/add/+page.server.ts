import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
    const res = await pool.query(
        'SELECT id, supplier_name FROM supplier ORDER BY supplier_name'
    );
    return { suppliers: res.rows };
};

export const actions: Actions = {
    default: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const data        = await request.formData();
        const supply_name = (data.get('supply_name') as string)?.trim();
        const quantity    = Number(data.get('quantity') || 0);
        const details     = (data.get('details') as string)?.trim() || null;
        const supplier_id = data.get('supplier_id') ? Number(data.get('supplier_id')) : null;
        const price       = data.get('price') ? Number(data.get('price')) : 0;

        if (!supply_name) return fail(400, { error: 'Nome do material é obrigatório.' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const res = await client.query(
                `INSERT INTO supplies (supply_name, quantity, details)
                 VALUES ($1, $2, $3) RETURNING id`,
                [supply_name, quantity, details]
            );
            const supplyId = res.rows[0].id;

            if (supplier_id) {
                await client.query(
                    `INSERT INTO supply_pricing (supply_id, supplier_id, price, is_default)
                     VALUES ($1, $2, $3, TRUE)`,
                    [supplyId, supplier_id, price]
                );
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Erro ao criar material.' });
        } finally {
            client.release();
        }

        redirect(303, '/supplies');
    },
};
