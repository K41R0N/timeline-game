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

/** Asks the roster for the next person; the name can be placed with one click. */
export function HintButton({ costLabel, hintName, disabled, onRequest, onPlace }: HintButtonProps) {
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={onRequest}
        disabled={disabled || hintName !== null}
        className="timeline-card px-3 py-1.5 text-sm font-medium text-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Hint <span className="text-foreground-subtle">({costLabel})</span>
      </button>
      {hintName && (
        <button
          onClick={() => onPlace(hintName)}
          disabled={disabled}
          className="timeline-card px-3 py-1.5 text-sm text-foreground hover:border-primary-bright disabled:opacity-50"
          title="Place this person (costs a stroke)"
        >
          Try: <span className="font-semibold">{hintName}</span>
        </button>
      )}
    </div>
  );
}
