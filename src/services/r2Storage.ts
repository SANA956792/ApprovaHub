import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME || 'approval-attachments';
const r2Endpoint =
  process.env.R2_ENDPOINT ||
  (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : '');

const isR2Configured = Boolean(
  r2AccessKeyId &&
    r2SecretAccessKey &&
    r2Endpoint &&
    !r2AccessKeyId.startsWith('YOUR_')
);

let s3Client: S3Client | null = null;

if (isR2Configured) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId!,
      secretAccessKey: r2SecretAccessKey!,
    },
  });
}

export interface UploadResult {
  storageKey: string;
  storageProvider: 'r2' | 'postgres';
  fileData: string | null;
}

export async function uploadAttachmentFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadResult> {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = crypto.randomBytes(12).toString('hex');
  const storageKey = `attachments/${new Date().getFullYear()}/${uniqueId}-${safeName}`;

  if (isR2Configured && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: r2BucketName,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return {
      storageKey,
      storageProvider: 'r2',
      fileData: null,
    };
  }

  // Permanent PostgreSQL base64 storage when Cloudflare R2 credentials are not set in environment.
  // Never relies on temporary local disk filesystem.
  return {
    storageKey,
    storageProvider: 'postgres',
    fileData: buffer.toString('base64'),
  };
}

export async function getAttachmentSignedDownloadUrl(
  storageKey: string
): Promise<string | null> {
  if (!isR2Configured || !s3Client) {
    return null;
  }
  const command = new GetObjectCommand({
    Bucket: r2BucketName,
    Key: storageKey,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export function getR2Status() {
  return {
    configured: isR2Configured,
    bucket: r2BucketName,
    mode: isR2Configured ? 'Cloudflare R2' : 'PostgreSQL Permanent Binary Store',
  };
}
