import React from 'react';

interface WorkspaceHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  version?: string;
  description: string;
  children?: React.ReactNode;
}

export default function WorkspaceHeader({
  icon: Icon,
  title,
  version,
  description,
  children
}: WorkspaceHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-color)] pb-4 space-y-2 sm:space-y-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-rose-500/10 border border-rose-500/15 text-rose-500 rounded-lg">
            <Icon className="w-5 h-5 shrink-0" />
          </span>
          <h2 className="text-xl lg:text-2xl font-black text-[var(--text-main)] font-sans tracking-tight">{title}</h2>
          {version && (
            <span className="bg-[var(--blue-accent)]/15 text-[var(--blue-accent)] text-[10px] font-extrabold px-2 py-0.5 rounded border border-[var(--blue-accent)]/20 font-mono">{version}</span>
          )}
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed font-sans max-w-2xl">
          {description}
        </p>
      </div>
      {children && <div className="flex items-center gap-2 self-start sm:self-center">{children}</div>}
    </div>
  );
}
