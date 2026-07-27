import { useMemo } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';

/**
 * useDocumentsWorkspace
 *
 * Hook especializado da tela de Documentos.
 *
 * Responsabilidade:
 * - consumir o WorkspaceContext;
 * - expor apenas o domínio necessário para DocumentsWorkspace;
 * - impedir que DocumentsWorkspace dependa da estrutura completa do contexto;
 * - remover o repasse manual de props pelo WorkspaceTabsRouter.
 */
export default function useDocumentsWorkspace() {
  const workspace = useWorkspace();

  const {
    selecteddocTemplate,
    setSelectedDocTemplate,
    docCityName,
    setDocCityName,
    docSubject,
    setDocSubject,
    generatedDoc,
    handleGenerateDocument,
  } = workspace.documents;

  return useMemo(
    () => ({
      selecteddocTemplate,
      setSelectedDocTemplate,
      docCityName,
      setDocCityName,
      docSubject,
      setDocSubject,
      generatedDoc,
      handleGenerateDocument,
    }),
    [
      selecteddocTemplate,
      setSelectedDocTemplate,
      docCityName,
      setDocCityName,
      docSubject,
      setDocSubject,
      generatedDoc,
      handleGenerateDocument,
    ]
  );
}
