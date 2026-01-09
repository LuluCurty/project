import { fail, error, redirect } from "@sveltejs/kit";
import { pool } from "$lib/server/db";
import { checkSystemAdmin } from "$lib/server/auth";
import type { PageServerLoad, Actions } from "./$types";

interface PermissionRow {
    id: number;
    slug: string;
    description: string;
    module: string | null;
}

type PermissionGroup = Record<string, PermissionRow[]>;

export const load: PageServerLoad = async ({ locals, params }) => {
    checkSystemAdmin(locals.user);
    const roleId = Number(params.id);

    if (isNaN(roleId)) throw error(404, 'Cargo não encontrado');

    try {
        // 1. buscar os dados do cargo
        const roleRes = await pool.query('SELECT * FROM roles WHERE id=$1', [roleId]);
        if(roleRes.rowCount === 0)  throw error(404, 'Cargo não encontrado');
        const role = roleRes.rows[0];

        // 2. buscar as ids das permissoes deste cargo
        const currentPermsRes = await pool.query(
            `SELECT permissions_id FROM role_permissions WHERE role_id=$1;`,
            [roleId]
        );
        // preciso de um array simples, mais facil de manipular
        const currentPermissionIds = currentPermsRes.rows.map((row: { permissions_id: number; }) => row.permissions_id);

        // 3. pega todas as permissoes para montar a tabela de atribuicao de permissoes
        const allPermsRes = await pool.query<PermissionRow>(
            'SELECT id, slug, description, module FROM permissions ORDER BY module ASC, slug ASC;'
        );
        // agrupar por modulo (chatgpt)
        const permissionsByModule: PermissionGroup = allPermsRes.rows.reduce((acc: { [x: string]: any[]; }, curr: { module: string; }) => {
            const mod = curr.module || 'Geral';
            if (!acc[mod]) acc[mod] = [];
            acc[mod].push(curr);
            return acc;
        }, {} as PermissionGroup);

        return {
            role,
            currentPermissionIds, // importante
            permissionsByModule
        }

    } catch (e) {
        console.error(e);
        throw fail(500, 'Erro ao carregar dados do cargo');
    }
};

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        checkSystemAdmin(locals.user);
        const roleId = Number(params.id);

        const data = await request.formData();
        const name = data.get('name') as string;
        const description = data.get('description') as string;
        const permissionIds = data.getAll('permissions').map(id => Number(id));

        if (!name) return fail(400, { error: 'Nome é obrigatório', name, description });

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. atualiza os dados basicos
            await client.query(
                'UPDATE roles SET name=$1, description=$2 WHERE id=$3;', 
                [name, description, roleId]
            );
            // 2. o array é pequeno, por enquanto, por isso só vamos limpar e mandar outro array
            await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

            // 3. Inserimos as novas (se houver)
            if (permissionIds.length > 0) {
                const values: any[] = [];
                const placeholders: string[] = [];
                
                permissionIds.forEach((permId, index) => {
                    placeholders.push(`($1, $${index + 2})`); 
                    values.push(permId);
                });

                const insertQuery = `
                    INSERT INTO role_permissions (role_id, permissions_id)
                    VALUES ${placeholders.join(', ')}
                `;
                await client.query(insertQuery, [roleId, ...values]);
            }

            await client.query('COMMIT');
        } catch (e: any) {
            await client.query('ROLLBACK');
            console.error(e);
            if (e.code === '23505') {
                return fail(400, { error: 'Já existe outro cargo com este nome' });
            }
            return fail(500, { error: 'Erro ao atualizar cargo'})
        } finally {
            client.release();
        }
        return { 
            success: true,
            name,
            description
        };
    }
};