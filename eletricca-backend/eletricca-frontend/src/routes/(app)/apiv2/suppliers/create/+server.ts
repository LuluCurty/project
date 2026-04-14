import { pool } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /apiv2/suppliers/create
// Body: { supplier_name, supplier_legal_name?, supplier_legal_identifier, supply_id?, price? }
// Creates a supplier and optionally links it to a material (setting as default if first).
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) return json({ error: 'Não autenticado.' }, { status: 401 });

    let body: any;
    try { body = await request.json(); }
    catch { return json({ error: 'Corpo inválido.' }, { status: 400 }); }

    const name      = (body.supplier_name             ?? '').trim();
    const legalName = (body.supplier_legal_name        ?? name).trim() || name;
    const cnpj      = (body.supplier_legal_identifier  ?? '').trim();
    const supplyId  = body.supply_id ? Number(body.supply_id) : null;
    const price     = Number(body.price) || 0;

    if (!name) return json({ error: 'Nome é obrigatório.'  }, { status: 400 });
    if (!cnpj) return json({ error: 'CNPJ é obrigatório.'  }, { status: 400 });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let supplierId: number;
        try {
            const r = await client.query(
                `INSERT INTO supplier (supplier_name, supplier_legal_name, supplier_legal_identifier)
                 VALUES ($1, $2, $3) RETURNING id`,
                [name, legalName, cnpj]
            );
            supplierId = r.rows[0].id;
        } catch (e: any) {
            if (e.code === '23505') {
                await client.query('ROLLBACK');
                return json({ error: 'Este CNPJ já está cadastrado.' }, { status: 409 });
            }
            throw e;
        }

        // Link to material if requested
        if (supplyId) {
            const existing = await client.query(
                'SELECT COUNT(*)::int AS cnt FROM supply_pricing WHERE supply_id=$1',
                [supplyId]
            );
            const isFirst = existing.rows[0].cnt === 0;

            await client.query(
                `INSERT INTO supply_pricing (supply_id, supplier_id, price, is_default)
                 VALUES ($1, $2, $3, $4)`,
                [supplyId, supplierId, price, isFirst]
            );
        }

        await client.query('COMMIT');
        return json({ id: supplierId, supplier_name: name });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        return json({ error: 'Erro ao criar fornecedor.' }, { status: 500 });
    } finally {
        client.release();
    }
};
