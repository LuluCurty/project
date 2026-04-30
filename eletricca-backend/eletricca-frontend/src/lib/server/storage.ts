import { S3Client } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: 'https://intranet.eletricca.com.br:17017',
    credentials: {
        accessKeyId: 'AKIAK7ME4Z4NQ2ZFWKJK',
        secretAccessKey: '2=7M/NVvZ6HLa1Cz727yyI=RgQTIMWgCRm2+sq9p'
    },
    forcePathStyle: true,
    // VersityGW não suporta checksum automático do SDK v3 — sem isso
    // presigned URLs incluem x-amz-checksum-mode=ENABLED e são rejeitadas
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
});

export const BUCKETS = {
    forms:   'forms',
    tasks:   'tasks',
    users:   'users',
    reports: 'reports',
} as const;

export type BucketName = keyof typeof BUCKETS;
