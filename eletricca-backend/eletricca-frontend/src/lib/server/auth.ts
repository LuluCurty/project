import { error } from "@sveltejs/kit";

// ─── Constants ───────────────────────────────────────────────────────────────

// ID da role "Admin" na tabela roles (estrutural, não é ID de usuário)
const ADMIN_ROLE_ID = 2;

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Extrai o nome do módulo a partir do routeId do SvelteKit.
 * ex: "/(app)/(forms)/forms/manage/[formId]" → "forms"
 */
function extractModuleName(routeId: string): string {
    const match = routeId.match(/\/\(app\)\/\(([^)]+)\)/);
    if (!match) throw error(500, `Route "${routeId}" has no recognizable module group`);
    return match[1];
}

/**
 * Retorna true se o IP for de uma rede privada (LAN) ou loopback.
 * Cobre: 127.x, 10.x, 172.16–31.x, 192.168.x
 */
function isLanAddress(ip: string): boolean {
    const cleaned = ip.replace(/^::ffff:/, ''); // Remove prefixo IPv6-mapped

    if (cleaned === '127.0.0.1' || cleaned === '::1') return true;

    const parts = cleaned.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return false;

    const [a, b] = parts;
    return (
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
    );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Retorna true se o usuário tiver `is_super_admin = true` (campo vindo do banco).
 */
export function isSuperAdmin(user: App.Locals['user']): boolean {
    return user?.is_super_admin === true;
}

/**
 * Guard exclusivo para o módulo (admin). Dupla validação:
 *
 * - **Super-admin** (`is_super_admin = true`): acesso permitido apenas de dentro da LAN.
 * - **Admin** (`role_id = 2`): requer permissão `admin.view` + cargo correto.
 *
 * @param user      `locals.user`
 * @param clientIp  IP do cliente — use `event.getClientAddress()` no layout
 *
 * @example
 * // src/routes/(app)/(admin)/+layout.server.ts
 * guardAdminModule(locals.user, event.getClientAddress());
 */
export function guardAdminModule(user: App.Locals['user'], clientIp: string): void {
    if (!user) throw error(401, 'Not authenticated');

    if (isSuperAdmin(user)) {
        if (!isLanAddress(clientIp)) {
            console.warn(`[auth] super-admin ${user.email} bloqueado: IP externo ${clientIp}`);
            throw error(403, 'Acesso negado: super-admin só pode acessar de dentro da rede interna');
        }
        return;
    }

    const hasAdminRole  = user.role_id === ADMIN_ROLE_ID;
    const hasPermission = user.permissions.includes('admin.view');

    if (!hasAdminRole || !hasPermission) {
        console.warn(`[auth] ${user.email} negado no módulo admin (role_id=${user.role_id}, permission=${hasPermission})`);
        throw error(403, 'Acesso negado: área administrativa requer cargo de administrador');
    }
}

/**
 * Guard de módulo — use em layout.server.ts para bloquear acesso ao route group inteiro.
 *
 * @param routeId    SvelteKit `event.route.id`
 * @param user       `locals.user`
 * @param permission Override do slug. Padrão: `{modulo}.view`
 *
 * @example
 * guardModule(event.route.id, locals.user);
 * guardModule(event.route.id, locals.user, 'forms.manage');
 */
export function guardModule(
    routeId: string | null,
    user: App.Locals['user'],
    permission?: string
): void {
    if (!user) throw error(401, 'Not authenticated');
    if (isSuperAdmin(user)) return;

    if (!routeId) throw error(500, 'routeId is required for guardModule');

    const moduleName = extractModuleName(routeId);
    const required = permission ?? `${moduleName}.view`;

    if (!user.permissions.includes(required)) {
        console.warn(`[auth] ${user.email} negado no módulo "${moduleName}" (requer "${required}")`);
        throw error(403, `Acesso negado: requer permissão "${required}"`);
    }
}

/**
 * Guard de ação — use dentro de actions ou load functions para proteger
 * operações específicas (criar, editar, excluir, upload, aprovar, etc).
 *
 * Constrói o slug como `{modulo}.{actionSuffix}` a partir do routeId.
 *
 * @param routeId      SvelteKit `event.route.id`
 * @param user         `locals.user`
 * @param actionSuffix Nome da operação, ex: "delete", "edit", "upload", "approve"
 *
 * @example
 * guardAction(event.route.id, locals.user, 'delete');
 * // → verifica "forms.delete"
 */
export function guardAction(
    routeId: string,
    user: App.Locals['user'],
    actionSuffix: string
): void {
    if (!user) throw error(401, 'Not authenticated');
    if (isSuperAdmin(user)) return;

    const moduleName = extractModuleName(routeId);
    const required = `${moduleName}.${actionSuffix}`;

    if (!user.permissions.includes(required)) {
        console.warn(`[auth] ${user.email} negado na ação "${required}"`);
        throw error(403, `Acesso negado: requer permissão "${required}"`);
    }
}
