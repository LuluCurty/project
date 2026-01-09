import { fail, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { checkSystemAdmin, guardAction  } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

interface UserData {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    telphone: string | null;
    creation_date: Date;
    role_name: string;
    auth_source: string; 
    user_role: string;
}

export const load: PageServerLoad = async ({locals, url}) => {
    checkSystemAdmin(locals.user);

    const page = Number(url.searchParams.get('page')) || 1;
    const search = url.searchParams.get('search') || '';
    const limit = 10;
    const offset = (page-1) * limit;

    try {
        // contagem total para totalItems
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users u
            WHERE u.first_name ILIKE $1 OR u.last_name ILIKE $1
            OR u.email ILIKE $1
        ;`;
        const countRes = await pool.query(countQuery, [`%${search}%`]);
        const totalItems = Number(countRes.rows[0].total);

        // buscar os usuarios e juntar com os cargos
        // query users + join with roles 
        // u.user_id (PK users) e r.id (PK roles)
        const dataQuery = `
            SELECT
                u.user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.telphone,
                u.creation_date,
                u.user_role,
                r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.first_name ILIKE $1 
                OR u.last_name ILIKE $1
                OR u.email ILIKE $1
            ORDER BY u.user_id DESC
            LIMIT $2 OFFSET $3
        ;`;

        const {rows} = await pool.query<UserData>(dataQuery, [`%${search}%`, limit, offset]);
        return {
            users: rows,
            pagination: {
                totalItems,
                limit, 
                page,
                totalPages: Math.ceil(totalItems/limit)
            }
        }
    } catch (e) {
        console.error(e);
        throw error(500, 'Erro ao carregar usuarios');
    }
    
};

export const actions: Actions = {
    delete: async ({ request, locals }) => {
        checkSystemAdmin(locals.user);

        const data = await request.formData();
        const userId = Number(data.get('id'));

        if (!userId) return fail(400, { error: 'ID invalido'});

        if (userId === 1) {
            return fail(403, { error: 'Não podi' });
        }

        try {
            await pool.query('DELETE FROM users WHERE user_id=$1', [userId]);
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao excluir usuario'});
        }

        return { success: true };
    }
};