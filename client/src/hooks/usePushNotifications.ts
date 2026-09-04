/**
 * Notifications push réelles (alerte système, même navigateur/onglet fermé),
 * branchées sur server/routers/push.ts. L'abonnement est déclenché par un
 * geste explicite de l'utilisateur (bouton dans Réglages), comme l'exigent
 * les navigateurs pour la demande de permission de notification.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { isPushSupported, registerPushServiceWorker, urlBase64ToUint8Array } from "@/lib/push";

export function usePushNotifications() {
  const supported = isPushSupported();
  const [permission, setPermission] = useState<NotificationPermission>(() => (supported ? Notification.permission : "denied"));
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  const utils = trpc.useUtils();
  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  // Vérifie l'état réel côté navigateur (source de vérité : le PushManager de CE device),
  // plutôt que de se fier uniquement au serveur qui peut avoir des abonnements d'autres appareils.
  useEffect(() => {
    if (!supported) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const existing = await registration?.pushManager.getSubscription();
        if (!cancelled) setSubscribed(Boolean(existing));
      } catch {
        if (!cancelled) setSubscribed(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported) {
      toast.error("Les notifications push ne sont pas prises en charge par ce navigateur.");
      return;
    }
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        toast.info("Autorisez les notifications dans votre navigateur pour les activer.");
        return;
      }

      const registration = await registerPushServiceWorker();
      if (!registration) throw new Error("Impossible d'enregistrer le service worker.");

      const publicKey = (await utils.push.publicKey.fetch()).publicKey;
      if (!publicKey) throw new Error("Clé de notification indisponible.");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Abonnement push invalide.");

      await subscribeMutation.mutateAsync({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      setSubscribed(true);
      toast.success("Notifications push activées sur cet appareil.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'activer les notifications push.");
    } finally {
      setBusy(false);
    }
  }, [supported, utils, subscribeMutation]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      if (existing) {
        await unsubscribeMutation.mutateAsync({ endpoint: existing.endpoint });
        await existing.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notifications push désactivées sur cet appareil.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de désactiver les notifications push.");
    } finally {
      setBusy(false);
    }
  }, [unsubscribeMutation]);

  return { supported, permission, subscribed, checking, busy, enable, disable };
}
