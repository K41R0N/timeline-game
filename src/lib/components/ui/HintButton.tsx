'use client';

interface HintButtonProps {
  /** Whether a hint adds a stroke on this difficulty. */
  costsStroke: boolean;
  /** The hinted person's name while it has not been placed yet. */
  hintName: string | null;
  disabled: boolean;
  onRequest: () => void;
  onPlace: (name: string) => void;
}

/** The wild card: asks the roster for the next person, whose card can then be played with one tap. */
export function HintButton({ costsStroke, hintName, disabled, onRequest, onPlace }: HintButtonProps) {
  if (hintName) {
    return (
      <button
        type="button"
        onClick={() => onPlace(hintName)}
        disabled={disabled}
        className="type-display inline-flex min-h-10 max-w-full items-center gap-2 rounded-full bg-[var(--foil)] px-4 text-[15px] font-extrabold uppercase tracking-[0.04em] text-[var(--foil-ink)] shadow-[0_3px_0_var(--foil-deep)] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil-light)] disabled:opacity-50"
      >
        <span className="truncate">Play {hintName}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={disabled}
      className="type-display inline-flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-[var(--foil)] px-4 text-[15px] font-extrabold uppercase tracking-[0.06em] text-[var(--chalk-text)] transition-colors hover:bg-[rgba(232,185,49,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil-light)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      Wild card <span className="font-bold text-[var(--table-muted)]">{costsStroke ? '+1' : 'free'}</span>
    </button>
  );
}
