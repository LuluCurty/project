import { fail, redirect } from "@sveltejs/kit";
import { pool } from "$lib/server/db";
import type { PageServerLoad, Actions } from "./$types";
import bcrypt from 'bcrypt';

export const load: PageServerLoad = async ({ locals }) => {
    if(!locals.user) throw redirect(302, '/login');

    const client = await pool.connect();

    try {
        const res = await client.query(`
                SELECT
                    u.user_id, u.first_name, u.last_name, u.email, u.telphone,
                    r.name as role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.user_id=$1
            ;`, 
            [locals.user.user_id]
        );

        if (res.rowCount === 0) throw redirect(302, '/login');

        return {
            profile: res.rows[0]
        };
    } catch (e) {
        console.error(e);
        return fail(500, { error: 'Nenhuma informação encontrada, erro do servidor'});
    } finally {
        client.release();
    }
};

export const actions: Actions = {
    updateInfo: async ({ request, locals }) => {
        const data = await request.formData();

        const firstName = data.get('first_name') as string;
        const lastName = data.get('last_name') as string;
        const telphone = data.get('telphone') as string;

        if (!firstName) {
            return fail(400, { type: 'info', error: 'Nome é obrigatório', firstName, lastName, telphone});
        }

        try {
            await pool.query(`
                    UPDATE users
                    SET first_name = $1, last_name = $2, telphone = $3
                    WHERE id = $4
                `, 
                [firstName, lastName, telphone || null, locals.user!.user_id]
            );

            return {
                type: 'info',
                success: true,
                message: 'Dados atualizados com sucesso'
            }
        } catch (e) {
            console.error(e);
            return fail(500, { type: 'info', error: 'Erro ao atualizar perfil', firstName, lastName, telphone});
        }
    },

    changePassword: async ({request, locals}) => {
        const data = await request.formData();
        const currentPassword = data.get('current_password') as string;
        const newPassword = data.get('new_password') as string;
        const confirmPassword = data.get('confirm_password') as string;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return fail(400, {
                type: 'password',
                error: 'Preenche todos os campos'
            });
        }

        if (newPassword !== confirmPassword ) {
            return fail(400, {
                type: 'password',
                error: 'As novas senhas não confirmam',
            });
        }

        if (newPassword.length < 6) {
            return fail(400, {
                type: 'password',
                error: 'Senha deve ter o minimo de 6 caracteres'
            });
        }
        const client = await pool.connect();
        try {
            const res = await client.query(`
                    SELECT password_hashed FROM users WHERE id = $1
                ;`, 
                [locals.user?.user_id]
            );
            const userHash = res.rows[0].password_hashed;

            const match = await bcrypt.compare(currentPassword, userHash);

            if (!match) {
                return fail(400, {
                    type: 'password',
                    error: 'A senha atual está incorreta'
                });
            }

            const newHash = await bcrypt.hash(newPassword, 10);
            await client.query('UPDATE users SET password = $1 WHERE id = $2;', [newPassword, locals.user?.user_id]);

            return {
                type: 'password',
                success: true,
                message: 'senha alterada com sucesso'
            }
        } catch (e) {
            console.error(e);
            return fail(500, {
                type: 'password',
                error: 'Internal server error'
            });
        } finally {
            client.release();
        }
    }
};