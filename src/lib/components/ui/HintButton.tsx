'use client';

interface HintButtonProps {
  /** What a hint costs on this difficulty, e.g. "+1 stroke". */
  costLabel: string;
  /** The hinted person's name while it has not been placed yet. */
  hintName: string | null;
  disabled: boolean;
  onRequest: () => void;
  onPlace: (name: string) => void;
}

/** Asks the roster for the next person; the name can then be placed with one tap. */
export function HintButton({ costLabel, hintName, disabled, onRequest, onPlace }: HintButtonProps) {
  if (hintName) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-foreground-muted">Hint:</span>
        <button
          type="button"
          onClick={() => onPlace(hintName)}
          disabled={disabled}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary bg-primary-glow px-3 font-semibold text-foreground transition-colors hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          Place {hintName}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={disabled}
      className="inline-flex min-h-9 items-center gap-1 rounded-full px-1 text-sm font-semibold text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      Get a hint <span className="font-normal text-foreground-muted">({costLabel})</span>
    </button>
  );
}
