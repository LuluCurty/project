import { fail } from "@sveltejs/kit";
import { pool } from "$lib/server/db";
import { guardAction } from "$lib/server/auth";
import type { PageServerLoad, Actions } from "../$types";


export const load: PageServerLoad = async ({ locals, route }) => {
    guardAction(route.id, locals.user, 'announce');

    try {
        const res = await pool.query(`
                SELECT id, message, link, updated_at
                FROM announcements
                ORDER BY id DESC
                LIMIT 1
            ;`
        );

        return {
            announcement: res.rows[0] || null
        }
    } catch (e) {
        console.error(e);
        return {
            announcement: null
        }
    }
};

export const actions: Actions = {
    save: async ({request, locals, route}) => {
        guardAction(route.id, locals.user, 'announce');

        const data = await request.formData();

        const message = data.get('message') as string;
        const link = data.get('link') as string;

        if (!message || message.trim().length === 0) {
            return fail(400, { error: 'A mensagem não pode estar vazia', message});
        }

        const client = await pool.connect();

        try {
            const checkRes = await client.query<{ id: number }>('SELECT id FROM announcements ORDER BY id DESC LIMIT 1');

            if ((checkRes.rowCount ?? 0) > 0) {
                const id: number = checkRes.rows[0].id;
                await client.query(`
                        UPDATE announcements
                        SET message=$1, link=$2, updated_at=NOW()
                        WHERE id=$3
                    ;`, 
                    [message, link || null, id]
                );

            } else {
                await client.query(`
                    INSERT INTO announcements (message, link)
                    VALUES ($1, $2)
                    ;`,
                    [message, link || null]
                );
            }
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao salvar anuncio!', message, link});
        } finally {
            client.release();
        }
    },

    delete: async ({ locals, route }) => {
        guardAction(route.id, locals.user, 'announce');

        try {
            await pool.query('DELETE FROM announcements');
        } catch (e) {
            return fail(500, {error: 'Erro ao remover anuncio'});
        }

        return { success: true };
    }
};