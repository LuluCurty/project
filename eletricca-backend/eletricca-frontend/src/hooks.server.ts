// src/hooks.server.ts
import { type HandleFetch, type Handle, redirect } from '@sveltejs/kit';

// Pega as requisições inbound 
export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get('token');

    const publicRoutes = ['/login', '/logout'];

    const isPublicRoute = publicRoutes.some(route => event.url.pathname.startsWith(route));

    if(!token && !isPublicRoute) {
        throw redirect(303, '/login');
    }

    if (token && event.url.pathname === '/login') {
        throw redirect(303, '/')
    }

    return resolve(event);
};



export const handleFetch: HandleFetch = async ({ request, fetch }) => {
    if (request.url.startsWith('https://localhost')) {
        // Clona o request para poder modificar as opções do agente
        // O node nativo do fetch em versões recentes precisa de um agente customizado
        // OU, simplesmente definimos a var de ambiente momentaneamente se for localhost
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
    return fetch(request);
};

