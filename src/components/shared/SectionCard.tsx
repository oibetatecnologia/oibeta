import React from 'react';

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({ children, className = '' }: SectionCardProps) {
  return (
    <div className={`p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl ${className}`}>
      {children}
    </div>
  );
}
