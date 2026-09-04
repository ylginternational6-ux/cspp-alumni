/** CSPP Alumni mobile detail screen: native-style, full-screen continuation with a single clear return path. */
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useEffect } from "react";

type MobileDetailScreenProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
  headerRight?: ReactNode;
  /** Le titre (et la sous-photo) devient cliquable — utilisé pour ouvrir le profil de l'interlocuteur. */
  onTitleClick?: () => void;
  /**
   * true pour un écran "conversation" : la hauteur est verrouillée sur celle
   * de l'écran (comme une vraie app de messagerie), l'en-tête et le champ de
   * saisie restent fixes, seule la zone de messages défile. false (par
   * défaut) pour un écran de détail classique qui défile normalement.
   */
  chatLayout?: boolean;
};

export function MobileDetailScreen({ title, subtitle, onBack, children, headerRight, onTitleClick, chatLayout = false }: MobileDetailScreenProps) {
  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const titleBlock = (
    <div className="min-w-0 flex-1">
      <h1 className="truncate font-editorial text-[24px] font-semibold leading-5 text-[#0A1931]">{title}</h1>
      {subtitle ? <p className="mt-1 truncate text-[11px] text-[#6C7785]">{subtitle}</p> : null}
    </div>
  );

  return (
    <section role="dialog" aria-modal="true" aria-label={title} className={`fixed inset-0 z-[90] bg-[#FDFBF7] lg:hidden ${chatLayout ? "flex h-[100dvh] flex-col overflow-hidden" : "overflow-y-auto"}`}>
      <header className="sticky top-0 z-10 flex min-h-16 shrink-0 items-center gap-3 border-b border-[#E7E1D8] bg-[#FDFBF7]/95 px-4 py-3 shadow-[0_2px_12px_rgba(13,29,52,0.05)] backdrop-blur-xl">
        <button onClick={onBack} aria-label="Retour à la liste" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#152641] transition hover:bg-[#F1EBDD] active:scale-95">
          <ArrowLeft size={21} />
        </button>
        {onTitleClick ? (
          <button onClick={onTitleClick} className="min-w-0 flex-1 text-left transition active:opacity-70">
            {titleBlock}
          </button>
        ) : (
          titleBlock
        )}
        {headerRight}
      </header>
      <div className={chatLayout ? "min-h-0 flex-1" : "min-h-[calc(100dvh-4rem)] pb-8"}>{children}</div>
    </section>
  );
}
