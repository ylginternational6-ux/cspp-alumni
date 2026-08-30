/** CSPP Alumni mentoring: mentorat réel, branché sur server/routers/mentorship.ts. */
import { useState } from "react";
import { CalendarClock, CheckCircle2, ChevronRight, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, PageIntro, Panel } from "@/components/UiPrimitives";
import { storageUrl } from "@/lib/storageUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type Mentor = { userId: number; name: string | null; headline: string | null; organization: string | null; mentorTopics: string[] | null; avatarStorageKey?: string | null };

export default function Mentorship() {
  const { user } = useAuth();
  const isVerified = user?.accountStatus === "verified";
  const utils = trpc.useUtils();

  const mentorsQuery = trpc.mentorship.listMentors.useQuery();
  const myAsMenteeQuery = trpc.mentorship.myRequestsAsMentee.useQuery(undefined, { enabled: isVerified });
  const myAsMentorQuery = trpc.mentorship.myRequestsAsMentor.useQuery(undefined, { enabled: isVerified });
  const overviewQuery = trpc.account.overview.useQuery();
  const isMentor = overviewQuery.data?.profile?.mentorAvailable ?? false;

  const [requestTarget, setRequestTarget] = useState<Mentor | null>(null);

  const requestMentorship = trpc.mentorship.request.useMutation({
    onSuccess: () => {
      setRequestTarget(null);
      utils.mentorship.myRequestsAsMentee.invalidate();
      toast.success("Votre demande de mentorat a été envoyée.");
    },
    onError: (error) => toast.error(error.message),
  });

  const respondMutation = trpc.mentorship.respond.useMutation({
    onSuccess: () => {
      utils.mentorship.myRequestsAsMentor.invalidate();
      toast.success("Réponse enregistrée.");
    },
    onError: (error) => toast.error(error.message),
  });

  const becomeMentor = trpc.account.updateProfile.useMutation({
    onSuccess: () => {
      utils.account.overview.invalidate();
      utils.mentorship.listMentors.invalidate();
      toast.success("Vous êtes désormais visible comme mentor disponible.");
    },
    onError: (error) => toast.error(error.message),
  });

  const mentors = (mentorsQuery.data ?? []) as Mentor[];

  const handleAskMentorship = (mentor: Mentor) => {
    if (!isVerified) {
      toast.info("Vérifiez votre compte pour solliciter un mentor.");
      return;
    }
    setRequestTarget(mentor);
  };

  const handleBecomeMentor = () => {
    if (!isVerified) {
      toast.info("Vérifiez votre compte pour devenir mentor.");
      return;
    }
    becomeMentor.mutate({ mentorAvailable: true });
  };

  return (
    <div>
      <PageIntro eyebrow="Mentorat CSPP" title="Faire grandir les trajectoires, ensemble." description="Un accompagnement simple et exigeant, construit sur la confiance entre diplômés et la force du vécu partagé." />

      <section className="overflow-hidden rounded-2xl border border-[#E1DDD5] bg-[#102846] shadow-[0_8px_25px_rgba(10,32,63,0.1)]">
        <div className="p-7 text-white sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#F3D58E]">
            <Sparkles size={14} /> Programme ouvert
          </span>
          <h1 className="mt-5 font-editorial text-[38px] font-semibold leading-[0.95] tracking-[-0.04em] sm:text-[46px]">Un échange peut changer votre prochaine étape.</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#D8DFE9]">Clarifier un projet, prendre confiance dans une décision, entrer dans un nouveau secteur : le mentorat transforme l'expérience des alumni en accélérateur collectif.</p>
          <div className="mt-7 flex flex-wrap gap-5 text-xs text-[#EDF1F7]">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-[#F0CB7C]" /> {mentors.length} mentors disponibles
            </span>
          </div>
        </div>
      </section>

      {isVerified && (myAsMenteeQuery.data?.length ?? 0) > 0 && (
        <section className="mt-7">
          <h2 className="font-editorial text-[28px] font-semibold tracking-[-0.03em] text-[#0B1931]">Mes demandes envoyées</h2>
          <div className="mt-3 space-y-2">
            {myAsMenteeQuery.data?.map((request) => (
              <Panel key={request.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-bold text-[#162033]">{request.topic}</p>
                  <p className="text-xs text-[#717784]">Mentor : {request.mentorName}</p>
                </div>
                <StatusBadge status={request.status} />
              </Panel>
            ))}
          </div>
        </section>
      )}

      {isVerified && (myAsMentorQuery.data?.length ?? 0) > 0 && (
        <section className="mt-7">
          <h2 className="font-editorial text-[28px] font-semibold tracking-[-0.03em] text-[#0B1931]">Demandes reçues</h2>
          <div className="mt-3 space-y-2">
            {myAsMentorQuery.data?.map((request) => (
              <Panel key={request.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#162033]">{request.topic}</p>
                  <p className="text-xs text-[#717784]">De : {request.menteeName}</p>
                </div>
                {request.status === "pending" ? (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => respondMutation.mutate({ requestId: request.id, decision: "accepted" })} className="rounded-lg bg-black px-3 py-1.5 text-[11px] font-extrabold text-white">
                      Accepter
                    </button>
                    <button onClick={() => respondMutation.mutate({ requestId: request.id, decision: "declined" })} className="rounded-lg border border-[#D9D4CC] px-3 py-1.5 text-[11px] font-bold text-[#445064]">
                      Refuser
                    </button>
                  </div>
                ) : (
                  <StatusBadge status={request.status} />
                )}
              </Panel>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#967025]">Pour vous</p>
            <h2 className="mt-1 font-editorial text-[34px] font-semibold tracking-[-0.035em] text-[#0B1931]">Des profils à rencontrer</h2>
          </div>
        </div>
        {mentorsQuery.isLoading && <p className="mt-4 text-sm text-[#707787]">Chargement des mentors...</p>}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {mentors.map((mentor) => (
            <Panel key={mentor.userId} className="p-5">
              <div className="flex gap-3">
                <Avatar alt={mentor.name ?? "Mentor"} src={storageUrl(mentor.avatarStorageKey)} size="lg" />
                <div>
                  <h3 className="font-editorial text-[25px] font-semibold leading-5 text-[#0C1B33]">{mentor.name}</h3>
                  <p className="mt-1 text-[11px] leading-4 text-[#6B7480]">{mentor.headline ?? mentor.organization ?? "Alumni CSPP"}</p>
                </div>
              </div>
              {mentor.mentorTopics && mentor.mentorTopics.length > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-[#5E6A79]">
                  <CalendarClock size={15} className="text-[#9A7327]" />
                  {mentor.mentorTopics.join(", ")}
                </p>
              )}
              <button onClick={() => handleAskMentorship(mentor)} className="mt-5 w-full rounded-lg bg-black py-2.5 text-[11px] font-extrabold text-white transition hover:bg-[#17233B]">
                Demander un mentorat
              </button>
            </Panel>
          ))}
        </div>
        {!mentorsQuery.isLoading && mentors.length === 0 && (
          <Panel className="mt-4 p-10 text-center">
            <p className="font-editorial text-2xl font-semibold text-[#10213D]">Aucun mentor disponible pour l'instant.</p>
          </Panel>
        )}
      </section>

      {!isMentor && (
        <Panel className="mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[#596575]">
            <strong className="font-editorial text-[22px] text-[#112039]">Déjà expérimenté ?</strong>
            <br />
            Partagez ce que vous auriez aimé recevoir à l'entrée dans votre vie professionnelle.
          </p>
          <button onClick={handleBecomeMentor} disabled={becomeMentor.isPending} className="inline-flex items-center gap-1 text-xs font-extrabold text-[#8B661D] hover:gap-2">
            Devenir mentor <ChevronRight size={16} />
          </button>
        </Panel>
      )}

      {requestTarget && (
        <RequestMentorshipModal
          mentor={requestTarget}
          isPending={requestMentorship.isPending}
          onClose={() => setRequestTarget(null)}
          onSubmit={(topic, message) => requestMentorship.mutate({ mentorId: requestTarget.userId, topic, message })}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { pending: "En attente", accepted: "Acceptée", declined: "Refusée", completed: "Terminée", cancelled: "Annulée" };
  const colors: Record<string, string> = { pending: "bg-[#F5D993] text-[#5B420E]", accepted: "bg-[#DFF3EA] text-[#1F6A54]", declined: "bg-[#F8DEDE] text-[#8A2C2C]", completed: "bg-[#EEF1F5] text-[#435873]", cancelled: "bg-[#EEF1F5] text-[#435873]" };
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${colors[status] ?? "bg-[#EEF1F5] text-[#435873]"}`}>{labels[status] ?? status}</span>;
}

function RequestMentorshipModal({ mentor, onClose, onSubmit, isPending }: { mentor: Mentor; onClose: () => void; onSubmit: (topic: string, message?: string) => void; isPending: boolean }) {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (topic.trim().length < 3) {
      toast.error("Indiquez un sujet (3 caractères minimum).");
      return;
    }
    onSubmit(topic.trim(), message.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#091830]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="font-editorial text-2xl font-semibold text-[#0B1931]">Demander un mentorat à {mentor.name}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-[#7E8490] hover:bg-[#F3F0EA]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mentorship-topic">Sujet</Label>
            <Input id="mentorship-topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ex. Transition vers le conseil" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mentorship-message">Message (optionnel)</Label>
            <Textarea id="mentorship-message" rows={4} value={message} onChange={(event) => setMessage(event.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Envoi..." : "Envoyer la demande"}
          </Button>
        </form>
      </div>
    </div>
  );
}
