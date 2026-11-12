import * as webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { appSettings, pushSubscriptions } from '../db/schema.ts';

let vapidKeysCache: { publicKey: string; privateKey: string; subject: string } | null = null;

export async function initVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
  subject: string;
}> {
  if (vapidKeysCache) {
    return vapidKeysCache;
  }

  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  const envSub = process.env.VAPID_SUBJECT || 'mailto:admin@ibat.in';

  if (
    envPub &&
    envPriv &&
    !envPub.startsWith('YOUR_') &&
    !envPriv.startsWith('YOUR_')
  ) {
    vapidKeysCache = {
      publicKey: envPub,
      privateKey: envPriv,
      subject: envSub,
    };
    webpush.setVapidDetails(envSub, envPub, envPriv);
    return vapidKeysCache;
  }

  try {
    const existingPub = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.settingKey, 'vapid_public_key'));
    const existingPriv = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.settingKey, 'vapid_private_key'));

    if (existingPub.length > 0 && existingPriv.length > 0) {
      vapidKeysCache = {
        publicKey: existingPub[0].settingValue,
        privateKey: existingPriv[0].settingValue,
        subject: envSub,
      };
      webpush.setVapidDetails(
        vapidKeysCache.subject,
        vapidKeysCache.publicKey,
        vapidKeysCache.privateKey
      );
      return vapidKeysCache;
    }

    const generated = webpush.generateVAPIDKeys();
    await db
      .insert(appSettings)
      .values({
        settingKey: 'vapid_public_key',
        settingValue: generated.publicKey,
      })
      .onConflictDoUpdate({
        target: appSettings.settingKey,
        set: { settingValue: generated.publicKey },
      });

    await db
      .insert(appSettings)
      .values({
        settingKey: 'vapid_private_key',
        settingValue: generated.privateKey,
      })
      .onConflictDoUpdate({
        target: appSettings.settingKey,
        set: { settingValue: generated.privateKey },
      });

    vapidKeysCache = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      subject: envSub,
    };
    webpush.setVapidDetails(envSub, generated.publicKey, generated.privateKey);
    return vapidKeysCache;
  } catch (error) {
    console.error('Failed to initialize VAPID keys from database:', error);
    const fallback = webpush.generateVAPIDKeys();
    vapidKeysCache = {
      publicKey: fallback.publicKey,
      privateKey: fallback.privateKey,
      subject: envSub,
    };
    webpush.setVapidDetails(envSub, fallback.publicKey, fallback.privateKey);
    return vapidKeysCache;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  relatedRequestId?: number | null;
  relatedGroupId?: number | null;
  tag?: string;
}

export async function sendWebPushToUser(
  userId: number,
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  try {
    await initVapidKeys();
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    let sent = 0;
    let removed = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: '/assets/aistudio/Ibat_Logo__2___1__de631039.png',
            badge: '/assets/aistudio/Ibat_Logo__2___1__de631039.png',
            url: payload.url || '/',
            relatedRequestId: payload.relatedRequestId || null,
            relatedGroupId: payload.relatedGroupId || null,
            tag: payload.tag || `approval-${Date.now()}`,
          })
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
          removed++;
        } else {
          console.error('Web push send error for subscription:', err?.message);
        }
      }
    }

    return { sent, removed };
  } catch (error) {
    console.error('Failed to send web push notification:', error);
    return { sent: 0, removed: 0 };
  }
}
