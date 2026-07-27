import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ModuleAccessGuardProps {
  allowed: boolean;
  requiredModule?: string;
}

/**
 * ModuleAccessGuard
 * Mensagem padrão para módulos não liberados para a organização.
 */
export default function ModuleAccessGuard({
  allowed,
  requiredModule,
}: ModuleAccessGuardProps) {
  if (allowed) return null;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto h-full space-y-4 animate-scale-in select-none">
      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center shadow-inner">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-base font-extrabold text-[var(--text-main)] font-sans">
        Produto ou módulo não disponível para sua organização.
      </h3>
      <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
        A licença necessária para acessar estas funcionalidades
        {requiredModule ? (
          <>
            {' '}
            (<strong>{requiredModule}</strong>)
          </>
        ) : null}
        {' '}não está ativa para sua organização ou para o seu usuário neste momento.
      </p>
    </div>
  );
}
