import { fail, error, redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { checkSystemAdmin } from "$lib/server/auth";
import { pool } from "$lib/server/db";

type PermissionGroup = Record<string, { id: number, slug: string, description: string}[]>;

export const load: PageServerLoad = async ({ locals }) => {
    checkSystemAdmin(locals.user);

    try {
        const query = `
            SELECT id, slug, description, module
            FROM permissions
            ORDER BY module ASC, slug ASC
        ;`;
        const { rows } = await pool.query(query);
        // vamos agrupar os moduloes em { 'mod': [...], ....}
        const permissionsByModule: PermissionGroup = rows.reduce((acc: any, curr: any) => {
            const mod = curr.module || 'Geral';
            if (!acc[mod]) acc[mod] = [];
            acc[mod].push(curr);
            return acc;
        }, {} as PermissionGroup)
        
        return {
            permissionsByModule
        };

    } catch (e) {
        console.error(e);
        throw error(500, 'Erro ao carregar a pagina');
    }
    
};

export const actions: Actions = {
    default: async ({request, locals}) => {
        checkSystemAdmin(locals.user);

        const data = await request.formData();
        const name = data.get('name') as string;
        const description = data.get('description') as string;

        const permissionIds = data.getAll('permissions').map(id => Number(id));
        
        if (!name) {
            return fail(400, { error: 'O nome do cargo é obrigatório', name, description});
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            
            const roleRes = await client.query(`
                INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id
                ;`, 
                [name, description]
            );

            const roleId = roleRes.rows[0].id;

            if (permissionIds.length > 0) {
                const values: any[] = [];
                const placeholders: string[] = [];

                permissionIds.forEach((permId, index) => {
                    placeholders.push(`($1, $${index + 2})`);
                    values.push(permId);
                })

                const insertQuery = `
                    INSERT INTO role_permissions (role_id, permissions_id)
                    VALUES ${placeholders.join(', ')};
                `;
                await client.query(insertQuery, [roleId, ...values]);
            }

            await client.query('COMMIT');
        } catch (e: any) {
            await client.query('ROLLBACK');
            console.error(e);

            if (e.code === '23505') {
                return fail(400, {error: 'Já existe um cargo com este nome.', name, description});
            }
            return fail(500, {error: 'Erro ao salvar o cargo.', name, description});
        } finally {
            client.release();
        }

        redirect(303, '/settings/roles');
    }
};