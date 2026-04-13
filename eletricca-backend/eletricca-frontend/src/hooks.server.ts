// src/hooks.server.ts
import { type HandleFetch, type Handle, redirect } from '@sveltejs/kit';
import { JWT_SECRET } from '$env/static/private';
import jwt from 'jsonwebtoken';
import { pool } from '$lib/server/db';

interface JwtPayload {
    user_id: number;
    email: string;
    first_name: string;
    last_name: string;
    user_role: string;
    role_id: number;
    iat: number;
    exp: number;
}

interface UserData {
    permissions: string[];
    is_super_admin: boolean;
}

// Busca permissões e flag de super-admin diretamente do banco a cada request,
// garantindo que qualquer mudança tenha efeito imediato (sem precisar deslogar).
async function loadUserData(userId: number): Promise<UserData> {
    const [permRes, userRes] = await Promise.all([
        pool.query<{ slug: string }>(`
            SELECT p.slug FROM permissions p
            INNER JOIN user_permissions up ON up.permissions_id = p.id
            WHERE up.user_id = $1
            UNION
            SELECT p.slug FROM permissions p
            INNER JOIN role_permissions rp ON rp.permissions_id = p.id
            INNER JOIN users u ON u.role_id = rp.role_id
            WHERE u.user_id = $1
        `, [userId]),
        pool.query<{ is_super_admin: boolean }>(
            'SELECT is_super_admin FROM users WHERE user_id = $1',
            [userId]
        )
    ]);

    const is_super_admin = userRes.rows[0]?.is_super_admin ?? false;

    // Super-admin recebe todos os slugs cadastrados
    if (is_super_admin) {
        const allPerms = await pool.query<{ slug: string }>('SELECT slug FROM permissions');
        return { permissions: allPerms.rows.map(r => r.slug), is_super_admin: true };
    }

    return { permissions: permRes.rows.map(r => r.slug), is_super_admin: false };
}

// Pega as requisições inbound
export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get('token');
    const publicRoutes = ['/login', '/logout', 'auth'];

    const isPublicRoute = publicRoutes.some(route => event.url.pathname.startsWith(route));

    event.locals.user = null;

    if (!token && !isPublicRoute) {
        throw redirect(303, '/login');
    }

    if (token) {
        try {
            // jwt.verify valida assinatura E expiração automaticamente
            const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
            const { permissions, is_super_admin } = await loadUserData(decoded.user_id);

            event.locals.user = { ...decoded, permissions, is_super_admin };

        } catch (error) {
            // Token inválido, expirado ou assinatura incorreta
            event.cookies.delete('token', { path: '/' });
            if (!isPublicRoute) {
                throw redirect(303, '/login');
            }
        }
    }

    if (token && event.url.pathname === '/login') {
        throw redirect(303, '/')
    }

    return resolve(event);
};



export const handleFetch: HandleFetch = async ({ request, fetch, event }) => {
    if (request.url.startsWith('https://localhost')) {
        // Clona o request para poder modificar as opções do agente
        // O node nativo do fetch em versões recentes precisa de um agente customizado
        // OU, simplesmente definimos a var de ambiente momentaneamente se for localhost
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    return fetch(request);
};
