import { pool } from "$lib/server/db";
import path from "node:path";
import fs from 'node:fs';
import { checkSystemAdmin } from "$lib/server/auth";
import type { PageServerLoad, Actions } from "./$types";
import { fail, error, redirect } from "@sveltejs/kit";

interface ModuleRow {
    module: string;
};

export const load: PageServerLoad = async () => {
// 1. vamos ver se existr novos modulos (definido por routeGroup(moduleName))
// raiz: ___raiz do projeto/sveltekit___/src/routes/(app)
    const routesPath = path.join(process.cwd(), 'src', 'routes', '(app)');
    
    let detectedModules: string[] =[]

    // vamos verificar antes pra evitar problemas
    if (fs.existsSync(routesPath)) {
        const items = fs.readdirSync(routesPath, { withFileTypes: true });

        detectedModules = items
            .filter(item => item.isDirectory() && item.name.startsWith('(') && item.name.endsWith(')'))
            .map(item => item.name.slice(1, -1));
    }
    // vamos buscar os que já existem dentro do db
    const dbRes = await pool.query<ModuleRow>('SELECT DISTINCT module FROM permissions');
    const registeredModules = dbRes.rows.map((row: {module:string}) => row.module);
    // queremos os que tem na pasta, mas nao existem no db!!!
    const newModules = detectedModules.filter(mod => !registeredModules.includes(mod))

    return {
        newModules: newModules,
        registeredCount: registeredModules.length
    }
};

export const actions: Actions = {
    createStandard: async ({request, locals}) => {
        checkSystemAdmin(locals.user);
        const data = await request.formData();
        const moduleName = data.get('module_name') as string;

        if (!moduleName) return fail(400, {error: 'Nome do módulo é inválido'});

        const standardPerms = [
            { sufix: 'view', desc: `Visualizar ${moduleName}`},
            { sufix: 'create', desc: `Criar registros em ${moduleName}`},
            { sufix: 'edit', desc: `Editar registros em ${moduleName}`},
            { sufix: 'delete', desc: `Excluir registros em ${moduleName}`},
            { sufix: 'manage', desc: `Gerenciar tudo em ${moduleName}`}
        ];

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const perms of standardPerms) {
                const slug = `${moduleName}.${perms.sufix}`;

                await client.query(`
                    INSERT INTO permissions (slug, description, module)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (slug) DO NOTHING
                `, [slug, perms.desc, moduleName]);
            }

            await client.query('COMMIT');
        } catch (e) {
            console.error(e);
            return fail(500, {error: 'Erro ao criar permissões padrão'});
        } finally {
            client.release();
        }

        return { success: true };
    }
};