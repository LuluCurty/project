import { fail, redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAdminModule } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';
import bcrypt from 'bcrypt';

interface PermissionRow {
    id: number;
    slug: string;
    description: string;
    module: string | null;
}

interface RoleRow {
    id: number;
    name: string;
}

type PermissionsGroup = Record<string, PermissionRow[]>;

type RolesMap = Record<number, number[]>;

export const load: PageServerLoad = async ({ locals }) => {

    try {
        const client = await pool.connect();
        try {
            // 1. Todas as Roles (para o Select)
            const rolesRes = await client.query<RoleRow>('SELECT id, name FROM roles ORDER BY name ASC');
            
            // 2. Todas as Permissões (para a lista)
            const allPermsRes = await client.query<PermissionRow>(
                'SELECT id, slug, description, module FROM permissions ORDER BY module ASC, slug ASC'
            );

            // 3. Mapa de Permissões por Cargo (Para lógica visual de herança)
            const rolePermsRes = await client.query('SELECT role_id, permissions_id FROM role_permissions');
            
            const rolePermissionsMap: RolesMap = {};
            rolePermsRes.rows.forEach((row: { role_id: number | number; permissions_id: number; }) => {
                if (!rolePermissionsMap[row.role_id]) rolePermissionsMap[row.role_id] = [];
                rolePermissionsMap[row.role_id].push(row.permissions_id);
            });

            // Agrupamento visual
            const permissionsByModule: PermissionsGroup = allPermsRes.rows.reduce((acc, curr) => {
                const mod = curr.module || 'Geral';
                if (!acc[mod]) acc[mod] = [];
                acc[mod].push(curr);
                return acc;
            }, {} as PermissionsGroup);
            
            return {
                roles: rolesRes.rows,
                permissionsByModule,
                rolePermissionsMap
            };

        } finally {
            client.release();
        }
    } catch (e) {
        console.error(e);
        throw error(500, 'Erro ao carregar dados para cadastro.');
    }
};

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const data = await request.formData();

        const firstName = (data.get('first_name') as string)?.trim();
        const lastName  = (data.get('last_name')  as string)?.trim() || null;
        const email     = (data.get('email')      as string)?.trim() || null;
        const username  = (data.get('username')   as string)?.trim() || null;
        const password  = data.get('password') as string;
        const telphone  = (data.get('telphone')   as string)?.trim() || null;

        const roleIdRaw = data.get('role_id');
        const roleId = roleIdRaw ? Number(roleIdRaw) : null;

        const directPermissionIds = data.getAll('permissions').map(id => Number(id));

        // Validação básica
        if (!firstName || !password) {
            return fail(400, { error: 'Nome e Senha são obrigatórios.', firstName, lastName, email, username, telphone });
        }
        if (!email && !username) {
            return fail(400, { error: 'Informe pelo menos um Email ou Nome de Usuário.', firstName, lastName, email, username, telphone });
        }

        const passwordHashed = await bcrypt.hash(password, 10);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Inserir Usuário
            const userRes = await client.query(`
                INSERT INTO users (first_name, last_name, email, username, password_hashed, telphone, role_id, user_role, auth_source)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'client', 'LOCAL')
                RETURNING user_id
            `, [firstName, lastName, email, username, passwordHashed, telphone, roleId]);

            const newUserId = userRes.rows[0].user_id;

            // 2. Inserir Permissões Extras (se houver)
            if (directPermissionIds.length > 0) {
                const placeholders = directPermissionIds.map((_, i) => `($1, $${i + 2})`).join(', ');
                await client.query(`
                    INSERT INTO user_permissions (user_id, permissions_id) VALUES ${placeholders}
                `, [newUserId, ...directPermissionIds]);
            }

            await client.query('COMMIT');

        } catch (e: any) {
            await client.query('ROLLBACK');
            console.error(e);
            if (e.code === '23505') {
                const detail = e.detail ?? '';
                const field  = detail.includes('username') ? 'Nome de usuário' : 'Email';
                return fail(400, { error: `${field} já está em uso.`, firstName, lastName, email, username, telphone });
            }
            return fail(500, { error: 'Erro ao criar usuário.', firstName, lastName, email, username, telphone });
        } finally {
            client.release();
        }

        redirect(303, '/settings/users');
    }
};