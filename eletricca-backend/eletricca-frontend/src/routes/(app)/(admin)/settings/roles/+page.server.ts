import { fail, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { checkSystemAdmin, guardAction  } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

// Interface do que o banco vai retornar
interface RoleData {
    id: number;
    name: string;
    description: string | null;
    permissions: string[]; // O array_agg retorna string[]
}

export const load: PageServerLoad = async ({ locals, url }) => {
    // 1. Bloqueia quem não é Super Admin
    checkSystemAdmin(locals.user);

    const page = Number(url.searchParams.get('page')) || 1;
    const search = url.searchParams.get('search') || '';
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const countQuery = `
            SELECT COUNT(*) as total
            FROM roles
            WHERE name ILIKE $1 OR description ILIKE $1
        ;`;
        const countRes = await pool.query(countQuery, [`%${search}%`]);
        const totalItems = Number(countRes.rows[0].total);

        const dataQuery = `
            SELECT 
                r.id, 
                r.name, 
                r.description,
                COALESCE(
                    array_agg(p.slug) FILTER (WHERE p.id IS NOT NULL), 
                    '{}'
                ) as permissions
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permissions_id = p.id
            WHERE r.name ILIKE $1 OR r.description ILIKE $1
            GROUP BY r.id
            ORDER BY r.id ASC
            LIMIT $2 OFFSET $3
        ;`;

        // Executamos a query e tipamos o retorno
        const { rows } = await pool.query<RoleData>(dataQuery, [`%${search}%`, limit, offset]);

        return {
            roles: rows,
            totalItems,
            limit,
            page,
            totalPages: Math.ceil(totalItems / limit)
        };

    } catch (e) {
        console.error(e);
        throw error(500, 'Erro ao carregar lista de cargos.');
    }
};

export const actions: Actions = {
    delete: async ({ request, route,locals }) => {
        guardAction(route.id, locals.user, 'delete');
        checkSystemAdmin(locals.user);
        
        const data = await request.formData();
        const id = Number(data.get('id'));

        if (!id) return fail(400, { error: 'ID inválido.' });

        // Proteção para não deletar o cargo Super Admin (ID 1)
        if (id === 1) {
            return fail(400, { error: 'O cargo Super Admin não pode ser excluído.' });
        }

        try {
            await pool.query('DELETE FROM roles WHERE id = $1', [id]);
        } catch (e: any) {
            console.error(e);
            // Erro 23503: Violação de chave estrangeira (tem usuários usando esse cargo)
            if (e.code === '23503') {
                return fail(400, { error: 'Não é possível excluir: existem usuários com este cargo.' });
            }
            return fail(500, { error: 'Erro ao excluir cargo.' });
        }

        return { success: true };
    }
};