/** CSPP Alumni profile: profil personnel réel, branché sur server/routers/account.ts. */
import { useMemo, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, Camera, Edit3, MapPin, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, PageIntro, Panel } from "@/components/UiPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { storageUrl } from "@/lib/storageUrl";
import { uploadFile } from "@/lib/upload";

function formatRelativeTime(date: string | Date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const hours = Math.round(diffMs / 3600000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export default function Profile() {
  const { user } = useAuth();
  const isVerified = user?.accountStatus === "verified";
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const overviewQuery = trpc.account.overview.useQuery();
  const connectionsQuery = trpc.network.list.useQuery();
  const promotionsQuery = trpc.account.promotions.useQuery();
  const feedQuery = trpc.feed.list.useQuery({});

  const profile = overviewQuery.data?.profile;
  const promotion = promotionsQuery.data?.find((item) => item.id === profile?.promotionId);
  const myPosts = useMemo(() => (feedQuery.data?.items ?? []).filter((post) => post.authorId === user?.id).slice(0, 2), [feedQuery.data, user?.id]);

  const updateProfile = trpc.account.updateProfile.useMutation({
    onSuccess: () => {
      utils.account.overview.invalidate();
      setEditing(false);
      toast.success("Profil mis à jour.");
    },
    onError: (error) => toast.error(error.message),
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const result = await uploadFile(file, "avatar");
      updateProfile.mutate({ avatarStorageKey: result.storageKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'envoi de la photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageIntro
        eyebrow="Mon espace membre"
        title="Mon profil"
        description="Un profil professionnel utile à la communauté, sans jamais devenir impersonnel."
        action={
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#17233B]">
            <Edit3 size={15} /> Modifier mon profil
          </button>
        }
      />
      <Panel className="overflow-hidden">
        <div className="relative h-28 bg-[#102846]" />
        <div className="relative px-5 pb-7 sm:px-8">
          <div className="-mt-16 w-fit rounded-full border-4 border-white shadow-md">
            <label className="group relative block cursor-pointer">
              <Avatar alt={user.name ?? "Vous"} src={storageUrl(profile?.avatarStorageKey)} size="lg" />
              <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#152C4C] text-white shadow transition group-hover:bg-[#0B1931]">
                <Camera size={13} />
              </span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-editorial text-[43px] font-semibold leading-9 tracking-[-0.04em] text-[#0A1931]">{user.name}</h1>
                {isVerified ? <BadgeCheck size={21} className="text-[#2777D0]" fill="currentColor" /> : <span className="rounded bg-[#F1F3F8] px-2 py-1 text-[10px] font-bold text-[#707787]">En cours de validation</span>}
              </div>
              <p className="mt-2 text-sm font-bold text-[#4E5969]">{[profile?.jobTitle, profile?.organization].filter(Boolean).join(" · ") || "Ajoutez votre poste et votre organisation"}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#747C87]">
                {profile?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {profile.location}
                  </span>
                )}
                {promotion && (
                  <span className="flex items-center gap-1">
                    <BriefcaseBusiness size={14} />
                    Promotion {promotion.year}
                  </span>
                )}
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-[#596575]">{profile?.bio || "Ajoutez une courte présentation pour que le réseau vous connaisse mieux."}</p>
          <div className="mt-6 grid grid-cols-2 border-t border-[#EEEAE3] pt-5">
            <Stat icon={<UsersRound size={17} />} label="Relations" value={String(connectionsQuery.data?.length ?? 0)} />
            <Stat icon={<BriefcaseBusiness size={17} />} label="Mentorat" value={profile?.mentorAvailable ? "Disponible" : "Non disponible"} />
          </div>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_290px]">
        <section>
          <h2 className="font-editorial text-[31px] font-semibold tracking-[-0.035em] text-[#10203A]">Activité récente</h2>
          <div className="mt-4 space-y-4">
            {myPosts.map((post) => (
              <Panel key={post.id} className="p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#967022]">Partagé dans le réseau · {formatRelativeTime(post.createdAt)}</p>
                <p className="mt-3 text-sm leading-6 text-[#485568]">{post.body}</p>
                <div className="mt-4 flex gap-4 border-t border-[#EEEAE3] pt-3 text-[11px] font-bold text-[#687281]">
                  <span>{post.reactionCount} réactions</span>
                  <span>{post.commentCount} commentaires</span>
                </div>
              </Panel>
            ))}
            {myPosts.length === 0 && <p className="text-xs text-[#9A9A98]">Vous n'avez pas encore publié sur le réseau.</p>}
          </div>
        </section>
        <aside className="space-y-4">
          <Panel className="p-5">
            <h2 className="font-editorial text-2xl font-semibold text-[#10203A]">À propos</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div>
                <dt className="font-extrabold uppercase tracking-[0.12em] text-[#967022]">Ouvert au mentorat</dt>
                <dd className="mt-1.5 text-[#596575]">{profile?.mentorAvailable ? "Oui" : "Non"}</dd>
              </div>
              {Boolean(profile?.mentorTopics) && (profile!.mentorTopics as string[]).length > 0 && (
                <div>
                  <dt className="font-extrabold uppercase tracking-[0.12em] text-[#967022]">Sujets de mentorat</dt>
                  <dd className="mt-1.5 text-[#596575]">{(profile!.mentorTopics as string[]).join(", ")}</dd>
                </div>
              )}
              <div>
                <dt className="font-extrabold uppercase tracking-[0.12em] text-[#967022]">Visibilité annuaire</dt>
                <dd className="mt-1.5 text-[#596575]">{profile?.directoryVisibility === "private" ? "Privé" : profile?.directoryVisibility === "promotion_only" ? "Ma promotion" : "Tout le réseau"}</dd>
              </div>
            </dl>
          </Panel>
        </aside>
      </div>

      {editing && profile && (
        <EditProfileModal
          initial={{ headline: profile.headline ?? "", jobTitle: profile.jobTitle ?? "", organization: profile.organization ?? "", location: profile.location ?? "", bio: profile.bio ?? "", promotionId: profile.promotionId ?? null }}
          onClose={() => setEditing(false)}
          isPending={updateProfile.isPending}
          onSubmit={(input) => updateProfile.mutate(input)}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-r border-[#EEEAE3] px-3 first:pl-0 last:border-0">
      <span className="text-[#987124]">{icon}</span>
      <strong className="font-editorial text-2xl leading-5 text-[#10203A]">{value}</strong>
      <span className="text-[10px] font-bold text-[#747D88]">{label}</span>
    </div>
  );
}

function EditProfileModal({
  initial,
  onClose,
  onSubmit,
  isPending,
}: {
  initial: { headline: string; jobTitle: string; organization: string; location: string; bio: string; promotionId: number | null };
  onClose: () => void;
  isPending: boolean;
  onSubmit: (input: { headline?: string; jobTitle?: string; organization?: string; location?: string; bio?: string; promotionId?: number }) => void;
}) {
  const [jobTitle, setJobTitle] = useState(initial.jobTitle);
  const [organization, setOrganization] = useState(initial.organization);
  const [location, setLocation] = useState(initial.location);
  const [bio, setBio] = useState(initial.bio);
  const [promotionId, setPromotionId] = useState<string>(initial.promotionId ? String(initial.promotionId) : "");
  const promotionsQuery = trpc.account.promotions.useQuery();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({ jobTitle: jobTitle.trim() || undefined, organization: organization.trim() || undefined, location: location.trim() || undefined, bio: bio.trim() || undefined, promotionId: promotionId ? Number(promotionId) : undefined });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#091830]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="font-editorial text-2xl font-semibold text-[#0B1931]">Modifier mon profil</h2>
          <button onClick={onClose} className="rounded-full p-1 text-[#7E8490] hover:bg-[#F3F0EA]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="profile-job">Poste</Label>
              <Input id="profile-job" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-org">Organisation</Label>
              <Input id="profile-org" value={organization} onChange={(event) => setOrganization(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-promotion">Promotion</Label>
            <select id="profile-promotion" value={promotionId} onChange={(event) => setPromotionId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="">Non renseignée</option>
              {(promotionsQuery.data ?? []).map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {promotion.label ?? `Promotion ${promotion.year}`}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-location">Localisation</Label>
            <Input id="profile-location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-bio">Présentation</Label>
            <Textarea id="profile-bio" rows={4} value={bio} onChange={(event) => setBio(event.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </div>
    </div>
  );
}
