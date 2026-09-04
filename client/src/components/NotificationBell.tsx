/** CSPP Alumni notification bell: composant partagé entre l'espace membre et l'espace admin, branché sur server/routers/notifications.ts. */
import { Bell, BellPlus } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function formatRelativeTime(date: string | Date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export function NotificationBell({ buttonClassName }: { buttonClassName?: string }) {
  const utils = trpc.useUtils();
  const push = usePushNotifications();
  const unreadCountQuery = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 15000 });
  const notificationsQuery = trpc.notifications.list.useQuery({}, { refetchInterval: 15000 });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
      toast.success("Notifications marquées comme lues.");
    },
  });

  const unreadCount = unreadCountQuery.data ?? 0;
  const notifications = notificationsQuery.data ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Notifications" className={buttonClassName ?? "relative grid h-9 w-9 place-items-center rounded-full text-[#162038] transition hover:bg-[#F1EBDD] active:scale-95"}>
          <Bell size={20} />
          {unreadCount > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full border border-white bg-[#A5232A] px-1 text-[9px] font-extrabold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-[#EEEAE3] px-4 py-3">
          <p className="text-sm font-bold text-[#142039]">Notifications</p>
          {unreadCount > 0 && (
            <button onClick={() => markAllRead.mutate()} className="text-[11px] font-bold text-[#8B661D] hover:underline">
              Tout marquer comme lu
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && <p className="p-4 text-xs text-[#8A9099]">Aucune notification pour l'instant.</p>}
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.link ?? "#"}
              onClick={() => !notification.readAt && markRead.mutate({ notificationId: notification.id })}
              className={`block border-b border-[#F1EEE7] px-4 py-3 text-left transition last:border-0 hover:bg-[#FAF7F0] ${!notification.readAt ? "bg-[#FFFBF0]" : ""}`}
            >
              <p className="text-xs font-bold text-[#1D2B41]">{notification.title}</p>
              {notification.body && <p className="mt-1 text-[11px] leading-4 text-[#6C7788]">{notification.body}</p>}
              <p className="mt-1 text-[10px] text-[#9A9A98]">{formatRelativeTime(notification.createdAt)}</p>
            </Link>
          ))}
        </div>
        {push.supported && !push.subscribed && push.permission !== "denied" && !push.checking && (
          <button onClick={() => push.enable()} disabled={push.busy} className="flex w-full items-center gap-2 border-t border-[#EEEAE3] px-4 py-2.5 text-left text-xs font-bold text-[#8B661D] hover:bg-[#FAF7F0]">
            <BellPlus size={15} /> {push.busy ? "Activation..." : "Activer les notifications sur ce téléphone"}
          </button>
        )}
        <Link href="/notifications" className="block border-t border-[#EEEAE3] px-4 py-2.5 text-center text-xs font-bold text-[#173A67] hover:bg-[#FAF7F0]">
          Voir toutes les notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
