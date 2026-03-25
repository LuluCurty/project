import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { s3, BUCKETS, type BucketName } from '$lib/server/storage';
import {
    ListObjectsV2Command,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function listBucket(bucket: string) {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
    const objects = res.Contents ?? [];

    return Promise.all(
        objects.map(async (obj) => {
            const url = await getSignedUrl(
                s3,
                new GetObjectCommand({ Bucket: bucket, Key: obj.Key }),
                { expiresIn: 3600 }
            );
            return {
                key: obj.Key!,
                size: obj.Size ?? 0,
                lastModified: obj.LastModified?.toISOString() ?? null,
                url
            };
        })
    );
}

export const load: PageServerLoad = async () => {
    const [formsFiles, tasksFiles] = await Promise.allSettled([
        listBucket(BUCKETS.forms),
        listBucket(BUCKETS.tasks)
    ]);

    return {
        forms: formsFiles.status === 'fulfilled' ? formsFiles.value : [],
        tasks: tasksFiles.status === 'fulfilled' ? tasksFiles.value : [],
        formsError: formsFiles.status === 'rejected' ? String(formsFiles.reason) : null,
        tasksError: tasksFiles.status === 'rejected' ? String(tasksFiles.reason) : null
    };
};

const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
];

export const actions: Actions = {
    upload: async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const bucket = formData.get('bucket') as string | null;

        if (!file || file.size === 0) return fail(400, { error: 'Nenhum arquivo selecionado' });
        if (!bucket || !(bucket in BUCKETS)) return fail(400, { error: 'Bucket inválido' });
        if (file.size > 50 * 1024 * 1024) return fail(400, { error: 'Arquivo muito grande (máx 50MB)' });
        if (!ALLOWED_TYPES.includes(file.type)) return fail(400, { error: `Tipo não permitido: ${file.type}` });

        const ext = file.name.split('.').pop();
        const key = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        try {
            await s3.send(new PutObjectCommand({
                Bucket: BUCKETS[bucket as BucketName],
                Key: key,
                Body: Buffer.from(await file.arrayBuffer()),
                ContentType: file.type,
                Metadata: { 'original-name': encodeURIComponent(file.name) }
            }));
            return { success: true, key, bucket };
        } catch (e: any) {
            console.error('Erro ao fazer upload:', e);
            return fail(500, { error: 'Falha ao enviar arquivo' });
        }
    },

    delete: async ({ request }) => {
        const formData = await request.formData();
        const key = formData.get('key') as string | null;
        const bucket = formData.get('bucket') as string | null;

        if (!key || !bucket || !(bucket in BUCKETS)) return fail(400, { error: 'Parâmetros inválidos' });

        try {
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKETS[bucket as BucketName], Key: key }));
            return { success: true };
        } catch (e: any) {
            console.error('Erro ao deletar:', e);
            return fail(500, { error: 'Falha ao deletar arquivo' });
        }
    }
};
