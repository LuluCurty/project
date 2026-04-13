import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { Actions } from './$types';

export const actions: Actions = {
    default: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const data = await request.formData();

        const supplier_name             = (data.get('supplier_name')             as string)?.trim();
        const supplier_legal_name       = (data.get('supplier_legal_name')       as string)?.trim();
        const supplier_legal_identifier = (data.get('supplier_legal_identifier') as string)?.trim();
        const supplier_email            = (data.get('supplier_email')            as string)?.trim() || null;
        const supplier_telephone        = (data.get('supplier_telephone')        as string)?.trim() || null;
        const supplier_address          = (data.get('supplier_address')          as string)?.trim() || null;
        const description               = (data.get('description')               as string)?.trim() || null;

        if (!supplier_name)             return fail(400, { error: 'Nome é obrigatório.' });
        if (!supplier_legal_name)       return fail(400, { error: 'Razão Social é obrigatória.' });
        if (!supplier_legal_identifier) return fail(400, { error: 'CNPJ é obrigatório.' });

        try {
            await pool.query(`
                INSERT INTO supplier
                    (supplier_name, supplier_legal_name, supplier_legal_identifier,
                     supplier_email, supplier_telephone, supplier_address, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [supplier_name, supplier_legal_name, supplier_legal_identifier,
                supplier_email, supplier_telephone, supplier_address, description]);
        } catch (e: any) {
            if (e.code === '23505') return fail(409, { error: 'Razão Social ou CNPJ já cadastrado.' });
            console.error(e);
            return fail(500, { error: 'Erro ao criar fornecedor.' });
        }

        redirect(303, '/supplies/suppliers');
    },
};
