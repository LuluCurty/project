import { fail, error, redirect } from "@sveltejs/kit";
import { pool } from "$lib/server/db";
import { checkSystemAdmin, guardAction } from "$lib/server/auth";
import type { PageServerLoad, Actions } from "./$types";

interface PermissionRow {
    id: number;
    slug: string;
    description: string;
    module: string;
}

export const load: PageServerLoad = async ({ locals, params }) => {
    checkSystemAdmin(locals.user);
    const moduleName = decodeURIComponent(params.module);
    try {
        const query = `
            SELECT id, slug, description, module
            FROM permissions
            WHERE module=$1
            ORDER BY slug ASC;
        `;

        const { rows } = await pool.query(query, [moduleName]);

        return {
            moduleName,
            permissions: rows
        };
    } catch (e) {
        console.error(e);
        throw error(500, 'Erro ao carregar permissoes do modulo');
    }
};

export const actions: Actions = {
    create: async ({request, locals, params}) => {
        checkSystemAdmin(locals.user);
        const moduleName = decodeURIComponent(params.module);

        const data = await request.formData();
        const suffix = data.get('suffix') as string;
        const description = data.get('description') as string;

        if(!suffix || !description) return fail(400, 'Preencha todos os campos');

        const slug = `${moduleName}.${suffix}`;

        try {
            await pool.query(`
                INSERT INTO permissions (slug, description, module) VALUES ($1,$2,$3);`,
                [slug, description, moduleName]
            );
        } catch (e) {
            console.error(e);
            return fail(500, {error: 'Erro ao criar permissão'});
        }

    },
    update: async ({request, locals}) => {
        checkSystemAdmin(locals.user);

        const data = await request.formData();
        const id = Number(data.get('id'));
        const slug = data.get('slug') as string;
        const description = data.get('description') as string;

        try{
            await pool.query(
                'UPDATE permissions SET slug=$1, description=$2 WHERE id=$3;', 
                [slug, description, id]
            );
        } catch(e) {
            console.error(e);
            return fail(500, 'Não foi possivel atualizar modulo');
        }
    },
    delete: async ({request, locals}) => {
        checkSystemAdmin(locals.user);
        const data = await request.formData();
        const id = Number(data.get('id'));

        try {
            await pool.query('DELETE FROM permissions WHERE id=$1;', [id]);
        } catch (e) {
            console.error(e);
            return fail(500, {error: 'Erro ao excluir permissão'});
        }
    }
};