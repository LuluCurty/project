import { redirect, fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    const res = await pool.query(`
        SELECT
            tc.id,
            tc.name,
            tc.description,
            tc.created_at,
            COUNT(t.id) AS task_count
        FROM task_categories tc
        LEFT JOIN tasks t ON t.category_id = tc.id
        GROUP BY tc.id
        ORDER BY tc.name
    `);

    const categories = res.rows.map((row: any) => ({
        ...row,
        task_count: Number(row.task_count),
        created_at: row.created_at ? row.created_at.toISOString() : null
    }));

    return { categories };
};

export const actions: Actions = {
    createCategory: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const name = (formData.get('name') as string || '').trim();
        const description = (formData.get('description') as string || '').trim();

        if (!name) return fail(400, { error: 'O nome é obrigatório.', action: 'create' });

        try {
            await pool.query(
                `INSERT INTO task_categories (name, description) VALUES ($1, $2)`,
                [name, description || null]
            );
            return { success: true, action: 'create' };
        } catch (e: any) {
            if (e.code === '23505') {
                return fail(400, { error: 'Já existe uma categoria com esse nome.', action: 'create' });
            }
            console.error('Erro ao criar categoria:', e);
            return fail(500, { error: 'Erro ao criar categoria.', action: 'create' });
        }
    },

    updateCategory: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const id = Number(formData.get('id'));
        const name = (formData.get('name') as string || '').trim();
        const description = (formData.get('description') as string || '').trim();

        if (!id) return fail(400, { error: 'ID inválido.', action: 'update' });
        if (!name) return fail(400, { error: 'O nome é obrigatório.', action: 'update' });

        try {
            const res = await pool.query(
                `UPDATE task_categories SET name = $1, description = $2 WHERE id = $3 RETURNING id`,
                [name, description || null, id]
            );
            if (res.rows.length === 0) return fail(404, { error: 'Categoria não encontrada.', action: 'update' });
            return { success: true, action: 'update' };
        } catch (e: any) {
            if (e.code === '23505') {
                return fail(400, { error: 'Já existe uma categoria com esse nome.', action: 'update' });
            }
            console.error('Erro ao atualizar categoria:', e);
            return fail(500, { error: 'Erro ao atualizar categoria.', action: 'update' });
        }
    },

    deleteCategory: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');

        const formData = await request.formData();
        const id = Number(formData.get('id'));

        if (!id) return fail(400, { error: 'ID inválido.' });

        try {
            // ON DELETE SET NULL — tasks ficam sem categoria, não são deletadas
            await pool.query(`DELETE FROM task_categories WHERE id = $1`, [id]);
            return { success: true, action: 'delete' };
        } catch (e: any) {
            console.error('Erro ao excluir categoria:', e);
            return fail(500, { error: 'Erro ao excluir categoria.' });
        }
    }
};
