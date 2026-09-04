/**
 * Superposition de profil façon LinkedIn : n'importe quel composant peut
 * appeler `openProfile(userId)` pour afficher la fiche d'un alumni par
 * dessus la page courante (post, commentaire, conversation, annuaire...)
 * sans navigation ni perte de contexte. Monté une seule fois dans AppLayout.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ProfileOverlay } from "@/components/ProfileOverlay";

type ProfileOverlayContextValue = {
  openProfile: (userId: number) => void;
  closeProfile: () => void;
};

const ProfileOverlayContext = createContext<ProfileOverlayContextValue | null>(null);

export function ProfileOverlayProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);

  const openProfile = useCallback((id: number) => setUserId(id), []);
  const closeProfile = useCallback(() => setUserId(null), []);
  const value = useMemo(() => ({ openProfile, closeProfile }), [openProfile, closeProfile]);

  return (
    <ProfileOverlayContext.Provider value={value}>
      {children}
      {userId !== null && <ProfileOverlay userId={userId} onClose={closeProfile} />}
    </ProfileOverlayContext.Provider>
  );
}

export function useProfileOverlay() {
  const context = useContext(ProfileOverlayContext);
  if (!context) throw new Error("useProfileOverlay doit être utilisé à l'intérieur de ProfileOverlayProvider");
  return context;
}
