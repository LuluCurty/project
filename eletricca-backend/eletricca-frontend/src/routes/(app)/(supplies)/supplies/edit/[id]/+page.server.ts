import { fail, redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const id = Number(params.id);
    if (isNaN(id)) throw error(404, 'Material não encontrado.');

    const [supplyRes, pricingRes, suppliersRes] = await Promise.all([
        pool.query(
            'SELECT id, supply_name, quantity, details FROM supplies WHERE id = $1',
            [id]
        ),
        pool.query(`
            SELECT sp.supplier_id, sp.price, sp.is_default, sup.supplier_name
            FROM supply_pricing sp
            JOIN supplier sup ON sup.id = sp.supplier_id
            WHERE sp.supply_id = $1
            ORDER BY sp.is_default DESC, sup.supplier_name
        `, [id]),
        pool.query('SELECT id, supplier_name FROM supplier ORDER BY supplier_name'),
    ]);

    if (supplyRes.rowCount === 0) throw error(404, 'Material não encontrado.');

    return {
        supply:    supplyRes.rows[0],
        pricing:   pricingRes.rows.map(r => ({ ...r, price: Number(r.price) })),
        suppliers: suppliersRes.rows,
    };
};

export const actions: Actions = {
    // Atualiza dados básicos (nome, quantidade, detalhes)
    update: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const id = Number(params.id);
        const data = await request.formData();

        const supply_name = (data.get('supply_name') as string)?.trim();
        const quantity    = Number(data.get('quantity') || 0);
        const details     = (data.get('details') as string)?.trim() || null;

        if (!supply_name) return fail(400, { error: 'Nome é obrigatório.' });

        await pool.query(
            'UPDATE supplies SET supply_name=$1, quantity=$2, details=$3 WHERE id=$4',
            [supply_name, quantity, details, id]
        );
        return { success: true, action: 'update' };
    },

    // Vincula novo fornecedor + preço
    addPricing: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const id = Number(params.id);
        const data = await request.formData();
        const supplier_id = Number(data.get('supplier_id'));
        const price       = Number(data.get('price') || 0);

        if (!supplier_id) return fail(400, { error: 'Selecione um fornecedor.' });

        try {
            // Se não houver nenhum preço ainda, define como padrão automaticamente
            const existing = await pool.query(
                'SELECT COUNT(*)::int AS cnt FROM supply_pricing WHERE supply_id=$1', [id]
            );
            const isFirst = existing.rows[0].cnt === 0;

            await pool.query(
                `INSERT INTO supply_pricing (supply_id, supplier_id, price, is_default)
                 VALUES ($1, $2, $3, $4)`,
                [id, supplier_id, price, isFirst]
            );
        } catch (e: any) {
            if (e.code === '23505') return fail(409, { error: 'Este fornecedor já está vinculado.' });
            console.error(e);
            return fail(500, { error: 'Erro ao vincular fornecedor.' });
        }
        return { success: true, action: 'addPricing' };
    },

    // Remove vínculo fornecedor
    removePricing: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const id = Number(params.id);
        const data = await request.formData();
        const supplier_id = Number(data.get('supplier_id'));

        await pool.query(
            'DELETE FROM supply_pricing WHERE supply_id=$1 AND supplier_id=$2',
            [id, supplier_id]
        );
        return { success: true, action: 'removePricing' };
    },

    // Define fornecedor padrão
    setDefault: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const id = Number(params.id);
        const data = await request.formData();
        const supplier_id = Number(data.get('supplier_id'));

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                'UPDATE supply_pricing SET is_default=FALSE WHERE supply_id=$1', [id]
            );
            await client.query(
                'UPDATE supply_pricing SET is_default=TRUE WHERE supply_id=$1 AND supplier_id=$2',
                [id, supplier_id]
            );
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Erro ao definir padrão.' });
        } finally {
            client.release();
        }
        return { success: true, action: 'setDefault' };
    },
};
