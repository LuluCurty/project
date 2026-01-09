import { fail, redirect, error } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {join} from 'node:path';
import { readdirSync, existsSync } from "node:fs";

export const load: PageServerLoad = async ({locals}) => {
    try {
        const settingsDir = join(process.cwd(), 'src/routes/(app)/(admin)/settings');

        if (!existsSync(settingsDir)) {
            console.log(settingsDir)
            return { settingsRoutes: [] };
        }

        const dirents = readdirSync(settingsDir, { withFileTypes: true });

        const routes = dirents
            .filter(dirent => 
                dirent.isDirectory() &&
                !dirent.name.startsWith('(') &&
                !dirent.name.startsWith('_') &&
                !dirent.name.startsWith('.')
            )
            .map(dirent => dirent.name);
        
        return {
            settingsRoutes: routes
        }

    } catch (e) {
        console.error('Erro ao listar configurações: ', e);
        throw error(500, 'Não foi possível carregar o menu de configurações.');
    }
};