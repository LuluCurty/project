import { pool } from "$lib/server/db";
import { guardAction } from "$lib/server/auth";
import { s3, BUCKETS } from "$lib/server/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { PageServerLoad, Actions } from "./$types";
import { redirect, fail, error } from "@sveltejs/kit";

interface PermissionRow {
    id: number;
    slug: string;
    description: string;
    module: string | null;
}
interface RoleRow { id: number; name: string; }
type RolesMap = Record<number, number[]>;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_AVATAR_SIZE = 5  * 1024 * 1024;
const MAX_BANNER_SIZE = 10 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals, params }) => {

    const userId = Number(params.id);
    if (isNaN(userId)) throw error(404, 'Usuário desconhecido');

    const client = await pool.connect();
    try {
        const [userRes, roleRes, allPermsRes, userPermsRes, rolePermsRes] = await Promise.all([
            client.query(`
                SELECT u.user_id, u.first_name, u.last_name, u.email, u.username,
                       u.telphone, u.auth_source,
                       u.role_id, u.user_role, u.avatar_file_id, u.banner_file_id,
                       r.name as role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.user_id = $1
            `, [userId]),
            client.query<RoleRow>('SELECT id, name FROM roles ORDER BY name ASC'),
            client.query<PermissionRow>('SELECT id, slug, description, module FROM permissions ORDER BY module ASC'),
            client.query('SELECT permissions_id FROM user_permissions WHERE user_id = $1', [userId]),
            client.query('SELECT role_id, permissions_id FROM role_permissions'),
        ]);

        if (userRes.rowCount === 0) throw error(404, 'Usuário não encontrado');

        const row = userRes.rows[0];

        const rolePermissionsMap: RolesMap = {};
        rolePermsRes.rows.forEach((r: { role_id: number; permissions_id: number }) => {
            if (!rolePermissionsMap[r.role_id]) rolePermissionsMap[r.role_id] = [];
            rolePermissionsMap[r.role_id].push(r.permissions_id);
        });

        const permissionsByModule = allPermsRes.rows.reduce((acc, curr) => {
            const mod = curr.module || 'Geral';
            if (!acc[mod]) acc[mod] = [];
            acc[mod].push(curr);
            return acc;
        }, {} as Record<string, PermissionRow[]>);

        return {
            user: {
                ...row,
                avatar_url: row.avatar_file_id ? `/apiv2/files/${row.avatar_file_id}` : null,
                banner_url: row.banner_file_id ? `/apiv2/files/${row.banner_file_id}` : null,
            },
            roles:              roleRes.rows,
            permissionsByModule,
            directPermissionsIds: userPermsRes.rows.map((r: { permissions_id: number }) => r.permissions_id),
            rolePermissionsMap,
        };
    } catch (e: any) {
        if (e.status) throw e;
        console.error(e);
        throw error(500, 'Erro ao carregar dados do usuário');
    } finally {
        client.release();
    }
};

export const actions: Actions = {
    uploadAvatar: async ({ request, locals, params }) => {

        const userId = Number(params.id);

        const data = await request.formData();
        const file = data.get('file') as File | null;

        if (!file || file.size === 0) return fail(400, { error: 'Nenhum arquivo enviado' });
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) return fail(400, { error: 'Formato inválido. Use JPG, PNG, WEBP ou GIF.' });
        if (file.size > MAX_AVATAR_SIZE) return fail(400, { error: 'Máximo 5 MB para foto de perfil.' });

        const objectKey = `avatars/${userId}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        try {
            await s3.send(new PutObjectCommand({
                Bucket: BUCKETS.users, Key: objectKey,
                Body: buffer, ContentType: file.type, ContentLength: buffer.byteLength,
            }));

            const existingRes = await pool.query('SELECT avatar_file_id FROM users WHERE user_id = $1', [userId]);
            const existingId  = existingRes.rows[0]?.avatar_file_id;

            if (existingId) {
                await pool.query(
                    'UPDATE files SET original_name=$1, mime_type=$2, file_size=$3 WHERE id=$4',
                    [file.name, file.type, file.size, existingId]
                );
            } else {
                const f = await pool.query(`
                    INSERT INTO files (object_key, bucket, original_name, mime_type, file_size, uploaded_by, reference_type, reference_id)
                    VALUES ($1,$2,$3,$4,$5,$6,'user_avatar',$6) RETURNING id
                `, [objectKey, BUCKETS.users, file.name, file.type, file.size, locals.user!.user_id]);
                await pool.query('UPDATE users SET avatar_file_id=$1 WHERE user_id=$2', [f.rows[0].id, userId]);
            }

            return { success: true, message: 'Foto de perfil atualizada!' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao salvar foto de perfil' });
        }
    },

    uploadBanner: async ({ request, locals, params }) => {

        const userId = Number(params.id);

        const data = await request.formData();
        const file = data.get('file') as File | null;

        if (!file || file.size === 0) return fail(400, { error: 'Nenhum arquivo enviado' });
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) return fail(400, { error: 'Formato inválido. Use JPG, PNG, WEBP ou GIF.' });
        if (file.size > MAX_BANNER_SIZE) return fail(400, { error: 'Máximo 10 MB para banner.' });

        const objectKey = `banners/${userId}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        try {
            await s3.send(new PutObjectCommand({
                Bucket: BUCKETS.users, Key: objectKey,
                Body: buffer, ContentType: file.type, ContentLength: buffer.byteLength,
            }));

            const existingRes = await pool.query('SELECT banner_file_id FROM users WHERE user_id = $1', [userId]);
            const existingId  = existingRes.rows[0]?.banner_file_id;

            if (existingId) {
                await pool.query(
                    'UPDATE files SET original_name=$1, mime_type=$2, file_size=$3 WHERE id=$4',
                    [file.name, file.type, file.size, existingId]
                );
            } else {
                const f = await pool.query(`
                    INSERT INTO files (object_key, bucket, original_name, mime_type, file_size, uploaded_by, reference_type, reference_id)
                    VALUES ($1,$2,$3,$4,$5,$6,'user_banner',$7) RETURNING id
                `, [objectKey, BUCKETS.users, file.name, file.type, file.size, locals.user!.user_id, userId]);
                await pool.query('UPDATE users SET banner_file_id=$1 WHERE user_id=$2', [f.rows[0].id, userId]);
            }

            return { success: true, message: 'Banner atualizado!' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao salvar banner' });
        }
    },

    updateInfo: async ({ request, locals, params }) => {

        const userId = Number(params.id);
        const data = await request.formData();

        const first_name = (data.get('first_name') as string)?.trim();
        const last_name  = (data.get('last_name')  as string)?.trim() || null;
        const email      = (data.get('email')      as string)?.trim() || null;
        const username   = (data.get('username')   as string)?.trim() || null;
        const telphone   = (data.get('telphone')   as string)?.trim() || null;
        const roleIdRaw  = data.get('role_id');
        const roleId     = roleIdRaw ? Number(roleIdRaw) : null;

        if (!first_name) {
            return fail(400, { error: 'Nome é obrigatório' });
        }
        if (!email && !username) {
            return fail(400, { error: 'Informe pelo menos um email ou nome de usuário' });
        }

        try {
            // Valida unicidade do email
            if (email) {
                const emailCheck = await pool.query(
                    'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
                    [email, userId]
                );
                if ((emailCheck.rowCount ?? 0) > 0) {
                    return fail(400, { error: 'Este email já está em uso por outro usuário' });
                }
            }

            // Valida unicidade do username
            if (username) {
                const usernameCheck = await pool.query(
                    'SELECT user_id FROM users WHERE username = $1 AND user_id != $2',
                    [username, userId]
                );
                if ((usernameCheck.rowCount ?? 0) > 0) {
                    return fail(400, { error: 'Este nome de usuário já está em uso' });
                }
            }

            await pool.query(
                'UPDATE users SET first_name=$1, last_name=$2, email=$3, username=$4, telphone=$5, role_id=$6 WHERE user_id=$7',
                [first_name, last_name, email, username, telphone, roleId, userId]
            );
            return { success: true, message: 'Dados atualizados!' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao atualizar usuário' });
        }
    },

    updatePermissions: async ({ request, locals, params }) => {

        const userId = Number(params.id);
        const data = await request.formData();

        const directPermissionsIds = data.getAll('permissions').map(id => Number(id));

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM user_permissions WHERE user_id=$1', [userId]);

            if (directPermissionsIds.length > 0) {
                const placeholders = directPermissionsIds.map((_, i) => `($1, $${i + 2})`).join(', ');
                await client.query(
                    `INSERT INTO user_permissions (user_id, permissions_id) VALUES ${placeholders}`,
                    [userId, ...directPermissionsIds]
                );
            }
            await client.query('COMMIT');
            return { success: true, message: 'Permissões salvas!' };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Erro ao salvar permissões' });
        } finally {
            client.release();
        }
    },
};
