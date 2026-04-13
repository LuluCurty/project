import { pool } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { spawn } from 'child_process';
import { join } from 'path';
import type { RequestHandler } from './$types';

const SCRIPT = join(process.cwd(), '..', 'python_scripts', 'export_suppliers.py');

const CONTENT_TYPES: Record<string, string> = {
    csv:  'text/csv; charset=utf-8',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf:  'application/pdf',
};

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) return new Response('Unauthorized', { status: 401 });

    const format = url.searchParams.get('format') || 'csv';
    if (!['csv', 'xlsx', 'pdf'].includes(format)) {
        throw error(400, 'Formato inválido. Use: csv, xlsx ou pdf');
    }

    const res = await pool.query(`
        SELECT id, supplier_name, supplier_legal_name, supplier_legal_identifier,
               supplier_email, supplier_telephone, supplier_address, description
        FROM supplier
        ORDER BY supplier_name
    `);

    const suppliers = res.rows;
    const date      = new Date().toISOString().slice(0, 10);
    const filename  = `fornecedores_${date}.${format}`;

    return new Promise((resolve) => {
        const py = spawn('python3', [SCRIPT, format]);

        py.stdin.write(JSON.stringify(suppliers));
        py.stdin.end();

        const chunks: Buffer[] = [];
        let   stderr = '';

        py.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
        py.stderr.on('data', (d: Buffer)     => stderr += d.toString());

        py.on('close', (code) => {
            if (code !== 0) {
                console.error('export_suppliers.py stderr:', stderr);
                resolve(new Response('Erro ao gerar arquivo', { status: 500 }));
                return;
            }
            const buffer = Buffer.concat(chunks);
            resolve(new Response(buffer, {
                headers: {
                    'Content-Type':        CONTENT_TYPES[format],
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            }));
        });
    });
};
