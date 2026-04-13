import { fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

const LIMIT = 15;

export const load: PageServerLoad = async ({ url }) => {
    const search  = url.searchParams.get('search') || '';
    const pageNum = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const offset  = (pageNum - 1) * LIMIT;
    const q       = search.trim() || null;

    const [suppRes, countRes] = await Promise.all([
        pool.query(`
            SELECT
                s.id,
                s.supply_name,
                s.quantity,
                s.details,
                sp.price,
                sup.supplier_name
            FROM supplies s
            LEFT JOIN supply_pricing sp  ON sp.supply_id = s.id AND sp.is_default = TRUE
            LEFT JOIN supplier       sup ON sup.id = sp.supplier_id
            WHERE ($1::text IS NULL OR s.supply_name ILIKE '%' || $1 || '%')
            ORDER BY s.supply_name
            LIMIT $2 OFFSET $3
        `, [q, LIMIT, offset]),

        pool.query(`
            SELECT COUNT(*)::int AS total
            FROM supplies s
            WHERE ($1::text IS NULL OR s.supply_name ILIKE '%' || $1 || '%')
        `, [q]),
    ]);

    return {
        supplies:    suppRes.rows,
        totalItems:  countRes.rows[0].total,
        currentPage: pageNum,
        search,
    };
};

export const actions: Actions = {
    delete: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const data = await request.formData();
        const id   = Number(data.get('id'));
        if (!id) return fail(400, { error: 'ID inválido.' });

        try {
            await pool.query('DELETE FROM supplies WHERE id = $1', [id]);
            return { success: true };
        } catch (e: any) {
            if (e.code === '23503') {
                return fail(409, { error: 'Material está em uso em listas e não pode ser excluído.' });
            }
            console.error(e);
            return fail(500, { error: 'Erro ao excluir material.' });
        }
    },
};
