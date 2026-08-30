/** CSPP Alumni projects: espaces collaboratifs réels, branchés sur server/routers/projects.ts. */
import { useState } from "react";
import { ArrowUpRight, LockKeyhole, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { PageIntro, Panel } from "@/components/UiPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const visibilityLabels: Record<string, string> = { network: "Ouvert au réseau", promotion_only: "Réservé à la promotion", private: "Sur invitation" };

export default function Projects() {
  const { user } = useAuth();
  const isVerified = user?.accountStatus === "verified";
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);

  const projectsQuery = trpc.projects.list.useQuery();

  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      utils.projects.list.invalidate();
      toast.success("Espace créé.");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreateClick = () => {
    if (!isVerified) {
      toast.info("Vérifiez votre compte pour créer un espace.");
      return;
    }
    setShowCreate(true);
  };

  const projects = projectsQuery.data ?? [];

  return (
    <div>
      <PageIntro
        eyebrow="Espaces collaboratifs"
        title="Les projets qui réunissent."
        description="Rejoignez les collectifs qui prolongent les échanges du réseau en initiatives concrètes."
        action={
          <button onClick={handleCreateClick} className="rounded-full bg-black px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#17233B]">
            Créer un projet
          </button>
        }
      />
      {projectsQuery.isLoading && <p className="text-sm text-[#707787]">Chargement des espaces...</p>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <article key={project.id} className="overflow-hidden rounded-xl border border-[#E4DFD7] bg-white shadow-[0_5px_16px_rgba(10,32,63,0.05)] transition hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(10,32,63,0.11)]">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#F2E5C5] px-2.5 py-1 text-[10px] font-extrabold text-[#674B14]">{visibilityLabels[project.visibility] ?? project.visibility}</span>
                {project.visibility === "private" && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#75808C]">
                    <LockKeyhole size={12} /> Privé
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-editorial text-[29px] font-semibold leading-6 text-[#0B1931]">{project.name}</h2>
              <p className="mt-3 text-xs leading-5 text-[#65707F]">{project.description ?? "Aucune description fournie."}</p>
              <div className="mt-5 flex items-center justify-between border-t border-[#EEEAE3] pt-4">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#626D7B]">
                  <UsersRound size={15} /> Créé par {project.ownerName}
                </span>
                <button onClick={() => toast.info("L'espace détaillé du projet arrive dans une prochaine itération.")} className="flex items-center gap-1 text-xs font-extrabold text-[#172842] hover:gap-2">
                  Accéder <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!projectsQuery.isLoading && projects.length === 0 && (
        <Panel className="mt-4 p-10 text-center">
          <p className="font-editorial text-2xl font-semibold text-[#10213D]">Aucun espace collaboratif pour l'instant.</p>
        </Panel>
      )}
      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} isPending={createProject.isPending} onSubmit={(input) => createProject.mutate(input)} />}
    </div>
  );
}

function CreateProjectModal({ onClose, onSubmit, isPending }: { onClose: () => void; isPending: boolean; onSubmit: (input: { name: string; description?: string; visibility?: "network" | "promotion_only" | "private" }) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"network" | "promotion_only" | "private">("network");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Le nom de l'espace doit contenir au moins 2 caractères.");
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim() || undefined, visibility });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#091830]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="font-editorial text-2xl font-semibold text-[#0B1931]">Créer un espace</h2>
          <button onClick={onClose} className="rounded-full p-1 text-[#7E8490] hover:bg-[#F3F0EA]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Nom de l'espace</Label>
            <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-visibility">Visibilité</Label>
            <select id="project-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="network">Ouvert à tout le réseau</option>
              <option value="promotion_only">Réservé à ma promotion</option>
              <option value="private">Privé (sur invitation)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Textarea id="project-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer l'espace"}
          </Button>
        </form>
      </div>
    </div>
  );
}
