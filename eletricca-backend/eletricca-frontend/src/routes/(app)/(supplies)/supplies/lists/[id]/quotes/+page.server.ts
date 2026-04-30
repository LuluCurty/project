import { fail, redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { createNotificationBulk } from '$lib/server/notifications';
import { supplyLog } from '$lib/server/logger';
import { spawnPython } from '$lib/server/python';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { PageServerLoad, Actions } from './$types';

const PARSERS_DIR = join(process.cwd(), '..', 'python_scripts', 'supplier_parsers');

function canAccessQuotes(user: App.Locals['user']): boolean {
    if (!user) return false;
    return (
        user.is_super_admin ||
        user.permissions.includes('supplies.quote') ||
        user.permissions.includes('supplies.manage')
    );
}

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!canAccessQuotes(locals.user)) throw error(403, 'Sem permissão para gerenciar cotações.');

    const listId = Number(params.id);
    if (isNaN(listId)) throw error(404, 'Lista não encontrada.');

    const [listRes, itemsRes, quotesRes, suppliersRes] = await Promise.all([
        pool.query(`
            SELECT sl.id, sl.list_name, sl.description, sl.priority, sl.list_status,
                   sl.created_by, sl.selected_quote_id,
                   c.client_first_name, c.client_last_name
            FROM supplies_lists sl
            LEFT JOIN client c ON c.id = sl.client_id
            WHERE sl.id = $1
        `, [listId]),

        pool.query(`
            SELECT sli.id, sli.supply_id, sli.quantity, s.supply_name
            FROM supplies_list_items sli
            JOIN supplies s ON s.id = sli.supply_id
            WHERE sli.list_id = $1
            ORDER BY sli.id
        `, [listId]),

        pool.query(`
            SELECT
                q.id, q.supplier_id, q.status, q.notes,
                sup.supplier_name, sup.pdf_parser,
                COALESCE(
                    json_agg(
                        json_build_object('list_item_id', qi.list_item_id, 'price', qi.price::float)
                        ORDER BY qi.list_item_id
                    ) FILTER (WHERE qi.id IS NOT NULL),
                    '[]'
                ) AS items
            FROM supply_list_quotes q
            JOIN supplier sup ON sup.id = q.supplier_id
            LEFT JOIN supply_list_quote_items qi ON qi.quote_id = q.id
            WHERE q.list_id = $1
            GROUP BY q.id, sup.supplier_name, sup.pdf_parser
            ORDER BY q.id
        `, [listId]),

        pool.query('SELECT id, supplier_name, pdf_parser FROM supplier ORDER BY supplier_name'),
    ]);

    if (listRes.rowCount === 0) throw error(404, 'Lista não encontrada.');

    const list = listRes.rows[0];
    if (!['pending', 'quoting', 'quoted'].includes(list.list_status)) {
        redirect(303, '/supplies/lists');
    }

    const quotedSupplierIds = new Set(quotesRes.rows.map((q: any) => q.supplier_id));

    const quotes = quotesRes.rows.map((q: any) => ({
        id:            q.id,
        supplier_id:   q.supplier_id,
        supplier_name: q.supplier_name,
        pdf_parser:    q.pdf_parser ?? null,
        status:        q.status,
        notes:         q.notes ?? '',
        priceMap:      Object.fromEntries(
            (q.items as { list_item_id: number; price: number }[]).map(i => [i.list_item_id, i.price])
        ),
    }));

    return {
        list: {
            id:               list.id,
            list_name:        list.list_name,
            description:      list.description ?? '',
            priority:         list.priority,
            list_status:      list.list_status,
            selected_quote_id: list.selected_quote_id,
            client:           list.client_first_name
                                ? { client_first_name: list.client_first_name, client_last_name: list.client_last_name }
                                : null,
        },
        items: itemsRes.rows.map(r => ({
            id:          r.id,
            supply_id:   r.supply_id,
            supply_name: r.supply_name,
            quantity:    r.quantity,
        })),
        quotes,
        // only show suppliers not yet quoted
        suppliers: suppliersRes.rows.filter((s: any) => !quotedSupplierIds.has(s.id)),
    };
};

export const actions: Actions = {
    // Add a new supplier quote to this list
    addQuote: async ({ request, locals, params }) => {
        if (!canAccessQuotes(locals.user)) return fail(403, { error: 'Sem permissão.' });

        const listId      = Number(params.id);
        const data        = await request.formData();
        const supplier_id = Number(data.get('supplier_id'));
        const notes       = (data.get('notes') as string)?.trim() || null;

        if (!supplier_id) return fail(400, { error: 'Selecione um fornecedor.' });

        try {
            await pool.query(`
                INSERT INTO supply_list_quotes (list_id, supplier_id, notes, created_by)
                VALUES ($1, $2, $3, $4)
            `, [listId, supplier_id, notes, locals.user!.user_id]);

            // Advance to quoting if still pending
            await pool.query(`
                UPDATE supplies_lists SET list_status = 'quoting', updated_at = NOW()
                WHERE id = $1 AND list_status = 'pending'
            `, [listId]);

            supplyLog.info({ user_id: locals.user!.user_id, list_id: listId, supplier_id }, 'quote added');
            return { success: true, action: 'addQuote' };
        } catch (e: any) {
            if (e.code === '23505') return fail(409, { error: 'Este fornecedor já tem uma cotação para esta lista.' });
            supplyLog.error({ err: e, user_id: locals.user!.user_id, list_id: listId }, 'failed to add quote');
            return fail(500, { error: 'Erro ao adicionar cotação.' });
        }
    },

    // Save / update prices for all items of one quote
    saveQuote: async ({ request, locals, params }) => {
        if (!canAccessQuotes(locals.user)) return fail(403, { error: 'Sem permissão.' });

        const data     = await request.formData();
        const quote_id = Number(data.get('quote_id'));
        const pricesRaw = data.get('prices') as string;

        if (!quote_id) return fail(400, { error: 'Cotação inválida.' });

        let prices: { list_item_id: number; price: number }[];
        try {
            prices = JSON.parse(pricesRaw);
        } catch {
            return fail(400, { error: 'Dados de preços inválidos.' });
        }

        if (!Array.isArray(prices) || prices.length === 0) {
            return fail(400, { error: 'Nenhum preço informado.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const { list_item_id, price } of prices) {
                if (price === null || price === undefined || isNaN(Number(price))) continue;
                await client.query(`
                    INSERT INTO supply_list_quote_items (quote_id, list_item_id, price)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (quote_id, list_item_id) DO UPDATE SET price = EXCLUDED.price
                `, [quote_id, list_item_id, price]);
            }
            await client.query(
                'UPDATE supply_list_quotes SET updated_at = NOW() WHERE id = $1',
                [quote_id]
            );
            await client.query('COMMIT');
            supplyLog.info({ user_id: locals.user!.user_id, quote_id }, 'quote prices saved');
            return { success: true, action: 'saveQuote' };
        } catch (e) {
            await client.query('ROLLBACK');
            supplyLog.error({ err: e, user_id: locals.user!.user_id, quote_id }, 'failed to save quote prices');
            return fail(500, { error: 'Erro ao salvar preços da cotação.' });
        } finally {
            client.release();
        }
    },

    // Remove a supplier quote (and its prices via CASCADE)
    removeQuote: async ({ request, locals }) => {
        if (!canAccessQuotes(locals.user)) return fail(403, { error: 'Sem permissão.' });

        const data     = await request.formData();
        const quote_id = Number(data.get('quote_id'));
        if (!quote_id) return fail(400, { error: 'ID inválido.' });

        try {
            await pool.query('DELETE FROM supply_list_quotes WHERE id = $1', [quote_id]);
            supplyLog.info({ user_id: locals.user!.user_id, quote_id }, 'quote removed');
            return { success: true, action: 'removeQuote' };
        } catch (e) {
            supplyLog.error({ err: e, user_id: locals.user!.user_id, quote_id }, 'failed to remove quote');
            return fail(500, { error: 'Erro ao remover cotação.' });
        }
    },

    // Mark list as quoted — ready for manager approval
    markQuoted: async ({ locals, params }) => {
        if (!canAccessQuotes(locals.user)) return fail(403, { error: 'Sem permissão.' });

        const listId = Number(params.id);

        const check = await pool.query(`
            SELECT sl.list_name, COUNT(DISTINCT q.id)::int AS quote_count
            FROM supplies_lists sl
            LEFT JOIN supply_list_quotes q ON q.list_id = sl.id
            WHERE sl.id = $1
            GROUP BY sl.list_name
        `, [listId]);

        if (check.rowCount === 0) return fail(404, { error: 'Lista não encontrada.' });
        if (check.rows[0].quote_count === 0) {
            return fail(400, { error: 'Adicione pelo menos uma cotação antes de finalizar.' });
        }

        await pool.query(`
            UPDATE supplies_lists SET list_status = 'quoted', updated_at = NOW()
            WHERE id = $1 AND list_status IN ('pending', 'quoting')
        `, [listId]);

        supplyLog.info({ user_id: locals.user!.user_id, list_id: listId }, 'list marked as quoted');

        // Notify managers
        try {
            const managersRes = await pool.query<{ user_id: number }>(`
                SELECT DISTINCT user_id FROM (
                    SELECT u.user_id FROM users u WHERE u.is_super_admin = TRUE
                    UNION
                    SELECT u.user_id FROM users u
                        JOIN role_permissions rp ON rp.role_id = u.role_id
                        JOIN permissions p ON p.id = rp.permissions_id
                        WHERE p.slug = 'supplies.manage'
                    UNION
                    SELECT up.user_id FROM user_permissions up
                        JOIN permissions p ON p.id = up.permissions_id
                        WHERE p.slug = 'supplies.manage'
                ) m WHERE user_id != $1
            `, [locals.user!.user_id]);

            const ids = managersRes.rows.map(r => r.user_id);
            if (ids.length > 0) {
                const name = `${locals.user!.first_name} ${locals.user!.last_name}`;
                await createNotificationBulk(ids, {
                    title: 'Lista pronta para aprovação',
                    message: `${name} finalizou as cotações da lista "${check.rows[0].list_name}"`,
                    type: 'supply_list_quoted',
                    referenceType: 'supply_list',
                    referenceId: listId,
                });
            }
        } catch (e) {
            supplyLog.error({ err: e }, 'failed to notify managers of quoted list');
        }

        redirect(303, '/supplies/lists');
    },

    // Parse a supplier's PDF and return extracted prices (does NOT save — user reviews first)
    importPdf: async ({ request, locals, params }) => {
        if (!canAccessQuotes(locals.user)) return fail(403, { error: 'Sem permissão.' });

        const listId = Number(params.id);
        const data   = await request.formData();
        const quoteId = Number(data.get('quote_id'));
        const file    = data.get('pdf') as File | null;

        if (!quoteId)                     return fail(400, { error: 'Cotação inválida.' });
        if (!file || file.size === 0)     return fail(400, { error: 'Nenhum arquivo selecionado.' });
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))
            return fail(400, { error: 'Apenas arquivos PDF são aceitos.' });

        const [quoteRes, itemsRes] = await Promise.all([
            pool.query(`
                SELECT q.id, sup.pdf_parser, sup.supplier_name
                FROM supply_list_quotes q
                JOIN supplier sup ON sup.id = q.supplier_id
                WHERE q.id = $1 AND q.list_id = $2
            `, [quoteId, listId]),
            pool.query(`
                SELECT sli.id, s.supply_name
                FROM supplies_list_items sli
                JOIN supplies s ON s.id = sli.supply_id
                WHERE sli.list_id = $1
                ORDER BY s.supply_name
            `, [listId]),
        ]);

        if (quoteRes.rowCount === 0) return fail(404, { error: 'Cotação não encontrada.' });

        const quote      = quoteRes.rows[0];
        const items      = itemsRes.rows.map((r: any) => ({ id: r.id, supply_name: r.supply_name }));
        const parserName = quote.pdf_parser || 'generic';
        const scriptPath = join(PARSERS_DIR, `${parserName}.py`);

        if (!existsSync(scriptPath))
            return fail(400, { error: `Parser "${parserName}" não encontrado. Contate o administrador.` });

        const pdfBytes = Buffer.from(await file.arrayBuffer());
        const tmpFile  = join(tmpdir(), `slq-${quoteId}-${Date.now()}.pdf`);

        try {
            writeFileSync(tmpFile, pdfBytes);

            const prices = await new Promise<any[]>((resolve, reject) => {
                const proc     = spawnPython([scriptPath, tmpFile]);
                const chunks:  Buffer[] = [];
                const errBufs: Buffer[] = [];

                proc.stdout.on('data', (c: Buffer) => chunks.push(c));
                proc.stderr.on('data', (d: Buffer) => errBufs.push(d));
                proc.on('close', (code) => {
                    const errText = Buffer.concat(errBufs).toString().trim();
                    if (errText) console.error(`[${parserName}]\n${errText}`);
                    if (code === 0) {
                        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                        catch { reject(new Error('Resposta inválida do parser.')); }
                    } else {
                        reject(new Error(errText || `Parser encerrou com código ${code}.`));
                    }
                });
                proc.on('error', reject);
                proc.stdin.write(JSON.stringify(items));
                proc.stdin.end();
            });

            supplyLog.info(
                { user_id: locals.user!.user_id, quote_id: quoteId, list_id: listId, parser: parserName, prices },
                'pdf imported'
            );
            return { success: true, action: 'importPdf', prices };
        } catch (e: any) {
            supplyLog.error({ err: e, quote_id: quoteId }, 'pdf import failed');
            return fail(500, { error: `Erro ao processar PDF: ${e.message}` });
        } finally {
            try { unlinkSync(tmpFile); } catch { /* best-effort cleanup */ }
        }
    },
};
