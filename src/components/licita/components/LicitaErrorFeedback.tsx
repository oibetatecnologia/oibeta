import React from 'react';
import ErrorState from '../../shared/ErrorState';

export default function LicitaErrorFeedback() {
  return (
    <ErrorState
      title="Erro de Comunicação Operacional"
      message="Alguns dos microsserviços do Beta Licita não puderam ser acessados ou o workspace atual não pôde ser iniciado. Pressione sincronizar ou garanta que o tenant da organização está devidamente ativo."
    />
  );
}
