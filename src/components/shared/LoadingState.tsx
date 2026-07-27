import React from 'react';
import { UserCheck } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function LoadingState({
  message = 'Carregando informações...',
  icon: Icon = UserCheck
}: LoadingStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3 font-mono text-xs text-[var(--text-secondary)]">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-t border-b-2 border-rose-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-5 h-5 text-rose-500 animate-pulse" />
        </div>
      </div>
      <span>{message}</span>
    </div>
  );
}
