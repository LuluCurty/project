import { UCM_HOST, UCM_PORT, UCM_USERNAME, UCM_PASSWORD } from '$env/static/private';
import type { PageServerLoad } from './$types';
import crypto from 'crypto';

const BASE_URL = `https://${UCM_HOST}:${UCM_PORT}`;

// Cache de sessão UCM (variável de módulo, persiste entre requests)
let cachedCookie: string | null = null;
let cookieExpiresAt = 0;

interface UCMResponse {
    status: number;
    response: {
        cookie?: string;
        challenge?: string;
        account?: Extension[];
        total_item?: number;
    };
}

interface Extension {
    extension: string;
    fullname: string;
    addr: string;
}

async function ucmPost(body: object): Promise<UCMResponse> {
    const res = await fetch(`${BASE_URL}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        // @ts-ignore - Node fetch aceita esta opção para ignorar cert self-signed
        agent: undefined
    });
    return res.json();
}

async function getChallenge(): Promise<string> {
    const data = await ucmPost({
        request: {
            action: 'challenge',
            user: UCM_USERNAME
        }
    });
    return data.response.challenge || '';
}

async function login(challenge: string): Promise<string> {
    const token = crypto.createHash('md5').update(challenge + UCM_PASSWORD).digest('hex');

    const data = await ucmPost({
        request: {
            action: 'login',
            user: UCM_USERNAME,
            token
        }
    });

    if (data.status !== 0) {
        throw new Error('UCM login failed');
    }

    return data.response.cookie || '';
}

async function getValidCookie(): Promise<string> {
    const now = Date.now();

    if (cachedCookie && now < cookieExpiresAt) {
        return cachedCookie;
    }

    const challenge = await getChallenge();
    const cookie = await login(challenge);

    cachedCookie = cookie;
    cookieExpiresAt = now + 9 * 60 * 1000; // 9 minutos

    return cookie;
}

async function fetchExtensions(): Promise<Extension[]> {
    const cookie = await getValidCookie();

    const data = await ucmPost({
        request: {
            action: 'listAccount',
            cookie,
            options: 'extension,fullname,addr'
        }
    });

    if (data.status !== 0 || !data.response.account) {
        return [];
    }

    return data.response.account;
}

export const load: PageServerLoad = async ({ locals }) => {
    // Desabilitar verificação TLS para o UCM (cert self-signed)
    const originalTLS = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    let extensions: Extension[] = [];

    try {
        extensions = await fetchExtensions();
    } catch (e) {
        console.error('Erro ao buscar ramais UCM:', e);
    } finally {
        // Restaurar configuração TLS
        if (originalTLS !== undefined) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTLS;
        } else {
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
    }

    return {
        extensions,
        user: locals.user
    };
};
