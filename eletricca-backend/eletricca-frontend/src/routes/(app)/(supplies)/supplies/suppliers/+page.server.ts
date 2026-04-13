import { fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

const LIMIT = 15;

export const load: PageServerLoad = async ({ url }) => {
    const search  = url.searchParams.get('search') || '';
    const pageNum = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const offset  = (pageNum - 1) * LIMIT;
    const q       = search.trim() || null;

    const [suppRes, countRes] = await Promise.all([
        pool.query(`
            SELECT id, supplier_name, supplier_legal_name, supplier_legal_identifier,
                   supplier_email, supplier_telephone, supplier_address, description
            FROM supplier
            WHERE ($1::text IS NULL
                OR supplier_name             ILIKE '%' || $1 || '%'
                OR supplier_email            ILIKE '%' || $1 || '%'
                OR supplier_legal_name       ILIKE '%' || $1 || '%'
                OR supplier_legal_identifier ILIKE '%' || $1 || '%')
            ORDER BY supplier_name
            LIMIT $2 OFFSET $3
        `, [q, LIMIT, offset]),

        pool.query(`
            SELECT COUNT(*)::int AS total FROM supplier
            WHERE ($1::text IS NULL
                OR supplier_name             ILIKE '%' || $1 || '%'
                OR supplier_email            ILIKE '%' || $1 || '%'
                OR supplier_legal_name       ILIKE '%' || $1 || '%'
                OR supplier_legal_identifier ILIKE '%' || $1 || '%')
        `, [q]),
    ]);

    return {
        suppliers:   suppRes.rows,
        totalItems:  countRes.rows[0].total,
        currentPage: pageNum,
        search,
    };
};

export const actions: Actions = {
    delete: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const data = await request.formData();
        const id   = Number(data.get('id'));
        if (!id) return fail(400, { error: 'ID inválido.' });

        try {
            await pool.query('DELETE FROM supplier WHERE id = $1', [id]);
            return { success: true };
        } catch (e: any) {
            if (e.code === '23503') {
                return fail(409, { error: 'Fornecedor vinculado a materiais e não pode ser excluído.' });
            }
            console.error(e);
            return fail(500, { error: 'Erro ao excluir fornecedor.' });
        }
    },

    import: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autenticado.' });

        const data    = await request.formData();
        const rowsRaw = data.get('rows') as string;
        if (!rowsRaw) return fail(400, { error: 'Nenhum dado para importar.' });

        let rows: any[];
        try {
            rows = JSON.parse(rowsRaw);
        } catch {
            return fail(400, { error: 'Dados inválidos.' });
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            return fail(400, { error: 'Nenhuma linha válida para importar.' });
        }

        const client = await pool.connect();
        let inserted = 0, updated = 0, skipped = 0;
        try {
            await client.query('BEGIN');
            for (const row of rows) {
                const name       = (row.supplier_name            || '').trim();
                const legalName  = (row.supplier_legal_name      || '').trim() || name; // fallback para nome fantasia
                const cnpj       = (row.supplier_legal_identifier || '').trim();
                const email      = (row.supplier_email           || '').trim() || null;

                // Sem nome ou sem CNPJ → pula (requisitos mínimos da tabela)
                if (!name || !cnpj) { skipped++; continue; }

                if (row.id) {
                    // Atualiza pelo ID
                    const r = await client.query(`
                        UPDATE supplier SET
                            supplier_name             = $1,
                            supplier_legal_name       = $2,
                            supplier_legal_identifier = $3,
                            supplier_email            = $4,
                            supplier_telephone        = $5,
                            supplier_address          = $6,
                            description               = $7
                        WHERE id = $8
                    `, [
                        name, legalName, cnpj, email,
                        row.supplier_telephone || null,
                        row.supplier_address   || null,
                        row.description        || null,
                        row.id,
                    ]);
                    if (r.rowCount && r.rowCount > 0) updated++; else skipped++;
                } else {
                    // INSERT — ignora conflito em qualquer coluna UNIQUE (email, razão social, CNPJ)
                    const r = await client.query(`
                        INSERT INTO supplier
                            (supplier_name, supplier_legal_name, supplier_legal_identifier,
                             supplier_email, supplier_telephone, supplier_address, description)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT DO NOTHING
                    `, [
                        name, legalName, cnpj, email,
                        row.supplier_telephone || null,
                        row.supplier_address   || null,
                        row.description        || null,
                    ]);
                    if (r.rowCount && r.rowCount > 0) inserted++; else skipped++;
                }
            }
            await client.query('COMMIT');
            return { success: true, inserted, updated, skipped };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Erro ao importar fornecedores.' });
        } finally {
            client.release();
        }
    },
};
