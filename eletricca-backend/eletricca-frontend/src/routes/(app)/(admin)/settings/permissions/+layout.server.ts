import type { LayoutServerLoad } from "./$types";
import { guardModule } from "$lib/server/auth";

export const load: LayoutServerLoad = async ({ locals, route}) => {
    guardModule(route.id, locals.user);
    return {};
};