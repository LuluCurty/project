import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { s3, BUCKETS } from '$lib/server/storage';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { spawnPython } from '$lib/server/python';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';

const SCRIPT     = join(process.cwd(), '..', 'python_scripts', 'parse_cdr.py');
const CDR_BUCKET = BUCKETS.reports;
const CDR_KEY    = 'calls/monthly.csv'; // fixed key — upload always replaces this

// ──────────────────────────────────────────────────────────────────────────────
// Helper: pipe a buffer through the Python CDR parser
// ──────────────────────────────────────────────────────────────────────────────
async function runParser(buffer: Buffer): Promise<any> {
    const tmpPath = join(tmpdir(), `cdr_parse_${Date.now()}.csv`);
    await writeFile(tmpPath, buffer);

    return new Promise((resolve, reject) => {
        const py = spawnPython([SCRIPT, tmpPath]);
        let stdout = '';
        let stderr = '';

        py.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
        py.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

        py.on('close', async () => {
            try { await unlink(tmpPath); } catch { /* ignore */ }

            try {
                resolve(JSON.parse(stdout));
            } catch {
                console.error('[parse_cdr] stderr:', stderr);
                reject(new Error('Resposta inválida do parser Python.'));
            }
        });
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// Load: fetch existing CSV from VersityGW and parse it
// ──────────────────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async () => {
    try {
        const s3Res = await s3.send(
            new GetObjectCommand({ Bucket: CDR_BUCKET, Key: CDR_KEY })
        );
        const bytes = await s3Res.Body!.transformToByteArray();
        const parsed = await runParser(Buffer.from(bytes));

        if (parsed.error) {
            return { stats: null, hasFile: false, error: parsed.error };
        }

        return { stats: parsed, hasFile: true, error: null };

    } catch (e: any) {
        // No file uploaded yet
        const code = e?.name ?? e?.Code ?? '';
        if (code === 'NoSuchKey' || code === 'NoSuchBucket' || e?.$metadata?.httpStatusCode === 404) {
            return { stats: null, hasFile: false, error: null };
        }
        console.error('[CDR stats] S3 error:', e);
        return {
            stats: null, hasFile: false,
            error: 'Não foi possível acessar o armazenamento. Verifique se o bucket "reports" existe no VersityGW.',
        };
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// Action: receive CSV upload, store in VersityGW (overwrites previous)
// ──────────────────────────────────────────────────────────────────────────────
export const actions: Actions = {
    upload: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Não autorizado.' });

        const formData = await request.formData();
        const file = formData.get('csv') as File | null;

        if (!file || file.size === 0) {
            return fail(400, { error: 'Nenhum arquivo enviado.' });
        }
        if (!file.name.toLowerCase().endsWith('.csv')) {
            return fail(400, { error: 'Apenas arquivos .csv são aceitos.' });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        await s3.send(new PutObjectCommand({
            Bucket:      CDR_BUCKET,
            Key:         CDR_KEY,
            Body:        buffer,
            ContentType: 'text/csv',
        }));

        // Redirect so load() re-runs and shows the fresh stats
        redirect(303, '/reports/calls/stats');
    },
};
