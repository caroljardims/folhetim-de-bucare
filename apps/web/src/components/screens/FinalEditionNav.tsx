export function FinalEditionNav({
  page,
  pageCount,
  onPrev,
  onNext,
  nextDisabled = false,
  isLastStep = false,
  lastStepLabel = "Jogar de novo →",
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  /** Passo 5/5: botão direito encerra com «Jogar de novo». */
  isLastStep?: boolean;
  lastStepLabel?: string;
}) {
  const maxPage = Math.max(0, pageCount - 1);
  return (
    <footer className="fim-pages-footer fim-pages-footer--fixed">
      <nav className="pages-nav" aria-label="Navegação da edição final">
        <button
          type="button"
          className="pages-nav__btn pages-nav__btn--prev"
          disabled={page <= 0}
          onClick={onPrev}
        >
          ← anterior
        </button>
        <div className="pages-dots" aria-hidden>
          {Array.from({ length: pageCount }, (_, i) => (
            <span key={i} className={`pages-dot${page === i ? " pages-dot--on" : ""}`} />
          ))}
        </div>
        <button
          type="button"
          className={`pages-nav__btn pages-nav__btn--next${isLastStep ? " pages-nav__btn--play-again" : ""}`}
          disabled={isLastStep ? false : nextDisabled}
          onClick={onNext}
        >
          {isLastStep ? lastStepLabel : "próxima →"}
        </button>
      </nav>
    </footer>
  );
}
