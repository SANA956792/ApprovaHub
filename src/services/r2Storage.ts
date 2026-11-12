import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Primary Provider: Supabase Storage (Server-Side Only)
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabaseBucketName =
  process.env.SUPABASE_BUCKET_NAME?.trim() || 'approval-attachments';

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseServiceRoleKey &&
    !supabaseUrl.startsWith('YOUR_') &&
    !supabaseServiceRoleKey.startsWith('YOUR_')
);

let supabaseAdmin: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Legacy Provider Support: Preserve read access for any historical R2 attachments
const r2AccountId = process.env.R2_ACCOUNT_ID?.trim();
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const r2BucketName = process.env.R2_BUCKET_NAME?.trim() || 'approval-attachments';
const r2Endpoint =
  process.env.R2_ENDPOINT?.trim() ||
  (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : '');

const isLegacyR2Configured = Boolean(
  r2AccessKeyId &&
    r2SecretAccessKey &&
    r2Endpoint &&
    !r2AccessKeyId.startsWith('YOUR_')
);

let legacyS3Client: S3Client | null = null;
if (isLegacyR2Configured) {
  legacyS3Client = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId!,
      secretAccessKey: r2SecretAccessKey!,
    },
  });
}

export type StorageProviderType = 'supabase' | 'postgres' | 'r2';

export interface UploadResult {
  storageKey: string;
  storageProvider: StorageProviderType;
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

  if (isSupabaseConfigured && supabaseAdmin) {
    let { error } = await supabaseAdmin.storage
      .from(supabaseBucketName)
      .upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    // If bucket does not exist yet in Supabase project, create private bucket and retry once
    if (
      error &&
      (error.message?.toLowerCase().includes('not found') ||
        error.message?.toLowerCase().includes('bucket'))
    ) {
      await supabaseAdmin.storage
        .createBucket(supabaseBucketName, { public: false })
        .catch(() => {});

      const retry = await supabaseAdmin.storage
        .from(supabaseBucketName)
        .upload(storageKey, buffer, {
          contentType: mimeType,
          upsert: false,
        });
      error = retry.error;
    }

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    return {
      storageKey,
      storageProvider: 'supabase',
      fileData: null,
    };
  }

  // Permanent PostgreSQL base64 fallback when Supabase Storage credentials are not configured.
  // Never relies on Render's temporary local disk filesystem.
  return {
    storageKey,
    storageProvider: 'postgres',
    fileData: buffer.toString('base64'),
  };
}

export async function getAttachmentSignedDownloadUrl(
  storageKey: string,
  storageProvider: string = 'supabase'
): Promise<string | null> {
  if (storageProvider === 'supabase') {
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return null;
    }
    const { data, error } = await supabaseAdmin.storage
      .from(supabaseBucketName)
      .createSignedUrl(storageKey, 3600); // 1-hour expiry (3600 seconds)

    if (error || !data?.signedUrl) {
      console.error('Failed to create Supabase signed URL:', error?.message);
      return null;
    }
    return data.signedUrl;
  }

  // Preserve access to existing historical R2 attachments
  if (storageProvider === 'r2' && isLegacyR2Configured && legacyS3Client) {
    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: storageKey,
    });
    return await getSignedUrl(legacyS3Client, command, { expiresIn: 3600 });
  }

  return null;
}

export function getStorageStatus() {
  return {
    provider: isSupabaseConfigured ? 'supabase' : 'postgres',
    configured: isSupabaseConfigured,
    bucket: supabaseBucketName,
    mode: isSupabaseConfigured
      ? 'Supabase Storage'
      : 'PostgreSQL Permanent Binary Store',
  };
}

// Keep alias so any external callers remain compatible
export const getR2Status = getStorageStatus;
