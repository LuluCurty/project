import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
    default: async ({ cookies }) => {
        // 1. Apaga o cookie de autenticação
        cookies.delete('token', { path: '/' });

        // 2. (Opcional) Se você usar sessão no Express, poderia fazer um fetch para a API do Express aqui
        // await fetch('http://localhost:3000/api/auth/logout', ...); 
        
        // 3. Redireciona para o login
        throw redirect(303, '/login');
    }
};