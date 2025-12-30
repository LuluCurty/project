import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
    const session = cookies.get('connect.sid') || cookies.get('token');
    if (session) {
        throw redirect(300, '/');
    }
}

export const actions: Actions = {
    login: async ({ request, cookies, fetch }) => {
        const formData = await request.formData();
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const rememberMe = formData.get('remember-me') === 'on';        

        if (!email || !password) {
            return fail(400, {
                email,
                missing: true,
                error: 'Preencha todos os campos'
            })
        };

        try {
            const PORT = process.env.PORT || 54445;
            const apiURL = `https://localhost:${PORT}/api/auth/login`;

            const res = await fetch(apiURL, {
                method: 'POST',
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password_hashed: password, rememberMe })
            })

            const data = await res.json();

            if (!res.ok) {
                return fail(res.status, {
                    email, 
                    error: data.message || 'Falha na autenticação\n'
                });
            };

            const setCookieHeader = res.headers.get('set-cookie');

            if (setCookieHeader) {
                const cookieParts = setCookieHeader.split(';')[0].split('=');
                const cookieName = cookieParts[0];
                const cookieValue = cookieParts[1];
                
                cookies.set(cookieName, cookieValue, {
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 24
                })
            } else if (data.token) {
                cookies.set('token', data.token, { path: '/' });
            }
        } catch (e) {
            console.error(e);
            return fail(500, {
                email, 
                error: 'Erro de comunicação com o servidor'
            });
        }

        throw redirect(300, '/');
    }
};