import React from 'react';

interface SidebarSectionTitleProps {
  collapsed: boolean;
  title: string;
}

/**
 * SidebarSectionTitle
 * Título reutilizável das seções do menu lateral.
 */
export default function SidebarSectionTitle({
  collapsed,
  title,
}: SidebarSectionTitleProps) {
  if (collapsed) return null;

  return (
    <div className="px-4 pt-3 pb-1">
      <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest font-mono">
        {title}
      </span>
    </div>
  );
}
