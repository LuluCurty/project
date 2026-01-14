import { fail, redirect } from "@sveltejs/kit";
import { pool } from "$lib/server/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { PageServerLoad, Actions } from "./$types";
import { Buffer } from "buffer";
import { chatEvents } from "$lib/server/events";

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const talkingToId = parseInt(params.userId);

    const res = await pool.query(`
        SELECT * FROM messages
        WHERE (sender_id = $1 AND receiver_id = $2)
           OR (sender_id = $2 AND receiver_id = $1)
        ORDER BY created_at ASC;
    `, [user.user_id, talkingToId]);

    const userRes = await pool.query('SELECT first_name, last_name FROM users WHERE user_id = $1;', [talkingToId]);
    return {
        messages: res.rows,
        talkingTo: userRes.rows[0],
        me: user.user_id
    }
};

export const actions: Actions = {
    send: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();
        const type = data.get('type') as string;
        const receiverId = parseInt(params.userId);

        let content = '';

        if (type === 'text') {
            content = data.get('content') as string;
            if(!content) return fail(400, { error: 'Mensagem vazia'});
        } 
        else if (type === 'image' || type === 'audio') {
            const file = data.get('file') as File;

        /*  console.log('--- DEBUG UPLOAD ---');
            console.log('Nome:', file?.name);
            console.log('Tipo:', file?.type);
            console.log('Tamanho (bytes):', file?.size);*/

            if (!file || file.size === 0) {
                console.error('Erro: Arquivo vazio ou inexisente');
                return fail(400, {error: 'Arquivo inexistente ou vazio'});
            }

            const ext = type === 'audio' ? 'webm' : file.name.split('.').pop();
            const fileName = `${Date.now()}_${user.user_id}.${ext}`;
            const uploadDir = 'static/uploads';

            const filePath = join(process.cwd(), uploadDir, fileName);
            console.log('Tentando salvar em:', filePath);

            try { 
                await mkdir(uploadDir, { recursive: true }); 
            } catch (e) {
                console.error(e);
            };

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await writeFile(filePath, buffer);

            content = `/uploads/${fileName}`;
        }

        const res = await pool.query(`
            INSERT INTO messages (sender_id, receiver_id, content, msg_type) 
            VALUES ($1, $2, $3, $4)
            RETURNING *
        ;`, [user.user_id, receiverId, content, type]);

        const newMessage = res.rows[0];
        const chatKey = [user.user_id, receiverId].sort((a, b) => a - b ).join('-');

        try {
            chatEvents.emit(`message:${chatKey}`, newMessage);
        } catch (e) {
            console.error('Erro ao emitir evento SSE, mas a mensagem foi salva', e);
        }
        return { success: true };
    },

    delete: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();
        const msgId = data.get('id');

        if(!msgId) return fail(400, { error: 'ID invalido'});

        const res = await pool.query(`
                UPDATE messages
                SET is_deleted = TRUE
                WHERE id= $1 AND sender_id = $2
                RETURNING *
            ;`, [msgId, user.user_id]
        );

        if (res.rowCount === 0 ) {
            return fail(403, { error: 'Nao autorizado ou mensagem nao encontrada'});
        }

        const deletedMsg = res.rows[0];

        const receiverId = parseInt(params.userId);

        const chatKey = [user.user_id, receiverId].sort((a, b) => a-b).join('-');

        try {
            chatEvents.emit(`message:${chatKey}`, deletedMsg);
        } catch (e) {
            console.error('Erro SSE:', e);
        }
        return { success: true };
    }
};