/** CSPP Alumni promotion space: fiche promotion + groupe de discussion réel, branché sur server/routers/messaging.ts. */
import { useEffect, useState } from "react";
import { ArrowLeft, Paperclip, Send, UsersRound, X } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { Avatar, Panel } from "@/components/UiPrimitives";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProfileOverlay } from "@/contexts/ProfileOverlayContext";
import { trpc } from "@/lib/trpc";
import { storageUrl } from "@/lib/storageUrl";
import { uploadFile } from "@/lib/upload";

export default function PromotionDetail() {
  const { id } = useParams<{ id: string }>();
  const promotionId = Number(id);
  const { user } = useAuth();
  const isVerified = user?.accountStatus === "verified";
  const utils = trpc.useUtils();
  const { openProfile } = useProfileOverlay();

  const promotionsQuery = trpc.account.promotions.useQuery();
  const promotion = promotionsQuery.data?.find((item) => item.id === promotionId);

  const [conversationId, setConversationId] = useState<number | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const joinChat = trpc.messaging.joinPromotionChat.useMutation({
    onSuccess: (data) => setConversationId(data.conversationId),
    onError: (error) => toast.error(error.message),
  });

  const membersQuery = trpc.messaging.conversationMembers.useQuery({ conversationId: conversationId ?? 0 }, { enabled: Boolean(conversationId) });
  const messagesQuery = trpc.messaging.messages.useQuery({ conversationId: conversationId ?? 0 }, { enabled: Boolean(conversationId), refetchInterval: 4000 });
  const markRead = trpc.messaging.markRead.useMutation();

  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{ storageKey: string; originalName: string; mimeType: string; sizeBytes: number } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const sendMessage = trpc.messaging.send.useMutation({
    onSuccess: () => {
      setDraft("");
      setPendingAttachment(null);
      utils.messaging.messages.invalidate({ conversationId: conversationId ?? 0 });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleJoin = () => {
    if (!isVerified) {
      toast.info("Vérifiez votre compte pour rejoindre l'espace de discussion de la promotion.");
      return;
    }
    joinChat.mutate({ promotionId });
  };

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingAttachment(true);
    try {
      setPendingAttachment(await uploadFile(file, "message_attachment"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'envoi de la pièce jointe.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!conversationId || (!draft.trim() && !pendingAttachment)) return;
    sendMessage.mutate({ conversationId, body: draft.trim() || undefined, attachments: pendingAttachment ? [pendingAttachment] : undefined });
  };

  const lastMessageId = messagesQuery.data?.at(-1)?.id;
  useEffect(() => {
    if (conversationId && lastMessageId) {
      markRead.mutate({ conversationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, lastMessageId]);

  if (promotionsQuery.isLoading) return <p className="text-sm text-[#707787]">Chargement...</p>;

  if (!promotion) {
    return (
      <div className="mx-auto max-w-4xl">
        <Link href="/promotions" className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[#5F6978] hover:text-[#0E1D36]">
          <ArrowLeft size={16} /> Retour aux promotions
        </Link>
        <Panel className="p-10 text-center">
          <p className="font-editorial text-2xl font-semibold text-[#10213D]">Cette promotion n'existe pas.</p>
        </Panel>
      </div>
    );
  }

  const messages = messagesQuery.data ?? [];
  const members = membersQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/promotions" className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[#5F6978] hover:text-[#0E1D36]">
        <ArrowLeft size={16} /> Retour aux promotions
      </Link>
      <div className="overflow-hidden rounded-2xl border border-[#E1DDD6] bg-white shadow-[0_8px_30px_rgba(10,32,63,0.07)]">
        <div className="bg-[#102846] px-5 py-7 text-white sm:px-9 sm:py-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#D7E1ED]">Espace de promotion</p>
          <h1 className="mt-2 font-editorial text-[30px] font-semibold leading-[0.98] tracking-[-0.03em] sm:text-[48px] sm:leading-[0.95]">{promotion.label ?? `Promotion ${promotion.year}`}</h1>
          <p className="mt-4 flex items-center gap-2 text-sm text-[#D8DFE9]">
            <UsersRound size={17} />
            {promotion.memberCount} diplômé{promotion.memberCount > 1 ? "s" : ""}
          </p>
        </div>

        <section className="flex h-[min(72dvh,640px)] min-h-[420px] flex-col">
          {!conversationId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="max-w-sm text-sm leading-6 text-[#647085]">Rejoignez le groupe de discussion de votre promotion pour échanger avec vos camarades de cohorte.</p>
              <button onClick={handleJoin} disabled={joinChat.isPending} className="rounded-lg bg-black px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#17233B] disabled:opacity-50">
                {joinChat.isPending ? "Connexion..." : "Rejoindre la discussion"}
              </button>
            </div>
          ) : (
            <>
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E8E3DA] bg-[#FCFBF8] px-4 py-2.5 sm:px-5">
                <p className="truncate text-xs font-bold text-[#293446]">Discussion de promotion</p>
                <button onClick={() => setMembersOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E0DAD0] bg-white px-3 py-1.5 text-[11px] font-bold text-[#536174] transition hover:bg-[#F5F1EA]">
                  <UsersRound size={13} /> {members.length} membre{members.length > 1 ? "s" : ""}
                </button>
              </header>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#FDFBF7] p-4 sm:p-5">
                {messages.length === 0 && <p className="mt-16 text-center text-sm text-[#6C7684]">Soyez le premier à écrire dans ce groupe.</p>}
                {messages.map((message) => {
                  const isMine = message.senderId === user?.id;
                  const sender = members.find((m) => m.userId === message.senderId);
                  return (
                    <div key={message.id} className={isMine ? "ml-auto w-fit max-w-[85%] sm:max-w-[80%]" : "w-fit max-w-[85%] sm:max-w-[80%]"}>
                      {!isMine && sender && (
                        <button onClick={() => openProfile(sender.userId)} className="mb-1 flex items-center gap-1.5 px-1 text-left transition hover:opacity-80">
                          <Avatar alt={sender.name ?? "Alumni"} src={storageUrl(sender.avatarStorageKey)} size="sm" className="h-5 w-5 text-[9px]" />
                          <span className="text-[10px] font-extrabold text-[#8B661D]">{sender.name ?? "Alumni"}</span>
                        </button>
                      )}
                      <div className={isMine ? "rounded-2xl rounded-br-sm bg-[#152C4C] p-3 text-xs text-white" : "rounded-2xl rounded-bl-sm bg-white p-3 text-xs text-[#3D495B] shadow-sm"}>
                        {message.body}
                        {message.attachments?.map((attachment) => (
                          <a key={attachment.id} href={storageUrl(attachment.storageKey)} target="_blank" rel="noreferrer" className={`mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-bold ${isMine ? "border-white/25 text-white" : "border-[#E4E1D9] text-[#3D495B]"}`}>
                            <Paperclip size={13} /> {attachment.originalName}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleSend} className="shrink-0 border-t border-[#E8E3DA] bg-white p-3">
                {pendingAttachment && <p className="mb-2 rounded-lg bg-[#F1F3F8] px-3 py-2 text-[11px] font-bold text-[#3D495B]">{pendingAttachment.originalName}</p>}
                <div className="flex items-center gap-2">
                  <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-[#536174] hover:bg-[#F1F3F8]">
                    <Paperclip size={19} />
                    <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={handleAttachmentChange} disabled={uploadingAttachment} />
                  </label>
                  <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Écrire au groupe…" className="h-10 min-w-0 flex-1 rounded-full border border-[#D9D5CE] bg-[#FDFBF7] px-4 text-xs outline-none" />
                  <button disabled={sendMessage.isPending} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white disabled:opacity-50">
                    <Send size={17} />
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      {membersOpen && (
        <div role="presentation" onClick={() => setMembersOpen(false)} className="fixed inset-0 z-[90] flex items-end justify-center bg-[#091830]/45 backdrop-blur-[2px] sm:items-center sm:p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Membres du groupe"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[80dvh] w-full overflow-y-auto rounded-t-[1.5rem] bg-white shadow-[0_-12px_34px_rgba(10,25,48,0.2)] sm:max-w-sm sm:rounded-2xl sm:shadow-[0_20px_60px_rgba(10,25,48,0.28)]"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-[#EEEAE3] bg-white px-5 py-4">
              <p className="text-sm font-bold text-[#142039]">Membres du groupe ({members.length})</p>
              <button onClick={() => setMembersOpen(false)} aria-label="Fermer" className="grid h-8 w-8 place-items-center rounded-full text-[#26354E] hover:bg-[#F1EBDD]">
                <X size={17} />
              </button>
            </div>
            <div className="space-y-1 p-3">
              {members.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => {
                    setMembersOpen(false);
                    openProfile(member.userId);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[#F7F3ED]"
                >
                  <Avatar alt={member.name ?? "Alumni"} src={storageUrl(member.avatarStorageKey)} size="sm" />
                  <span className="truncate text-xs font-bold text-[#293446]">{member.name}</span>
                </button>
              ))}
              {members.length === 0 && <p className="p-3 text-[11px] text-[#9AA1AA]">Aucun membre pour l'instant.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
