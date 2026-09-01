/** CSPP Alumni network: gestion réelle des demandes de connexion, branchée sur server/routers/network.ts. */
import { Check, Clock, UserRound, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, PageIntro, Panel } from "@/components/UiPrimitives";
import { storageUrl } from "@/lib/storageUrl";
import { trpc } from "@/lib/trpc";

export default function Network() {
  const utils = trpc.useUtils();
  const pendingQuery = trpc.network.pending.useQuery(undefined, { refetchInterval: 10000 });
  const connectionsQuery = trpc.network.list.useQuery();

  const respond = trpc.network.respond.useMutation({
    onSuccess: (_data, variables) => {
      utils.network.pending.invalidate();
      utils.network.list.invalidate();
      toast.success(variables.decision === "accepted" ? "Connexion acceptée." : "Demande refusée.");
    },
    onError: (error) => toast.error(error.message),
  });

  const cancel = trpc.network.cancel.useMutation({
    onSuccess: () => {
      utils.network.pending.invalidate();
      toast.success("Invitation annulée.");
    },
    onError: (error) => toast.error(error.message),
  });

  const incoming = pendingQuery.data?.incoming ?? [];
  const outgoing = pendingQuery.data?.outgoing ?? [];
  const connections = connectionsQuery.data ?? [];

  return (
    <div>
      <PageIntro eyebrow="Mon réseau" title="Demandes de connexion" description="Examinez les invitations reçues et suivez celles que vous avez envoyées." />

      <section>
        <h2 className="font-editorial text-[28px] font-semibold text-[#10203A]">Demandes reçues {incoming.length > 0 && <span className="ml-1 text-base font-normal text-[#8B661D]">({incoming.length})</span>}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {incoming.map((request) => (
            <Panel key={request.connectionId} className="flex items-center gap-3 p-4">
              <Avatar alt={request.name ?? "Alumni"} src={storageUrl(request.avatarStorageKey)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#18263E]">{request.name}</p>
                {request.headline && <p className="truncate text-[11px] text-[#6D7787]">{request.headline}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => respond.mutate({ requesterId: request.otherUserId, decision: "accepted" })} aria-label="Accepter" className="grid h-9 w-9 place-items-center rounded-full bg-[#142640] text-white transition hover:bg-[#0B1931]">
                  <Check size={16} />
                </button>
                <button onClick={() => respond.mutate({ requesterId: request.otherUserId, decision: "declined" })} aria-label="Refuser" className="grid h-9 w-9 place-items-center rounded-full border border-[#E0DAD0] text-[#6D7787] transition hover:bg-[#F5F1EA]">
                  <X size={16} />
                </button>
              </div>
            </Panel>
          ))}
        </div>
        {incoming.length === 0 && (
          <Panel className="mt-4 p-8 text-center">
            <UserRound className="mx-auto text-[#9BA1A9]" size={26} />
            <p className="mt-2 text-sm text-[#697485]">Aucune demande en attente pour l'instant.</p>
          </Panel>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-editorial text-[28px] font-semibold text-[#10203A]">Invitations envoyées</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {outgoing.map((request) => (
            <Panel key={request.connectionId} className="flex items-center gap-3 p-4">
              <Avatar alt={request.name ?? "Alumni"} src={storageUrl(request.avatarStorageKey)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#18263E]">{request.name}</p>
                <p className="flex items-center gap-1 text-[11px] text-[#8B661D]">
                  <Clock size={12} /> En attente de réponse
                </p>
              </div>
              <button onClick={() => cancel.mutate({ userId: request.otherUserId })} aria-label="Annuler l'invitation" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E0DAD0] text-[#6D7787] transition hover:bg-[#F5F1EA]">
                <UserX size={16} />
              </button>
            </Panel>
          ))}
        </div>
        {outgoing.length === 0 && <p className="mt-4 text-xs text-[#9A9A98]">Aucune invitation en attente.</p>}
      </section>

      <section className="mt-8">
        <h2 className="font-editorial text-[28px] font-semibold text-[#10203A]">Mes connexions ({connections.length})</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <Panel key={connection.connectionId} className="flex items-center gap-3 p-4">
              <Avatar alt={connection.name ?? "Alumni"} src={storageUrl(connection.avatarStorageKey)} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#18263E]">{connection.name}</p>
                {connection.headline && <p className="truncate text-[11px] text-[#6D7787]">{connection.headline}</p>}
              </div>
            </Panel>
          ))}
        </div>
        {connections.length === 0 && <p className="mt-4 text-xs text-[#9A9A98]">Vous n'avez pas encore de connexion. Retrouvez des alumni depuis l'annuaire.</p>}
      </section>
    </div>
  );
}
