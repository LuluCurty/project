import { pool } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

interface Announcement {
    message: string;
    link: string;
}

export const load: LayoutServerLoad = async ({ locals }) => {
    // 1. Busca o anúncio mais recente
    let announcement: Announcement | null = null;
    try {
        const res = await pool.query(`
            SELECT message, link 
            FROM announcements 
            ORDER BY id DESC 
            LIMIT 1
        `);
        announcement = res.rows[0] || null;
    } catch (e) {
        console.error('Erro ao carregar anúncios:', e);
    }

    return {
        user: locals.user, // Seus dados de usuário já existentes
        announcement       // <--- Adicionamos isso aqui
    };
};