import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

interface Users {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    role_name: string;
}

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const query = `
        SELECT 
            u.user_id, 
            u.first_name, 
            u.last_name, 
            u.email, 
            u.user_role, 
            u.role_id,
            r.name as role_name
        FROM users u 
        LEFT JOIN roles r on u.role_id = r.id
        WHERE u.user_id != $1
        ORDER BY first_name ASC
    `;

    try {
        const res = await pool.query<Users>(query, [user.user_id]);
        return {
            users: res.rows
        };
    } catch (e) {
        console.error("Erro ao carregar contatos:", e);
        return { users: [] };
    }
};