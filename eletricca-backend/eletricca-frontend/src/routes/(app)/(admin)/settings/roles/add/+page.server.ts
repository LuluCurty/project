import { fail, error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { checkSystemAdmin } from "$lib/server/auth";

export const load: PageServerLoad = async ({ locals }) => {
    checkSystemAdmin(locals.user);

    return {};
};