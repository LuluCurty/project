import { fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAction } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, route, url }) => {
    guardAction(route.id, locals.user, 'manage');

    const page = Number(url.searchParams.get('page')) || 1;
    const search = url.searchParams.get('search') || '';
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        // 1. Query Principal: Listagem + Contagens
        // Usamos Subqueries para contar as tabelas relacionadas
        const listQuery = `
            SELECT 
                f.id,
                f.title,
                f.description,
                f.is_active,
                f.created_at,
                f.updated_at,
                u.first_name || ' ' || u.last_name as created_by_name,
                (SELECT COUNT(*) FROM form_fields ff WHERE ff.form_id = f.id) as field_count,
                (SELECT COUNT(*) FROM form_responses fr WHERE fr.form_id = f.id) as response_count,
                (SELECT COUNT(*) FROM form_assignments fa WHERE fa.form_id = f.id) as assignment_count
            FROM forms f
            JOIN users u ON f.created_by = u.user_id
            WHERE f.title ILIKE $1 
               OR f.description ILIKE $1
            ORDER BY f.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        // 2. Query de Paginação (Total de itens da busca)
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM forms 
            WHERE title ILIKE $1 OR description ILIKE $1
        `;

        // 3. Query de Estatísticas (Geral do sistema)
        // Agregamos tudo numa query só para ser rápido
        const statsQuery = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) as inactive,
                (SELECT COUNT(*) FROM form_assignments) as total_assignments
            FROM forms
        `;

        // Executa tudo em paralelo
        const [listRes, countRes, statsRes] = await Promise.all([
            pool.query(listQuery, [`%${search}%`, limit, offset]),
            pool.query(countQuery, [`%${search}%`]),
            pool.query(statsQuery)
        ]);

        const totalItems = Number(countRes.rows[0].total);
        const stats = statsRes.rows[0];

        return {
            forms: listRes.rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            },
            stats: {
                total: Number(stats.total),
                active: Number(stats.active),
                inactive: Number(stats.inactive),
                totalAssignments: Number(stats.total_assignments)
            }
        };

    } catch (e) {
        console.error(e);
        return { 
            forms: [], 
            pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
            stats: { total: 0, active: 0, inactive: 0, totalAssignments: 0 }
        };
    }
};

export const actions: Actions = {
    delete: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'manage'); // Permissão de gerente
        
        const data = await request.formData();
        const id = Number(data.get('id'));

        if (!id) return fail(400, { error: 'ID inválido' });

        try {
            // O "ON DELETE CASCADE" no banco cuida dos campos, respostas e assignments
            await pool.query('DELETE FROM forms WHERE id = $1', [id]);
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao excluir formulário' });
        }

        return { success: true };
    },

    toggleStatus: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'manage');
        
        const data = await request.formData();
        const id = Number(data.get('id'));
        
        if (!id) return fail(400, { error: 'ID inválido' });

        try {
            // Inverte o boolean atual
            await pool.query('UPDATE forms SET is_active = NOT is_active WHERE id = $1', [id]);
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erro ao alterar status' });
        }

        return { success: true };
    }
};