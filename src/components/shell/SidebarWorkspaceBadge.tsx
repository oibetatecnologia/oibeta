import React from 'react';

interface SidebarWorkspaceBadgeProps {
  collapsed: boolean;
  organizationName?: string;
}

/**
 * SidebarWorkspaceBadge
 * Identificador da organização/área de trabalho no menu lateral.
 */
export default function SidebarWorkspaceBadge({
  collapsed,
  organizationName = 'Oi Beta Tecnologia',
}: SidebarWorkspaceBadgeProps) {
  if (collapsed) return null;

  return (
    <div className="px-4 py-2 text-[11px] font-mono font-extrabold text-[var(--text-main)] border-b border-[var(--border-color)] flex items-center gap-2 bg-[var(--bg-card)]/40">
      <svg className="w-3.5 h-3.5 text-[var(--blue-accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <span className="truncate">{organizationName}</span>
    </div>
  );
}
