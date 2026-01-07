import { error } from "@sveltejs/kit";

const SUPER_ADMIN_ID = 1;

export function checkSystemAdmin(user: App.Locals['user']){
    if (!user) throw error(401, 'Not authenticated');

    if (user.user_id === SUPER_ADMIN_ID) return true;

    if (user.permissions?.includes('admin.manage')) return true;

    throw error(403, 'Acesso Negado');
}

export function requirePermission(user: App.Locals['user'], permission: string) {
    if (!user) {
        throw error(401, 'Not authenticated');
    }

    if(user.user_id === 1) return;

    if (!user.permissions?.includes(permission)) {
        throw error(403, `Not authorized, requires: ${permission}`);
    }
}

export function guardAction(routeId: string, user: App.Locals['user'], actionSufix: string) {
    if (!user) {
        throw error(401, 'Not authenticated');
    }
    if(user.user_id === 1) return;

    const match = routeId?.match(/\/\(app\)\/\(([^)]+)\)/);
    if (!match || !match[1]) {
        console.error('Não foi possivel verificar a permissao');
        throw error(500, 'Erro de verificação de permissao');
    }
    
    const moduleName = match[1];

    const requiredPermission = `${moduleName}.${actionSufix}`;

    if (!user.permissions?.includes(requiredPermission)) {
        console.warn(`User ${user.email} can't access: ${actionSufix}`);
        throw error(403, `Not authorized, requires: ${requiredPermission}`);
    }
}

export function guardModule(routeId: string | null, user: App.Locals['user']) {
    if (!routeId || !user) return;

    const match = routeId.match(/\/\(app\)\/\(([^)]+)\)/);

    if (match && match[1]) {
        const moduleName = match[1];
        const requirePermission = `${moduleName}.view`;

        if (user.user_id === 1) return;

        if (!user.permissions?.includes(requirePermission)) {
            console.warn(`Usuario ${user.email} não tem permissão para: ${routeId}`);
            throw error(403, `Acesso negado, voce nao pode acessar ${moduleName}`);
        }
    }
}