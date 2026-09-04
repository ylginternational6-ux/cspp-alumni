/**
 * Envoi de notifications push (Web Push standard, protocole VAPID) vers les
 * appareils abonnés d'un utilisateur. Fonctionne même navigateur/onglet
 * fermé : c'est le service worker (client/public/sw.js) qui reçoit
 * l'évènement `push` et affiche la notification système.
 *
 * Best-effort : toute erreur est journalisée sans jamais faire échouer
 * l'action métier qui a déclenché la notification (ex: envoyer un message
 * ne doit pas planter si l'envoi push échoue).
 */
import webpush from "web-push";
import { ENV } from "./_core/env";
import { listPushSubscriptions, removePushSubscriptionByEndpoint } from "./db/push";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(ENV.vapidSubject, ENV.vapidPublicKey, ENV.vapidPrivateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body?: string;
  link?: string;
  tag?: string;
};

/** Pousse une notification vers tous les appareils abonnés d'un utilisateur. */
export async function sendPushToUser(userId: number, payload: PushPayload) {
  try {
    ensureConfigured();
    const subscriptions = await listPushSubscriptions(userId);
    if (subscriptions.length === 0) return;

    const body = JSON.stringify({ title: payload.title, body: payload.body, link: payload.link ?? "/", tag: payload.tag });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, body);
        } catch (error) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          // 404/410 = abonnement expiré ou révoqué côté navigateur : on nettoie.
          if (statusCode === 404 || statusCode === 410) {
            await removePushSubscriptionByEndpoint(subscription.endpoint);
          } else {
            console.error("[push] échec d'envoi vers un abonné :", error);
          }
        }
      }),
    );
  } catch (error) {
    console.error("[push] échec général de l'envoi :", error);
  }
}
