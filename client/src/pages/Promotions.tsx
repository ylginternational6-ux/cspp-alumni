/** CSPP Alumni promotions: cohortes réelles, branchées sur server/routers/account.ts (account.promotions). */
import { ArrowUpRight, CalendarDays, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { PageIntro, Panel } from "@/components/UiPrimitives";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const palette = ["bg-[#10294D]", "bg-[#8E681B]", "bg-[#286146]", "bg-[#9E323A]", "bg-[#4B5568]"];

export default function Promotions() {
  const { user } = useAuth();
  const overviewQuery = trpc.account.overview.useQuery(undefined, { enabled: Boolean(user) });
  const promotionsQuery = trpc.account.promotions.useQuery();

  const myPromotionId = overviewQuery.data?.profile?.promotionId;
  const promotions = promotionsQuery.data ?? [];
  const myPromotion = promotions.find((promotion) => promotion.id === myPromotionId);

  return (
    <div>
      <PageIntro
        eyebrow="Communautés de promotion"
        title="Retrouver votre point d’ancrage."
        description="Chaque promotion reste un espace vivant : nouvelles, rencontres, projets et discussions entre diplômés."
      />
      {promotionsQuery.isLoading && <p className="text-sm text-[#707787]">Chargement des promotions...</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {promotions.map((promotion, index) => (
          <Panel key={promotion.id} className="overflow-hidden transition hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(10,32,63,0.1)]">
            <div className={`h-2 ${palette[index % palette.length]}`} />
            <div className="p-5">
              <div className="flex items-start justify-between">
                <span className="font-editorial text-[47px] font-semibold leading-9 tracking-[-0.05em] text-[#10203A]">{promotion.year}</span>
                <ArrowUpRight size={19} className="text-[#977123]" />
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs font-bold text-[#536070]">
                <UsersRound size={16} />
                {promotion.memberCount} diplômé{promotion.memberCount > 1 ? "s" : ""}
              </p>
              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${promotion.isActive ? "bg-[#EAF4EE] text-[#286146]" : "bg-[#F2F3F5] text-[#596372]"}`}>{promotion.isActive ? "Active" : "Inactive"}</span>
              <div className="mt-5 border-t border-[#EEEAE3] pt-4">
                <button
                  onClick={() => toast.info(`L'espace dédié à la promotion ${promotion.year} arrive dans une prochaine itération.`)}
                  className="flex items-center gap-1 text-xs font-extrabold text-[#172842] transition hover:gap-2"
                >
                  Accéder à l'espace
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
      {!promotionsQuery.isLoading && promotions.length === 0 && (
        <Panel className="mt-4 p-10 text-center">
          <p className="font-editorial text-2xl font-semibold text-[#10213D]">Aucune promotion créée pour l'instant.</p>
          <p className="mt-2 text-xs text-[#707787]">Un administrateur peut en créer une depuis les paramètres d'administration.</p>
        </Panel>
      )}

      {myPromotion && (
        <Panel className="mt-6 overflow-hidden">
          <div className="grid md:grid-cols-[1.2fr_1fr]">
            <div className="bg-[#102846] p-7 text-white sm:p-9">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#EACB84]">Votre promotion</p>
              <h2 className="mt-2 font-editorial text-[39px] font-semibold leading-[0.95] tracking-[-0.035em]">
                {myPromotion.label ?? `Promotion ${myPromotion.year}`}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#D4DCE8]">
                {myPromotion.memberCount} diplômé{myPromotion.memberCount > 1 ? "s" : ""} font partie de cette cohorte sur le réseau.
              </p>
            </div>
            <div className="flex flex-col justify-center p-7">
              <p className="font-editorial text-3xl font-semibold text-[#0C1C34]">Un réseau ne dort jamais.</p>
              <p className="mt-3 text-sm leading-6 text-[#667080]">Retrouvez les membres de votre promotion depuis l'annuaire en filtrant par promotion.</p>
            </div>
          </div>
        </Panel>
      )}
      {!myPromotion && overviewQuery.data && (
        <Panel className="mt-6 p-6 text-center">
          <p className="text-sm text-[#657085]">Vous n'avez pas encore renseigné votre promotion. Ajoutez-la depuis vos paramètres de profil.</p>
        </Panel>
      )}
    </div>
  );
}
