import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';
import { guardAction } from '$lib/server/auth';
import { supplyLog } from '$lib/server/logger';


export const load: PageServerLoad = async ({locals, route}) => {
    guardAction(route.id, locals.user, 'create');
    return {};
};

export const actions: Actions = {
    default: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'create')

        const data        = await request.formData();
        const supply_name = (data.get('supply_name') as string)?.trim();
        const quantity    = Number(data.get('quantity') || 0);
        const details     = (data.get('details') as string)?.trim() || null;
        const price       = data.get('price') ? Number(data.get('price')) : 0;

        // Existing supplier
        const supplier_id = data.get('supplier_id') ? Number(data.get('supplier_id')) : null;

        // New supplier fields
        const newSupplierName  = (data.get('new_supplier_name') as string)?.trim() || null;
        const newSupplierLegal = (data.get('new_supplier_legal_name') as string)?.trim() || null;
        const newSupplierCnpj  = (data.get('new_supplier_cnpj') as string)?.trim() || null;

        if (!supply_name) return fail(400, { error: 'Nome do material é obrigatório.' });

        if (newSupplierName && !newSupplierCnpj) {
            return fail(400, { error: 'CNPJ é obrigatório para criar um novo fornecedor.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const res = await client.query(
                `INSERT INTO supplies (supply_name, quantity, details)
                 VALUES ($1, $2, $3) RETURNING id`,
                [supply_name, quantity, details]
            );
            const supplyId = res.rows[0].id;

            let finalSupplierId = supplier_id;

            // Create new supplier if requested
            if (newSupplierName && newSupplierCnpj) {
                const legalName = newSupplierLegal || newSupplierName;
                try {
                    const suppRes = await client.query(
                        `INSERT INTO supplier (supplier_name, supplier_legal_name, supplier_legal_identifier)
                         VALUES ($1, $2, $3) RETURNING id`,
                        [newSupplierName, legalName, newSupplierCnpj]
                    );
                    finalSupplierId = suppRes.rows[0].id;
                } catch (e: any) {
                    if (e.code === '23505') {
                        await client.query('ROLLBACK');
                        return fail(409, { error: 'Este CNPJ já está cadastrado. Busque o fornecedor existente.' });
                    }
                    throw e;
                }
            }

            if (finalSupplierId) {
                await client.query(
                    `INSERT INTO supply_pricing (supply_id, supplier_id, price, is_default)
                     VALUES ($1, $2, $3, TRUE)`,
                    [supplyId, finalSupplierId, price]
                );
            }

            await client.query('COMMIT');
            supplyLog.info({ user_id: locals.user!.user_id, supply_name }, 'supply created');
        } catch (e) {
            await client.query('ROLLBACK');
            supplyLog.error({ err: e, user_id: locals.user!.user_id, supply_name }, 'failed to create supply');
            return fail(500, { error: 'Erro ao criar material.' });
        } finally {
            client.release();
        }

        redirect(303, '/supplies');
    },
};
