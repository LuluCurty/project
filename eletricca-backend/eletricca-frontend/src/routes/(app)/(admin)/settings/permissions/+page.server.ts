import { fail, error } from "@sveltejs/kit";
import { pool } from "$lib/server/db";
import { checkSystemAdmin } from "$lib/server/auth";
import type { PageServerLoad, Actions } from "./$types";

interface ModuleData {
    name: string;
    permission_count: number;
    last_created_at: Date;
}

export const load: PageServerLoad = async ({ locals, url }) => {
    checkSystemAdmin(locals.user);

    const page = Number(url.searchParams.get('page')) || 1;
    const search = url.searchParams.get('search') || '';
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const countQuery = `
            SELECT COUNT(DISTINCT module) as total
            FROM permissions
            WHERE module ILIKE $1
        ;`;

        const countRes = await pool.query(countQuery, [`%${search}%`]);
        const totalItems = Number(countRes.rows[0]?.total || 0);

        const dataQuery = `
            SELECT
                module as name,
                COUNT(id)::int as permission_count,
                MAX(created_at) as last_created_at
            FROM permissions
            WHERE module ILIKE $1
            GROUP BY module
            ORDER BY module ASC
            LIMIT $2 OFFSET $3
        ;`;

        const { rows } = await pool.query(dataQuery, [`%${search}%`, limit, offset]);

        return {
            modules: rows,
            pagination: {
                totalItems,
                limit,
                page,
                totalPages: Math.ceil(totalItems / limit)
            }
        };
    } catch (e) {
        console.error('Error: ', e);
        throw error(500, 'Erro ao carregar módulis');
    }
};

export const actions: Actions = {
    deleteModule: async ({ request, locals }) => {
        checkSystemAdmin(locals.user);

        const data = await request.formData();
        const moduleName = data.get('module_name') as string;

        if (!moduleName) return fail(400, { error: 'Nome invalido' });

        try {
            await pool.query('DELETE FROM permissions WHERE module=$1', [moduleName]);
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'erro ao excluir modulo' })
        }

        return { success: true }
    }
};