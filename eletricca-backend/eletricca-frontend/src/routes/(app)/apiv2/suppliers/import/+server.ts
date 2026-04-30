import { json, error } from '@sveltejs/kit';
import { spawnPython } from '$lib/server/python';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';

import type { RequestHandler } from './$types';

const SCRIPT = join(process.cwd(), '..', 'python_scripts', 'import_suppliers.py');

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) return new Response('Unauthorized', { status: 401 });

    const formData = await request.formData();
    const file     = formData.get('file') as File | null;

    if (!file) throw error(400, 'Nenhum arquivo enviado.');

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
        throw error(400, 'Formato não suportado. Use .csv ou .xlsx');
    }

    const tmpPath = join(tmpdir(), `suppliers_import_${Date.now()}.${ext}`);
    await writeFile(tmpPath, Buffer.from(await file.arrayBuffer()));

    return new Promise((resolve) => {
        const py = spawnPython([SCRIPT, tmpPath]);

        let stdout = '';
        let stderr = '';

        py.stdout.on('data', (d: Buffer) => stdout += d.toString());
        py.stderr.on('data', (d: Buffer) => stderr += d.toString());

        py.on('close', async (code) => {
            try { await unlink(tmpPath); } catch {}

            let parsed: any;
            try {
                parsed = JSON.parse(stdout);
            } catch {
                console.error('import_suppliers.py stderr:', stderr);
                resolve(json({ error: 'Resposta inválida do script.' }, { status: 500 }));
                return;
            }

            if (parsed.error) {
                resolve(json({ error: parsed.error }, { status: 400 }));
                return;
            }

            resolve(json(parsed));
        });
    });
};
