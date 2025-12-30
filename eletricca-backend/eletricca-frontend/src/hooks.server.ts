// src/hooks.server.ts
import { type HandleFetch, type Handle, redirect } from '@sveltejs/kit';
import {jwtDecode} from 'jwt-decode';

// Pega as requisições inbound 
export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get('token');
    const publicRoutes = ['/login', '/logout'];

    const isPublicRoute = publicRoutes.some(route => event.url.pathname.startsWith(route));

    if(!token && !isPublicRoute) {
        throw redirect(303, '/login');
    }

    if(token)  {
        try {
            const decoded = jwtDecode(token);
            const currentTime = Date.now() / 1000;
            
            if (decoded.exp === undefined) {
                event.cookies.delete('token', { path: '/' });
                throw redirect(303, '/login');
            }
            
            // const d = new Date(decoded.exp*1000).toLocaleString('pt-BR');

            if (decoded.exp < currentTime) {
                
                event.cookies.delete('token', { path: '/' });

                if (!isPublicRoute) {
                    throw redirect(303, '/login');
                }
            }
        } catch (error) {
            console.error(error);
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

