/** CSPP Alumni directory: annuaire réel branché sur server/routers/account.ts et network.ts. */
import { useMemo, useState } from "react";
import { Check, MapPin, Search, SlidersHorizontal, UserCheck, UserPlus, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Avatar, PageIntro, Panel } from "@/components/UiPrimitives";
import { storageUrl } from "@/lib/storageUrl";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProfileOverlay } from "@/contexts/ProfileOverlayContext";
import { trpc } from "@/lib/trpc";

export default function Directory() {
  const [location] = useLocation();
  const preset = new URLSearchParams(location.split("?")[1] ?? "").get("q") ?? "";
  const [search, setSearch] = useState(preset);
  const [promotionId, setPromotionId] = useState<number | null>(null);
  const [mentorOnly, setMentorOnly] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { user } = useAuth();
  const isVerified = user?.accountStatus === "verified";
  const utils = trpc.useUtils();
  const { openProfile } = useProfileOverlay();

  const promotionsQuery = trpc.account.promotions.useQuery();
  const directoryQuery = trpc.account.directory.useQuery({ search: search || undefined, promotionId: promotionId ?? undefined, mentorOnly: mentorOnly || undefined, limit: 48 });
  const connectionsQuery = trpc.network.list.useQuery();
  const pendingQuery = trpc.network.pending.useQuery();

  const statusFor = useMemo(() => {
    const map = new Map<number, "connected" | "pending">();
    connectionsQuery.data?.forEach((connection) => map.set(connection.otherUserId, "connected"));
    pendingQuery.data?.outgoing.forEach((request) => map.set(request.otherUserId, "pending"));
    return map;
  }, [connectionsQuery.data, pendingQuery.data]);

  const sendRequest = trpc.network.sendRequest.useMutation({
    onSuccess: (_data, variables) => {
      utils.network.pending.invalidate();
      toast.success("Invitation envoyée.");
      void variables;
    },
    onError: (error) => toast.error(error.message),
  });

  const promotionOptions = promotionsQuery.data ?? [];
  const visible = directoryQuery.data?.items ?? [];
  const resetFilters = () => {
    setSearch("");
    setPromotionId(null);
    setMentorOnly(false);
  };
  const activeFilters = (promotionId ? 1 : 0) + (mentorOnly ? 1 : 0);

  const handleConnect = (targetUserId: number) => {
    if (!isVerified) {
      toast.info("Vérifiez votre compte pour envoyer des invitations de connexion.");
      return;
    }
    sendRequest.mutate({ userId: targetUserId });
  };

  return (
    <div>
      <PageIntro eyebrow="Annuaire CSPP" title="Trouver les bonnes personnes." description="Recherchez, retrouvez et activez les diplômés qui peuvent enrichir vos projets et vos trajectoires." />
      <div className="sticky top-16 z-20 -mx-4 mb-5 border-y border-[#E5E0D8] bg-[#FDFBF7]/95 px-4 py-3 shadow-[0_7px_16px_rgba(14,30,53,0.07)] backdrop-blur-xl lg:hidden">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717985]" size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, métier ou entreprise…" className="h-11 w-full rounded-xl border border-[#DDD8D0] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#0A1931] focus:ring-4 focus:ring-[#E1E8F2]" />
          </label>
          <button onClick={() => setMobileFilterOpen(true)} aria-label="Ouvrir les filtres" aria-haspopup="dialog" aria-expanded={mobileFilterOpen} className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition active:scale-95 ${activeFilters ? "border-[#C59C45] bg-[#F4D994] text-[#533A0A]" : "border-[#D9D5CE] bg-white text-[#142039] hover:bg-[#F5F0E7]"}`}>
            <SlidersHorizontal size={19} />
            {activeFilters > 0 ? <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#A5232A] px-1 text-[9px] font-extrabold text-white">{activeFilters}</span> : null}
          </button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
        <DesktopFilters promotionOptions={promotionOptions} promotionId={promotionId} setPromotionId={setPromotionId} mentorOnly={mentorOnly} setMentorOnly={setMentorOnly} />
        <section>
          <div className="relative hidden lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#717985]" size={20} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, métier ou entreprise…" className="h-12 w-full rounded-xl border border-[#DDD8D0] bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#0A1931] focus:ring-4 focus:ring-[#E1E8F2]" />
          </div>
          <p className="text-xs text-[#697382] lg:mt-4">
            <strong className="text-[#1B2941]">{visible.length} alumni</strong> correspondent à votre recherche
          </p>
          {directoryQuery.isLoading && <p className="mt-4 text-sm text-[#707787]">Chargement de l'annuaire...</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((person) => {
              const status = statusFor.get(person.userId);
              return (
                <Panel key={person.userId} className="p-4 transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(10,32,63,0.09)]">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => openProfile(person.userId)} aria-label={`Voir le profil de ${person.name ?? "cet alumni"}`} className="rounded-full transition hover:opacity-80 active:scale-95">
                      <Avatar alt={person.name ?? "Alumni"} src={storageUrl(person.avatarStorageKey)} />
                    </button>
                    <button
                      onClick={() => (status ? undefined : handleConnect(person.userId))}
                      disabled={Boolean(status)}
                      className={`grid h-8 w-8 place-items-center rounded-full border transition ${status === "connected" ? "border-[#1F6A54] bg-[#DFF3EA] text-[#1F6A54]" : status === "pending" ? "border-[#D9B46A] bg-[#F7E4BA] text-[#684D16]" : "border-[#142039] hover:bg-[#142039] hover:text-white"}`}
                      aria-label={status === "connected" ? "Déjà connecté" : status === "pending" ? "Invitation en attente" : `Se connecter à ${person.name}`}
                    >
                      {status === "connected" ? <UserCheck size={16} /> : status === "pending" ? <Clock size={16} /> : <UserPlus size={16} />}
                    </button>
                  </div>
                  <button onClick={() => openProfile(person.userId)} className="mt-3 block text-left transition hover:underline">
                    <h2 className="font-editorial text-[24px] font-semibold leading-5 text-[#0B1931]">{person.name}</h2>
                  </button>
                  <p className="mt-1 text-xs font-bold text-[#4B5666]">{person.jobTitle ?? "—"}</p>
                  <p className="mt-1 text-[11px] text-[#78808B]">
                    {person.organization ?? "Alumni CSPP"} {person.promotionYear ? `· Promo ${person.promotionYear}` : ""}
                  </p>
                  {person.location && (
                    <p className="mt-3 flex items-center gap-1 text-[11px] text-[#707986]">
                      <MapPin size={14} />
                      {person.location}
                    </p>
                  )}
                  {person.mentorAvailable && <span className="mt-3 inline-block rounded-full bg-[#F1F2F5] px-2 py-1 text-[10px] font-bold text-[#586272]">Mentor disponible</span>}
                </Panel>
              );
            })}
          </div>
          {!directoryQuery.isLoading && visible.length === 0 ? (
            <Panel className="mt-4 p-10 text-center">
              <p className="font-editorial text-2xl font-semibold text-[#13223A]">Élargissez votre recherche.</p>
              <button onClick={resetFilters} className="mt-2 text-xs font-bold text-[#966D20] underline">
                Effacer les filtres
              </button>
            </Panel>
          ) : null}
        </section>
      </div>
      {mobileFilterOpen ? (
        <MobileFilters promotionOptions={promotionOptions} promotionId={promotionId} setPromotionId={setPromotionId} mentorOnly={mentorOnly} setMentorOnly={setMentorOnly} activeFilters={activeFilters} resultCount={visible.length} onClose={() => setMobileFilterOpen(false)} onReset={resetFilters} />
      ) : null}
    </div>
  );
}

type PromotionOption = { id: number; year: number; label: string | null };

function FilterOptions({ promotionOptions, promotionId, setPromotionId, mentorOnly, setMentorOnly }: { promotionOptions: PromotionOption[]; promotionId: number | null; setPromotionId: (value: number | null) => void; mentorOnly: boolean; setMentorOnly: (value: boolean) => void }) {
  return (
    <>
      <div className="mt-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#8B742F]">Promotion</p>
        <div className="mt-2 space-y-1">
          <button onClick={() => setPromotionId(null)} className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${promotionId === null ? "bg-[#F2D99F] text-[#573D0C]" : "text-[#636D7C] hover:bg-[#F6F2EB]"}`}>
            Toutes les promotions
          </button>
          {promotionOptions.map((promotion) => (
            <button key={promotion.id} onClick={() => setPromotionId(promotion.id)} className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${promotionId === promotion.id ? "bg-[#F2D99F] text-[#573D0C]" : "text-[#636D7C] hover:bg-[#F6F2EB]"}`}>
              {promotion.label ?? `Promotion ${promotion.year}`}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 border-t border-[#EEE9E0] pt-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#8B742F]">Disponibilité</p>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-[#687080]">
          <input type="checkbox" checked={mentorOnly} onChange={(event) => setMentorOnly(event.target.checked)} className="accent-[#182943]" /> Mentors disponibles uniquement
        </label>
      </div>
    </>
  );
}

function DesktopFilters(props: { promotionOptions: PromotionOption[]; promotionId: number | null; setPromotionId: (value: number | null) => void; mentorOnly: boolean; setMentorOnly: (value: boolean) => void }) {
  return (
    <Panel className="hidden h-fit p-5 lg:block">
      <div className="flex items-center gap-2 text-sm font-bold text-[#142039]">
        <SlidersHorizontal size={18} /> Affiner la recherche
      </div>
      <FilterOptions {...props} />
    </Panel>
  );
}

function MobileFilters(props: { promotionOptions: PromotionOption[]; promotionId: number | null; setPromotionId: (value: number | null) => void; mentorOnly: boolean; setMentorOnly: (value: boolean) => void; activeFilters: number; resultCount: number; onClose: () => void; onReset: () => void }) {
  const { activeFilters, resultCount, onClose, onReset, ...filterProps } = props;
  return (
    <div className="fixed inset-0 z-[70] bg-[#091830]/35 backdrop-blur-[2px] lg:hidden" role="presentation" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label="Filtres de l'annuaire" onClick={(event) => event.stopPropagation()} className="absolute bottom-0 left-0 right-0 max-h-[82dvh] overflow-y-auto rounded-t-[1.5rem] bg-[#FDFBF7] shadow-[0_-12px_34px_rgba(10,25,48,0.2)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8E2D9] bg-[#FDFBF7]/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="font-editorial text-[28px] font-semibold leading-6 text-[#0A1931]">Filtrer l'annuaire</p>
            <p className="mt-1 text-[11px] text-[#727C89]">Affinez les profils que vous souhaitez rencontrer.</p>
          </div>
          <button onClick={onClose} aria-label="Fermer les filtres" className="grid h-10 w-10 place-items-center rounded-full text-[#26354E] hover:bg-[#F1EBDD] active:scale-95">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 pb-5">
          <FilterOptions {...filterProps} />
          <div className="mt-6 flex items-center gap-3 border-t border-[#E8E2D9] pt-4">
            <button onClick={onReset} className={`text-xs font-bold underline ${activeFilters ? "text-[#946917]" : "text-[#9AA1AA]"}`} disabled={!activeFilters}>
              Réinitialiser
            </button>
            <button onClick={onClose} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#0A1931] px-4 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#172B4B] active:scale-[0.98]">
              <Check size={16} /> Afficher {resultCount} alumni
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
