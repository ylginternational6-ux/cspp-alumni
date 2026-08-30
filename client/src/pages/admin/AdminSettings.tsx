/** CSPP Alumni admin settings: rôles et promotions réels, branchés sur server/routers/admin.ts. */
import { Plus, ShieldCheck, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, AdminPanel } from "@/components/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const roleLabels: Record<string, string> = { alumni: "Alumni", mentor: "Mentor", moderator: "Modérateur", administrator: "Administrateur" };

export default function AdminSettings() {
  const utils = trpc.useUtils();
  const [showAddPromotion, setShowAddPromotion] = useState(false);

  const roleAssignmentsQuery = trpc.admin.roleAssignments.useQuery();
  const promotionsQuery = trpc.admin.promotions.useQuery();

  const revokeRole = trpc.admin.revokeRole.useMutation({
    onSuccess: () => {
      utils.admin.roleAssignments.invalidate();
      toast.success("Rôle retiré.");
    },
    onError: (error) => toast.error(error.message),
  });

  const createPromotion = trpc.admin.createPromotion.useMutation({
    onSuccess: () => {
      utils.admin.promotions.invalidate();
      setShowAddPromotion(false);
      toast.success("Promotion créée.");
    },
    onError: (error) => toast.error(error.message),
  });

  const nonAlumniRoles = (roleAssignmentsQuery.data ?? []).filter((row) => row.roleCode !== "alumni");

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader eyebrow="Configuration du portail" title="Paramètres d'administration" description="Gérez les rôles élevés (mentor, modérateur, administrateur) et les cohortes de promotions." />
      <div className="space-y-5">
        <SettingsPanel icon={<ShieldCheck size={19} />} title="Rôles et permissions">
          {roleAssignmentsQuery.isLoading && <p className="py-4 text-xs text-[#728094]">Chargement...</p>}
          {nonAlumniRoles.map((row) => (
            <div key={`${row.userId}-${row.roleCode}`} className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-bold text-[#36445A]">{row.name}</p>
                <p className="mt-1 text-xs text-[#728094]">
                  {row.email} · <span className="font-bold text-[#8E742E]">{roleLabels[row.roleCode] ?? row.roleCode}</span>
                </p>
              </div>
              <button
                onClick={() => revokeRole.mutate({ userId: row.userId, roleCode: row.roleCode as "mentor" | "moderator" | "administrator", reason: "Retrait décidé depuis les paramètres d'administration." })}
                className="rounded-lg border border-[#D8DEE7] px-3 py-1.5 text-[11px] font-bold text-[#536174] hover:bg-[#F5F7FA]"
              >
                Retirer
              </button>
            </div>
          ))}
          {!roleAssignmentsQuery.isLoading && nonAlumniRoles.length === 0 && <p className="py-4 text-xs text-[#728094]">Aucun mentor, modérateur ou administrateur pour l'instant.</p>}
          <p className="pt-4 text-[11px] text-[#8A94A2]">Pour attribuer un nouveau rôle, rendez-vous sur la fiche du membre dans la gestion des alumni.</p>
        </SettingsPanel>

        <SettingsPanel
          icon={<UsersRound size={19} />}
          title="Promotions"
          action={
            <button onClick={() => setShowAddPromotion(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#10294D] px-3 py-2 text-[11px] font-extrabold text-white hover:bg-[#17355E]">
              <Plus size={14} /> Ajouter
            </button>
          }
        >
          {(promotionsQuery.data ?? []).map((promotion) => (
            <div key={promotion.id} className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-bold text-[#36445A]">{promotion.label ?? `Promotion ${promotion.year}`}</p>
                <p className="mt-1 text-xs text-[#728094]">{promotion.memberCount} membre(s)</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${promotion.isActive ? "bg-[#EAF4EE] text-[#286146]" : "bg-[#EEF0F4] text-[#5D6878]"}`}>{promotion.isActive ? "Active" : "Inactive"}</span>
            </div>
          ))}
          {(promotionsQuery.data ?? []).length === 0 && <p className="py-4 text-xs text-[#728094]">Aucune promotion créée pour l'instant.</p>}
        </SettingsPanel>
      </div>

      {showAddPromotion && (
        <AddPromotionModal onClose={() => setShowAddPromotion(false)} isPending={createPromotion.isPending} onSubmit={(input) => createPromotion.mutate(input)} />
      )}
    </div>
  );
}

function SettingsPanel({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <AdminPanel className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E8EDF5] text-[#344D75]">{icon}</span>
          <h2 className="pt-1 font-editorial text-[28px] font-semibold leading-6 text-[#15233B]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-4 divide-y divide-[#E7EAF0] border-t border-[#E7EAF0]">{children}</div>
    </AdminPanel>
  );
}

function AddPromotionModal({ onClose, onSubmit, isPending }: { onClose: () => void; isPending: boolean; onSubmit: (input: { year: number; label?: string }) => void }) {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [label, setLabel] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedYear = Number(year);
    if (!parsedYear || parsedYear < 1950) {
      toast.error("Année invalide.");
      return;
    }
    onSubmit({ year: parsedYear, label: label.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#091830]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="font-editorial text-2xl font-semibold text-[#0B1931]">Ajouter une promotion</h2>
          <button onClick={onClose} className="rounded-full p-1 text-[#7E8490] hover:bg-[#F3F0EA]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="promo-year">Année</Label>
            <Input id="promo-year" type="number" value={year} onChange={(event) => setYear(event.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promo-label">Libellé (optionnel)</Label>
            <Input id="promo-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={`Promotion ${year}`} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer la promotion"}
          </Button>
        </form>
      </div>
    </div>
  );
}
