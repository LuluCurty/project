import { S3Client } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: 'http://localhost:17017',
    credentials: {
        accessKeyId: 'AKIAK7ME4Z4NQ2ZFWKJK',
        secretAccessKey: '2=7M/NVvZ6HLa1Cz727yyI=RgQTIMWgCRm2+sq9p'
    },
    forcePathStyle: true
});

export const BUCKETS = {
    forms: 'forms',
    tasks: 'tasks'
} as const;

export type BucketName = keyof typeof BUCKETS;
