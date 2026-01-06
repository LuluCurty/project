import type { LayoutServerLoad } from "./$types";
import pool from '../../../db.js';

export const load: LayoutServerLoad = async ({locals}) => {
    const user = locals.user;
    let favorites = [];

    // Se user existir
    if (user) {
        try {
            const query = `
                SELECT id, title, url, is_internal
                FROM user_favorites
                WHERE user_id=$1
                ORDER BY id ASC
            `;
            const { rows } = await pool.query(query, [user.user_id]);
            favorites = rows;

        } catch (e) {
            console.error('Erro ao carregar favoritos (DB SVELTEKIT):', e);
        }
    }

    return {
        user,
        favorites
    }
};