import { pool } from '$lib/server/db';
import { s3 } from '$lib/server/storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { RequestHandler } from './$types';

/**
 * GET /apiv2/files/:fileId
 *
 * Proxy server-side para arquivos no VersityGW.
 * O browser só faz chamadas HTTPS para o SvelteKit; o servidor
 * busca o objeto no VersityGW via HTTP interno — sem mixed-content.
 */
export const GET: RequestHandler = async ({ locals, params }) => {
    if (!locals.user) return new Response('Unauthorized', { status: 401 });

    const fileId = Number(params.fileId);
    if (!fileId) return new Response('Not Found', { status: 404 });

    try {
        const res = await pool.query(
            'SELECT object_key, bucket, mime_type, original_name FROM files WHERE id = $1',
            [fileId]
        );
        if (res.rowCount === 0) return new Response('Not Found', { status: 404 });

        const file = res.rows[0];

        const s3Res = await s3.send(
            new GetObjectCommand({ Bucket: file.bucket, Key: file.object_key })
        );

        const bytes = await s3Res.Body!.transformToByteArray();

        return new Response(bytes, {
            headers: {
                'Content-Type':        file.mime_type,
                'Cache-Control':       'private, max-age=3600',
                'Content-Disposition': `inline; filename="${file.original_name}"`,
            }
        });
    } catch (e) {
        console.error('File proxy error:', e);
        return new Response('Not Found', { status: 404 });
    }
};
