import { fail, redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

import { guardAction } from '$lib/server/auth';

export const load: PageServerLoad = async ({ params, route, locals }) => {
    guardAction(route.id, locals.user, 'manage');

    const id = Number(params.id);
    if (isNaN(id)) throw error(404, 'Fornecedor não encontrado.');

    const res = await pool.query(`
        SELECT id, supplier_name, supplier_legal_name, supplier_legal_identifier,
               supplier_email, supplier_telephone, supplier_address, description, pdf_parser
        FROM supplier WHERE id = $1
    `, [id]);

    if (res.rowCount === 0) throw error(404, 'Fornecedor não encontrado.');

    return { supplier: res.rows[0] };
};

export const actions: Actions = {
    default: async ({ request, locals, params, route }) => {
        guardAction(route.id, locals.user, 'manage');

        const id = Number(params.id);
        if (isNaN(id)) return fail(400, { error: 'ID inválido.' });

        const data = await request.formData();

        const supplier_name             = (data.get('supplier_name')             as string)?.trim();
        const supplier_legal_name       = (data.get('supplier_legal_name')       as string)?.trim();
        const supplier_legal_identifier = (data.get('supplier_legal_identifier') as string)?.trim();
        const supplier_email            = (data.get('supplier_email')            as string)?.trim() || null;
        const supplier_telephone        = (data.get('supplier_telephone')        as string)?.trim() || null;
        const supplier_address          = (data.get('supplier_address')          as string)?.trim() || null;
        const description               = (data.get('description')               as string)?.trim() || null;
        const pdf_parser                = (data.get('pdf_parser')                as string)?.trim() || null;

        if (!supplier_name)             return fail(400, { error: 'Nome é obrigatório.' });
        if (!supplier_legal_name)       return fail(400, { error: 'Razão Social é obrigatória.' });
        if (!supplier_legal_identifier) return fail(400, { error: 'CNPJ é obrigatório.' });

        try {
            await pool.query(`
                UPDATE supplier SET
                    supplier_name             = $1,
                    supplier_legal_name       = $2,
                    supplier_legal_identifier = $3,
                    supplier_email            = $4,
                    supplier_telephone        = $5,
                    supplier_address          = $6,
                    description               = $7,
                    pdf_parser                = $8
                WHERE id = $9
            `, [supplier_name, supplier_legal_name, supplier_legal_identifier,
                supplier_email, supplier_telephone, supplier_address, description, pdf_parser, id]);
        } catch (e: any) {
            if (e.code === '23505') return fail(409, { error: 'Razão Social ou CNPJ já cadastrado.' });
            console.error(e);
            return fail(500, { error: 'Erro ao atualizar fornecedor.' });
        }

        redirect(303, '/supplies/suppliers');
    },
};
