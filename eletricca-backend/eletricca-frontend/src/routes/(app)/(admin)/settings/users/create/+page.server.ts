import { fail, redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { checkSystemAdmin } from '$lib/server/auth';
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
    checkSystemAdmin(locals.user);

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
        checkSystemAdmin(locals.user);
        const data = await request.formData();

        const firstName = data.get('first_name') as string;
        const lastName = data.get('last_name') as string;
        const email = data.get('email') as string;
        const password = data.get('password') as string; // Campo novo
        const telphone = data.get('telphone') as string;
        
        const roleIdRaw = data.get('role_id');
        const roleId = roleIdRaw ? Number(roleIdRaw) : null;

        const directPermissionIds = data.getAll('permissions').map(id => Number(id));

        // Validação básica
        if (!firstName || !email || !password) {
            return fail(400, { error: 'Nome, Email e Senha são obrigatórios.', firstName, lastName, email, telphone });
        }

        // const passwordHashed = await hash(password, 10); 
        const passwordHashed = await bcrypt.hash(password, 10);      

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Inserir Usuário
            // user_role 'client' é o padrão do banco, mas podemos forçar ou deixar o default
            const userRes = await client.query(`
                INSERT INTO users (first_name, last_name, email, password_hashed, telphone, role_id, user_role, auth_source)
                VALUES ($1, $2, $3, $4, $5, $6, 'client', 'Local')
                RETURNING user_id
            `, [firstName, lastName, email, passwordHashed, telphone, roleId]);

            const newUserId = userRes.rows[0].user_id;

            // 2. Inserir Permissões Extras (se houver)
            if (directPermissionIds.length > 0) {
                const values: any[] = [];
                const placeholders: string[] = [];
                
                directPermissionIds.forEach((permId, index) => {
                    placeholders.push(`($1, $${index + 2})`); 
                    values.push(permId);
                });

                await client.query(`
                    INSERT INTO user_permissions (user_id, permissions_id)
                    VALUES ${placeholders.join(', ')}
                `, [newUserId, ...values]);
            }

            await client.query('COMMIT');

        } catch (e: any) {
            await client.query('ROLLBACK');
            console.error(e);
            if (e.code === '23505') return fail(400, { error: 'Email já está cadastrado.', firstName, lastName, email, telphone });
            return fail(500, { error: 'Erro ao criar usuário.', firstName, lastName, email, telphone });
        } finally {
            client.release();
        }

        redirect(303, '/settings/users');
    }
};