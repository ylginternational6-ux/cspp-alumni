/** CSPP Alumni admin verification: file de vérification réelle, branchée sur server/routers/admin.ts. */
import { AlertTriangle, Check, ChevronRight, FileText, Mail, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MobileDetailScreen } from "@/components/MobileDetailScreen";
import { MobileQueryBar } from "@/components/MobileQueryControls";
import { AdminAvatar, AdminPageHeader, AdminPanel } from "@/components/AdminPrimitives";
import { trpc } from "@/lib/trpc";

type QueueItem = { id: number; userId: number; name: string | null; email: string | null; status: string; submittedAt: string | Date };

export default function AdminVerifications() {
  const utils = trpc.useUtils();
  const [term, setTerm] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const queueQuery = trpc.admin.verificationQueue.useQuery();
  const rows = useMemo(() => {
    const list = queueQuery.data ?? [];
    return list.filter((item: QueueItem) => `${item.name ?? ""} ${item.email ?? ""}`.toLowerCase().includes(term.toLowerCase()));
  }, [queueQuery.data, term]);

  const activeSelectedId = selectedId ?? rows[0]?.id ?? null;
  const selected = rows.find((item) => item.id === activeSelectedId);

  const detailQuery = trpc.admin.verificationDetail.useQuery({ requestId: activeSelectedId ?? 0 }, { enabled: Boolean(activeSelectedId) });

  const decide = trpc.admin.decideVerification.useMutation({
    onSuccess: (_data, variables) => {
      utils.admin.verificationQueue.invalidate();
      setMobileDetailOpen(false);
      toast.success(variables.decision === "approved" ? "Compte vérifié : le badge bleu est actif." : variables.decision === "rejected" ? "Demande refusée." : "Complément demandé.");
    },
    onError: (error) => toast.error(error.message),
  });

  const selectDossier = (id: number) => {
    setSelectedId(id);
    if (window.innerWidth < 1024) setMobileDetailOpen(true);
  };

  return (
    <div>
      <AdminPageHeader eyebrow="Contrôle des accès" title="Vérifications en attente" description="Examinez les demandes d'inscription et vérifiez les justificatifs avant d'accorder l'accès au réseau." />
      <MobileQueryBar value={term} onChange={setTerm} placeholder="Rechercher une demande…" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(350px,1.15fr)]">
        <section>
          <AdminPanel className="hidden p-4 lg:block">
            <label className="relative flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#758196]" />
              <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Rechercher une demande…" className="h-10 w-full rounded-lg border border-[#D8DEE7] bg-[#FCFDFE] pl-9 pr-3 text-xs outline-none focus:border-[#17355E]" />
            </label>
          </AdminPanel>
          <div className="mt-4 space-y-3">
            {rows.map((item) => (
              <button key={item.id} onClick={() => selectDossier(item.id)} className={`w-full rounded-xl border p-4 text-left transition ${activeSelectedId === item.id ? "border-[#B8933C] bg-[#FFFCF5] shadow-[0_5px_18px_rgba(142,105,30,0.1)]" : "border-[#DCE1E9] bg-white hover:border-[#BFC9D7]"}`}>
                <div className="flex gap-3">
                  <AdminAvatar name={item.name ?? "Alumni"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-[#18263D]">{item.name}</p>
                      <span className="text-[10px] text-[#818B99]">{new Date(item.submittedAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#788393]">{item.email}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <AdminPanel className="mt-4 p-10 text-center">
              <Check className="mx-auto text-[#2A684B]" size={28} />
              <p className="mt-3 font-editorial text-2xl font-semibold text-[#14233B]">La file est à jour.</p>
              <p className="mt-1 text-xs text-[#728093]">Aucun dossier en attente de vérification.</p>
            </AdminPanel>
          ) : null}
        </section>
        {selected ? (
          <AdminPanel className="hidden overflow-hidden xl:sticky xl:top-24 xl:block">
            <VerificationDetail dossier={selected} documents={detailQuery.data?.documents ?? []} onDecide={(decision, reason) => decide.mutate({ userId: selected.userId, decision, reason })} />
          </AdminPanel>
        ) : null}
      </div>
      {mobileDetailOpen && selected ? (
        <MobileDetailScreen title={selected.name ?? "Dossier"} subtitle={selected.email ?? ""} onBack={() => setMobileDetailOpen(false)}>
          <VerificationDetail dossier={selected} documents={detailQuery.data?.documents ?? []} onDecide={(decision, reason) => decide.mutate({ userId: selected.userId, decision, reason })} mobile />
        </MobileDetailScreen>
      ) : null}
    </div>
  );
}

function VerificationDetail({
  dossier,
  documents,
  onDecide,
  mobile = false,
}: {
  dossier: QueueItem;
  documents: Array<{ id: number; originalName: string; uploadedAt: string | Date }>;
  onDecide: (decision: "approved" | "rejected" | "needs_information", reason?: string) => void;
  mobile?: boolean;
}) {
  return (
    <>
      <div className="border-b border-[#E0E5EC] bg-[#10294D] px-6 py-6 text-white">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#E9CB7F]">Dossier à examiner</p>
        <div className="mt-4 flex items-center gap-3">
          <AdminAvatar name={dossier.name ?? "Alumni"} />
          <div>
            <h2 className="font-editorial text-[30px] font-semibold leading-6">{dossier.name}</h2>
          </div>
        </div>
      </div>
      <div className={`p-6 ${mobile ? "min-h-[calc(100dvh-11rem)] bg-[#FDFBF7]" : ""}`}>
        <div className="rounded-lg border border-[#E0E4EA] bg-[#FAFBFD] p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#8E742E]">Justificatifs soumis ({documents.length})</p>
          {documents.length === 0 && <p className="mt-3 text-xs text-[#768194]">Aucun document déposé pour cette demande.</p>}
          {documents.map((document) => (
            <div key={document.id} className="mt-3 flex gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#EAF0F8] text-[#234A76]">
                <FileText size={20} />
              </span>
              <div>
                <p className="text-sm font-bold text-[#2B384D]">{document.originalName}</p>
                <p className="mt-1 text-[11px] text-[#768194]">Déposé le {new Date(document.uploadedAt).toLocaleDateString("fr-FR")}</p>
              </div>
            </div>
          ))}
          <button onClick={() => toast.info("L'aperçu sécurisé du document sera branché sur le stockage de fichiers.")} className="mt-4 flex items-center gap-1 text-xs font-bold text-[#1A3C67] hover:gap-2">
            Ouvrir le justificatif <ChevronRight size={14} />
          </button>
        </div>
        <div className="mt-5 divide-y divide-[#E9ECF0]">
          <Info label="Adresse e-mail" value={dossier.email ?? "—"} icon={<Mail size={16} />} />
          <Info label="Statut" value={dossier.status} icon={<AlertTriangle size={16} />} />
        </div>
        <p className="mt-5 rounded-lg bg-[#FFF7E5] px-3 py-2.5 text-xs leading-5 text-[#705421]">
          <strong>À vérifier :</strong> comparez les éléments déclarés au(x) justificatif(s) avant de valider l'accès. Le passage en statut vérifié est immédiat et journalisé.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Confirm label="Valider le dossier" description="L'accès membre sera activé et le badge bleu apparaîtra sur le profil. Cette action est journalisée." tone="approve" onConfirm={() => onDecide("approved")} />
          <Confirm label="Refuser le dossier" description="Le demandeur sera notifié du refus. Cette action est journalisée." tone="reject" onConfirm={() => onDecide("rejected", "Justificatif non conforme.")} />
        </div>
        <button onClick={() => onDecide("needs_information", "Merci de fournir un justificatif complémentaire.")} className="mt-3 w-full rounded-lg border border-[#D3DAE5] py-2.5 text-xs font-extrabold text-[#4D5A6D] transition hover:bg-[#F4F6F9]">
          Demander un complément
        </button>
      </div>
    </>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <span className="text-[#69778B]">{icon}</span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8A94A1]">{label}</p>
        <p className="mt-1 text-xs font-semibold text-[#46546B]">{value}</p>
      </div>
    </div>
  );
}

function Confirm({ label, description, tone, onConfirm }: { label: string; description: string; tone: "approve" | "reject"; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className={`rounded-lg py-3 text-xs font-extrabold transition ${tone === "approve" ? "bg-[#10294D] text-white hover:bg-[#17355E]" : "border border-[#DDB4B6] text-[#982E36] hover:bg-[#FDEFF0]"}`}>
          {tone === "approve" ? <Check size={15} className="mr-1 inline" /> : <X size={15} className="mr-1 inline" />}
          {label}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label} ?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
