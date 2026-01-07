import { fail, error } from "@sveltejs/kit";
import { pool } from "$lib/server/db";
import { checkSystemAdmin } from "$lib/server/auth";
import type { PageServerLoad, Actions } from "./$types";

interface RoleData{
    id: number;
    name: string;
    description: string | null;
    created_at: string;
}

export const load: PageServerLoad = async ({ locals, params }) => {
    checkSystemAdmin(locals.user);
    
    const paramValue = params

    const query = `
        SELECT * FROM roles WHERE id=$1;
    ;`;

    const {rows} = await pool.query<RoleData>(query, [paramValue.id]);

    return {
        roles: rows
    }
};