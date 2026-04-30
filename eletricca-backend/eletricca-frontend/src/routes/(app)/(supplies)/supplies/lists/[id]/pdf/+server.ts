import { error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { spawnPython } from '$lib/server/python';
import { join } from 'path';
import type { RequestHandler } from './$types';

const SCRIPT = join(process.cwd(), '..', 'python_scripts', 'generate_list_pdf.py');

export const GET: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) throw error(401, 'Não autenticado.');

    const listId = Number(params.id);
    if (isNaN(listId)) throw error(404, 'Lista não encontrada.');

    const [listRes, itemsRes] = await Promise.all([
        pool.query(`
            SELECT sl.list_name, sl.priority, sl.description, sl.creation_date,
                   NULLIF(CONCAT(c.client_first_name, ' ', c.client_last_name), ' ') AS client
            FROM supplies_lists sl
            LEFT JOIN client c ON c.id = sl.client_id
            WHERE sl.id = $1
        `, [listId]),
        pool.query(`
            SELECT s.supply_name, sli.quantity
            FROM supplies_list_items sli
            JOIN supplies s ON s.id = sli.supply_id
            WHERE sli.list_id = $1
            ORDER BY s.supply_name
        `, [listId]),
    ]);

    if (listRes.rowCount === 0) throw error(404, 'Lista não encontrada.');

    const list  = listRes.rows[0];
    const items = itemsRes.rows;

    const payload = JSON.stringify({
        list_name:   list.list_name,
        priority:    list.priority,
        description: list.description ?? '',
        client:      list.client ?? null,
        date:        (list.creation_date as Date).toLocaleDateString('pt-BR'),
        items:       items.map((r: any) => ({
            supply_name: r.supply_name,
            quantity:    r.quantity,
        })),
    });

    const pdf = await new Promise<Buffer>((resolve, reject) => {
        const proc   = spawnPython([SCRIPT]);
        const chunks: Buffer[] = [];

        proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
        proc.stderr.on('data', (d: Buffer) =>
            console.error('[generate_list_pdf]', d.toString().trim())
        );
        proc.on('close', (code) => {
            if (code === 0) resolve(Buffer.concat(chunks));
            else reject(new Error(`PDF script exited with code ${code}`));
        });
        proc.on('error', reject);

        proc.stdin.write(payload);
        proc.stdin.end();
    });

    const filename = `lista-${listId}-${list.list_name.replace(/\s+/g, '-').toLowerCase()}.pdf`;

    return new Response(new Uint8Array(pdf), {
        headers: {
            'Content-Type':        'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length':      String(pdf.byteLength),
        },
    });
};
