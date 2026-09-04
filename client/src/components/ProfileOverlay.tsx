/**
 * Fiche profil affichée en superposition (façon LinkedIn) au dessus de la
 * page courante — pas de navigation, on reste où on était (fil, post,
 * conversation, annuaire...). Ouverte via useProfileOverlay().openProfile(userId).
 */
import { useEffect } from "react";
import { Briefcase, Clock, GraduationCap, Loader2, MapPin, MessageCircle, ShieldCheck, UserCheck, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Avatar } from "@/components/UiPrimitives";
import { storageUrl } from "@/lib/storageUrl";
import { trpc } from "@/lib/trpc";

export function ProfileOverlay({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const profileQuery = trpc.account.publicProfile.useQuery({ userId });

  // Échap pour fermer, et on bloque le scroll de la page en dessous pendant que la superposition est ouverte.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const sendRequest = trpc.network.sendRequest.useMutation({
    onSuccess: () => {
      utils.network.pending.invalidate();
      utils.account.publicProfile.invalidate({ userId });
      toast.success("Invitation envoyée.");
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelConnection = trpc.network.cancel.useMutation({
    onSuccess: () => {
      utils.network.pending.invalidate();
      utils.network.list.invalidate();
      utils.account.publicProfile.invalidate({ userId });
    },
    onError: (error) => toast.error(error.message),
  });

  const startConversation = trpc.messaging.startConversation.useMutation({
    onSuccess: (data) => {
      if (!data) return;
      onClose();
      setLocation(`/messages?c=${data.conversationId}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const profile = profileQuery.data;

  return (
    <div role="presentation" onClick={onClose} className="fixed inset-0 z-[90] flex items-end justify-center bg-[#091830]/45 backdrop-blur-[2px] sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={profile ? `Profil de ${profile.name}` : "Profil"}
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.5rem] bg-white shadow-[0_-12px_34px_rgba(10,25,48,0.2)] sm:max-w-md sm:rounded-2xl sm:shadow-[0_20px_60px_rgba(10,25,48,0.28)]"
      >
        <button onClick={onClose} aria-label="Fermer le profil" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#26354E] shadow-sm transition hover:bg-[#F1EBDD] active:scale-95">
          <X size={18} />
        </button>

        <div className="h-20 rounded-t-[1.5rem] bg-gradient-to-r from-[#0A1931] to-[#1D3A63] sm:rounded-t-2xl" />

        {profileQuery.isLoading && (
          <div className="grid place-items-center gap-2 px-6 pb-10 pt-2 text-center text-sm text-[#697485]">
            <Loader2 className="mt-6 animate-spin text-[#8B742F]" size={22} />
            Chargement du profil...
          </div>
        )}

        {!profileQuery.isLoading && !profile && (
          <div className="px-6 pb-10 pt-2 text-center text-sm text-[#697485]">
            <p className="mt-6">Ce profil n'est plus disponible.</p>
          </div>
        )}

        {profile && (
          <div className="px-6 pb-6">
            <Avatar alt={profile.name ?? "Alumni"} src={storageUrl(profile.avatarStorageKey)} size="lg" className="-mt-10 h-20 w-20 border-4 border-white text-xl shadow-sm" />

            <div className="mt-3 flex items-center gap-1.5">
              <h2 className="font-editorial text-[26px] font-semibold leading-6 text-[#0B1931]">{profile.name}</h2>
              {profile.accountStatus === "verified" && <ShieldCheck size={17} className="shrink-0 text-[#2563A8]" aria-label="Compte vérifié" />}
            </div>
            {profile.headline && <p className="mt-1 text-sm font-semibold text-[#354254]">{profile.headline}</p>}

            <div className="mt-3 space-y-1.5 text-xs text-[#586173]">
              {(profile.jobTitle || profile.organization) && (
                <p className="flex items-center gap-1.5">
                  <Briefcase size={13} className="shrink-0" />
                  {[profile.jobTitle, profile.organization].filter(Boolean).join(" · ")}
                </p>
              )}
              {profile.location && (
                <p className="flex items-center gap-1.5">
                  <MapPin size={13} className="shrink-0" /> {profile.location}
                </p>
              )}
              {profile.promotionYear && (
                <p className="flex items-center gap-1.5">
                  <GraduationCap size={13} className="shrink-0" /> Promotion {profile.promotionYear}
                </p>
              )}
            </div>

            {profile.mentorAvailable && (
              <span className="mt-3 inline-block rounded-full bg-[#F1F2F5] px-2.5 py-1 text-[10px] font-bold text-[#586272]">
                Mentor disponible{Array.isArray(profile.mentorTopics) && profile.mentorTopics.length ? ` · ${(profile.mentorTopics as string[]).join(", ")}` : ""}
              </span>
            )}

            {profile.bio && <p className="mt-4 whitespace-pre-line text-xs leading-5 text-[#4B5666]">{profile.bio}</p>}

            {!profile.isSelf && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#EEEAE3] pt-4">
                <button
                  onClick={() => startConversation.mutate({ userId })}
                  disabled={startConversation.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0A1931] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#172B4B] active:scale-[0.98] disabled:opacity-60"
                >
                  <MessageCircle size={15} /> Envoyer un message
                </button>

                {profile.connectionStatus === "accepted" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#1F6A54] bg-[#DFF3EA] px-3 py-2.5 text-[11px] font-bold text-[#1F6A54]">
                    <UserCheck size={15} /> Connecté
                  </span>
                ) : profile.connectionStatus === "pending" ? (
                  <button onClick={() => cancelConnection.mutate({ userId })} disabled={cancelConnection.isPending} className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9B46A] bg-[#F7E4BA] px-3 py-2.5 text-[11px] font-bold text-[#684D16] transition hover:bg-[#F1D89E]">
                    <Clock size={15} /> Invitation envoyée
                  </button>
                ) : (
                  <button onClick={() => sendRequest.mutate({ userId })} disabled={sendRequest.isPending} className="inline-flex items-center gap-1.5 rounded-xl border border-[#142039] px-3 py-2.5 text-[11px] font-bold text-[#142039] transition hover:bg-[#142039] hover:text-white">
                    <UserPlus size={15} /> Se connecter
                  </button>
                )}
              </div>
            )}
            {profile.isSelf && <p className="mt-5 flex items-center gap-1.5 border-t border-[#EEEAE3] pt-4 text-[11px] font-bold text-[#8B9099]">C'est votre profil.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
