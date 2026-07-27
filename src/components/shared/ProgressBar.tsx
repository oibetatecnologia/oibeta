interface ProgressBarProps {
  value: number;
  label?: string;
  helper?: string;
}

export default function ProgressBar({ value, label, helper }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1.5">
      {(label || helper) && (
        <div className="flex items-center justify-between gap-3 text-[10px]">
          <span className="font-black text-[var(--text-main)]">{label}</span>
          <span className="font-mono text-[var(--text-secondary)]">{helper ?? `${safeValue}%`}</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
