// src/hooks.server.ts
import { type HandleFetch, type Handle, redirect } from '@sveltejs/kit';
import { JWT_SECRET } from '$env/static/private';
import jwt from 'jsonwebtoken';

interface userData {
    user_id: number;
    email: string;
    first_name: string;
    last_name: string;
    user_role: string;
    permissions?: string[];
    role_id: number;
    iat: number;
    exp: number;
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
            const decoded = jwt.verify(token, JWT_SECRET) as userData;
            event.locals.user = decoded;

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
