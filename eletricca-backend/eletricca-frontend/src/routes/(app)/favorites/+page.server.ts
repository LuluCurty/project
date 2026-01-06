import { fail } from "@sveltejs/kit";
import pool from "../../../../../db";
import type { Actions } from "@sveltejs/kit";

export const load = async () => {
    return {};
};

export const actions: Actions = {
    create: async ({ request, locals}) => {
        if(!locals.user) return fail(401, {error: 'Not authorized'});

        const data = await request.formData();
        const title = data.get('title') as string;
        const url = data.get('url') as string;
        const is_internal = data.get('is_internal') === 'on';

        if (!title || !url) {
            return fail(400, { error: 'Dados incompletos'});
        }

        try {
            await pool.query(
                `INSERT INTO user_favorites (user_id, title, url, is_internal) VALUES ($1, $2, $3, $4)`
                , [locals.user.user_id, title, url, is_internal]
            );
        } catch (error) {
            console.error(error);
            return fail(500, { error: 'Internal server error'});
        }

        return { success: true }
    },
    
    delete: async ({ request, locals }) => {
        if(!locals.user) return fail(401, {error:'Not authorized'});

        const data = await request.formData();
        const id = data.get('id');

        try {
            await pool.query(
                `DELETE FROM user_favorites WHERE id=$1 AND user_id=$2`,
                [id, locals.user.user_id]
            );
        } catch (error) {
            console.error(error);
            return fail(500, { error: 'Internal server error'});
        }
        return { success: true };
    }
};