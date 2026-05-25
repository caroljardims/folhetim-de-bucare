export function FinalEditionNav({
  page,
  pageCount,
  onPrev,
  onNext,
  nextDisabled = false,
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  const maxPage = Math.max(0, pageCount - 1);
  return (
    <footer className="fim-pages-footer">
      <nav className="pages-nav" aria-label="Navegação da edição final">
        <button type="button" className="pages-nav__btn" disabled={page <= 0} onClick={onPrev}>
          ← anterior
        </button>
        <div className="pages-dots" aria-hidden>
          {Array.from({ length: pageCount }, (_, i) => (
            <span key={i} className={`pages-dot${page === i ? " pages-dot--on" : ""}`} />
          ))}
        </div>
        <button
          type="button"
          className="pages-nav__btn"
          disabled={page >= maxPage || nextDisabled}
          onClick={onNext}
        >
          próxima →
        </button>
      </nav>
    </footer>
  );
}
