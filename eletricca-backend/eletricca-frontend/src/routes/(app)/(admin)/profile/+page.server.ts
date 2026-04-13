import { fail, redirect } from "@sveltejs/kit";
import { pool } from "$lib/server/db";
import type { PageServerLoad, Actions } from "./$types";
import bcrypt from 'bcrypt';
import { s3, BUCKETS } from '$lib/server/storage';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_BANNER_SIZE = 10 * 1024 * 1024;  // 10 MB

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');

    try {
        const res = await pool.query(`
            SELECT
                u.user_id, u.first_name, u.last_name, u.email, u.username,
                u.telphone, u.auth_source,
                r.name as role_name,
                u.avatar_file_id, u.banner_file_id,
                fa.object_key as avatar_key, fa.bucket as avatar_bucket,
                fb.object_key as banner_key, fb.bucket as banner_bucket
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN files fa ON u.avatar_file_id = fa.id
            LEFT JOIN files fb ON u.banner_file_id = fb.id
            WHERE u.user_id = $1
        `, [locals.user.user_id]);

        if (res.rowCount === 0) throw redirect(302, '/login');

        const row = res.rows[0];

        const [avatarUrl, bannerUrl] = await Promise.all([
            row.avatar_key
                ? getSignedUrl(s3, new GetObjectCommand({ Bucket: row.avatar_bucket, Key: row.avatar_key }), { expiresIn: 3600 }).catch(() => null)
                : Promise.resolve(null),
            row.banner_key
                ? getSignedUrl(s3, new GetObjectCommand({ Bucket: row.banner_bucket, Key: row.banner_key }), { expiresIn: 3600 }).catch(() => null)
                : Promise.resolve(null),
        ]);

        return {
            profile: {
                user_id:     row.user_id,
                first_name:  row.first_name,
                last_name:   row.last_name,
                email:       row.email       as string | null,
                username:    row.username    as string | null,
                telphone:    row.telphone,
                auth_source: row.auth_source as string | null,
                role_name:   row.role_name,
                avatar_url:  avatarUrl as string | null,
                banner_url:  bannerUrl as string | null,
            }
        };
    } catch (e: any) {
        if (e.status || e.location) throw e;
        console.error(e);
        return { profile: null };
    }
};

export const actions: Actions = {
    uploadAvatar: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autorizado' });

        const data = await request.formData();
        const file = data.get('file') as File | null;

        if (!file || file.size === 0) return fail(400, { error: 'Nenhum arquivo enviado' });
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) return fail(400, { error: 'Formato inválido. Use JPG, PNG, WEBP ou GIF.' });
        if (file.size > MAX_AVATAR_SIZE) return fail(400, { error: 'Arquivo muito grande. Máximo 5 MB para foto de perfil.' });

        const userId = locals.user.user_id;
        const objectKey = `avatars/${userId}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        try {
            await s3.send(new PutObjectCommand({
                Bucket: BUCKETS.users,
                Key: objectKey,
                Body: buffer,
                ContentType: file.type,
                ContentLength: buffer.byteLength,
            }));

            const existingRes = await pool.query('SELECT avatar_file_id FROM users WHERE user_id = $1', [userId]);
            const existingFileId = existingRes.rows[0]?.avatar_file_id;

            if (existingFileId) {
                await pool.query(
                    'UPDATE files SET original_name = $1, mime_type = $2, file_size = $3 WHERE id = $4',
                    [file.name, file.type, file.size, existingFileId]
                );
            } else {
                const fileRes = await pool.query(`
                    INSERT INTO files (object_key, bucket, original_name, mime_type, file_size, uploaded_by, reference_type, reference_id)
                    VALUES ($1, $2, $3, $4, $5, $6, 'user_avatar', $6) RETURNING id
                `, [objectKey, BUCKETS.users, file.name, file.type, file.size, userId]);

                await pool.query('UPDATE users SET avatar_file_id = $1 WHERE user_id = $2', [fileRes.rows[0].id, userId]);
            }

            return { success: true, message: 'Foto de perfil atualizada!' };
        } catch (e) {
            console.error('Erro ao fazer upload do avatar:', e);
            return fail(500, { error: 'Erro ao salvar foto de perfil' });
        }
    },

    uploadBanner: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autorizado' });

        const data = await request.formData();
        const file = data.get('file') as File | null;

        if (!file || file.size === 0) return fail(400, { error: 'Nenhum arquivo enviado' });
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) return fail(400, { error: 'Formato inválido. Use JPG, PNG, WEBP ou GIF.' });
        if (file.size > MAX_BANNER_SIZE) return fail(400, { error: 'Arquivo muito grande. Máximo 10 MB para banner.' });

        const userId = locals.user.user_id;
        const objectKey = `banners/${userId}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        try {
            await s3.send(new PutObjectCommand({
                Bucket: BUCKETS.users,
                Key: objectKey,
                Body: buffer,
                ContentType: file.type,
                ContentLength: buffer.byteLength,
            }));

            const existingRes = await pool.query('SELECT banner_file_id FROM users WHERE user_id = $1', [userId]);
            const existingFileId = existingRes.rows[0]?.banner_file_id;

            if (existingFileId) {
                await pool.query(
                    'UPDATE files SET original_name = $1, mime_type = $2, file_size = $3 WHERE id = $4',
                    [file.name, file.type, file.size, existingFileId]
                );
            } else {
                const fileRes = await pool.query(`
                    INSERT INTO files (object_key, bucket, original_name, mime_type, file_size, uploaded_by, reference_type, reference_id)
                    VALUES ($1, $2, $3, $4, $5, $6, 'user_banner', $6) RETURNING id
                `, [objectKey, BUCKETS.users, file.name, file.type, file.size, userId]);

                await pool.query('UPDATE users SET banner_file_id = $1 WHERE user_id = $2', [fileRes.rows[0].id, userId]);
            }

            return { success: true, message: 'Banner atualizado!' };
        } catch (e) {
            console.error('Erro ao fazer upload do banner:', e);
            return fail(500, { error: 'Erro ao salvar banner' });
        }
    },

    updateInfo: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { type: 'info', error: 'Não autorizado' });

        const data      = await request.formData();
        const firstName = (data.get('first_name') as string)?.trim();
        const lastName  = (data.get('last_name')  as string)?.trim() || null;
        const telphone  = (data.get('telphone')   as string)?.trim() || null;
        const email     = (data.get('email')      as string)?.trim() || null;
        const username  = (data.get('username')   as string)?.trim() || null;

        if (!firstName) {
            return fail(400, { type: 'info', error: 'Nome é obrigatório' });
        }

        const userId = locals.user.user_id;

        try {
            // Verifica auth_source para aplicar restrições de SSH
            const userRes = await pool.query<{ auth_source: string | null }>(
                'SELECT auth_source FROM users WHERE user_id = $1',
                [userId]
            );
            const isSSH = userRes.rows[0]?.auth_source === 'SSH';

            // Valida unicidade do email (se informado)
            if (email) {
                const emailCheck = await pool.query(
                    'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
                    [email, userId]
                );
                if ((emailCheck.rowCount ?? 0) > 0) {
                    return fail(400, { type: 'info', error: 'Este email já está em uso por outro usuário' });
                }
            }

            // Valida unicidade do username — SSH não pode alterar
            if (!isSSH && username) {
                const usernameCheck = await pool.query(
                    'SELECT user_id FROM users WHERE username = $1 AND user_id != $2',
                    [username, userId]
                );
                if ((usernameCheck.rowCount ?? 0) > 0) {
                    return fail(400, { type: 'info', error: 'Este nome de usuário já está em uso' });
                }
            }

            if (isSSH) {
                // SSH: pode atualizar email, mas não username
                await pool.query(
                    'UPDATE users SET first_name=$1, last_name=$2, telphone=$3, email=$4 WHERE user_id=$5',
                    [firstName, lastName, telphone, email, userId]
                );
            } else {
                // Local: pode atualizar tudo
                await pool.query(
                    'UPDATE users SET first_name=$1, last_name=$2, telphone=$3, email=$4, username=$5 WHERE user_id=$6',
                    [firstName, lastName, telphone, email, username, userId]
                );
            }

            return { type: 'info', success: true, message: 'Dados atualizados com sucesso!' };
        } catch (e) {
            console.error(e);
            return fail(500, { type: 'info', error: 'Erro ao atualizar perfil' });
        }
    },

    changePassword: async ({ request, locals }) => {
        const data = await request.formData();
        const currentPassword = data.get('current_password') as string;
        const newPassword     = data.get('new_password')     as string;
        const confirmPassword = data.get('confirm_password') as string;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return fail(400, { type: 'password', error: 'Preencha todos os campos' });
        }
        if (newPassword !== confirmPassword) {
            return fail(400, { type: 'password', error: 'As novas senhas não conferem' });
        }
        if (newPassword.length < 6) {
            return fail(400, { type: 'password', error: 'Senha deve ter no mínimo 6 caracteres' });
        }

        const client = await pool.connect();
        try {
            const res = await client.query('SELECT password_hashed FROM users WHERE user_id = $1', [locals.user?.user_id]);
            const userHash = res.rows[0]?.password_hashed;
            if (!userHash) return fail(404, { type: 'password', error: 'Usuário não encontrado' });

            const match = await bcrypt.compare(currentPassword, userHash);
            if (!match) return fail(400, { type: 'password', error: 'A senha atual está incorreta' });

            const newHash = await bcrypt.hash(newPassword, 10);
            await client.query('UPDATE users SET password_hashed = $1 WHERE user_id = $2', [newHash, locals.user?.user_id]);

            return { type: 'password', success: true, message: 'Senha alterada com sucesso!' };
        } catch (e) {
            console.error(e);
            return fail(500, { type: 'password', error: 'Erro interno do servidor' });
        } finally {
            client.release();
        }
    }
};
