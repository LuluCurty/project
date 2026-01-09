import { pool } from "$lib/server/db";
import { checkSystemAdmin } from "$lib/server/auth";
import type { PageServerLoad, Actions } from "./$types";
import { redirect, fail, error } from "@sveltejs/kit";

interface PermissionRow {
    id: number
    slug: string;
    description: string;
    module: string | null;
}

interface RoleRow {
    id: number;
    name: string;
}

type RolesMap = Record<number, number[]>;

export const load: PageServerLoad = async ({locals, params}) => {
    checkSystemAdmin(locals.user);

    const userId = Number(params.id);
    if (isNaN(userId)) throw error(404, 'Usuario desonhecido');

    try {
        const client = await pool.connect();
        try {
            // 1. começar pelos dados normais
            const userRes = await client.query(`
                    SELECT user_id, first_name, last_name, email, telphone, role_id, user_role
                    FROM users WHERE user_id=$1
                ;`, [userId]
            );
            if (userRes.rowCount === 0) throw error(404, 'Usuario não encontrado');
            const user = userRes.rows[0];

            // 2. todos os cargos para o select
            const roleRes = await client.query<RoleRow>('SELECT id, name FROM roles ORDER BY name ASC;');

            //3. todas as permissoes
            const allPermsRes = await client.query<PermissionRow>(
                'SELECT id, slug, description, module FROM permissions ORDER BY module ASC;'
            );

            //4. permissioes discretas
            const userPermsRes = await client.query(
                'SELECT permissions_id FROM user_permissions WHERE user_id=$1;',
                [userId]
            );
            const directPermissionsIds = userPermsRes.rows.map((r: { permissions_id: number; }) => r.permissions_id);

            //5. mapa de permissoes por cargo 
            const rolePermsRes = await client.query('SELECT role_id, permissions_id FROM role_permissions');
            
            // Transformamos em um objeto: { 1: [10, 11, 12], 2: [5, 6] }
            const rolePermissionsMap: RolesMap = {};
            rolePermsRes.rows.forEach((row: { role_id: number; permissions_id: number; }) => {
                if (!rolePermissionsMap[row.role_id]) rolePermissionsMap[row.role_id] = [];
                rolePermissionsMap[row.role_id].push(row.permissions_id);
            });

            //agrupar 
            const permissionsByModule = allPermsRes.rows.reduce((acc: { [x: string]: any[]; }, curr: { module: string; }) => {
                const mod = curr.module || 'Geral';
                if (!acc[mod]) acc[mod] = [];
                acc[mod].push(curr);
                return acc;
            }, {} as Record<string, PermissionRow[]>);
            
            return {
                user,
                roles: roleRes.rows,
                permissionsByModule,
                directPermissionsIds,
                rolePermissionsMap
            }
        } finally {
            client.release();
        }
    } catch (e) {
        console.error(e);
        throw error(500, 'Erro ao carregar dados do usuario');
    }
};

export const actions: Actions = {
    default: async ({ request, locals, params}) => {
        checkSystemAdmin(locals.user);

        const userId = Number(params.id);
        const data = await request.formData();

        const first_name = data.get('first_name') as string;
        const last_name = data.get('last_name') as string;
        const email = data.get('email') as string;
        const telphone = data.get('telphone') as string;

        const roleIdRaw = data.get('role_id');
        const roleId = roleIdRaw ? Number(roleIdRaw) : null;

        const directPermissionsIds = data.getAll('permissions').map(id => Number(id));

        if (!first_name || !email) {
            return fail(400, { error: 'Nome e email são obrigatórios', first_name, last_name, email});
        };

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. atualiza o usuario primeiro
            await client.query(`
                    UPDATE users
                    SET first_name = $1, last_name = $2, email = $3, telphone = $4, role_id = $5
                    WHERE user_id = $6
                ;`, [first_name, last_name, email, telphone, roleId, userId]
            );

            //2. atualizar as permissoes diretas (limpar primeiro, depois inserir)
            await client.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);

            if (directPermissionsIds.length > 0) { 
                const values: any[] = [];
                const placeholders: string[] = [];

                directPermissionsIds.forEach((permId, index) => {
                    placeholders.push(`($1, $${index + 2})`); //index começa em 0, 1 já esta sendo usado entao começa no 2
                    values.push(permId);
                });

                await client.query(`
                        INSERT INTO user_permissions (user_id, permissions_id)
                        VALUES ${placeholders.join(', ')}
                    ;`, [userId, ...values]
                );
            }
            await client.query('COMMIT');
        } catch (e:any) {
            await client.query('ROLLBACK');
            console.error(e);
            if (e.code) {
                
            }
            return error(500, 'Erro ao atualizar usuario');
        } finally {
            client.release();
        }

        return { success: true };
    }
};