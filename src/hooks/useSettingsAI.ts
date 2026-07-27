import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';

export interface SettingsAIConnection {
  id: string;
  connectionName: string;
  provider: string;
  model?: string;
}

export interface SettingsAIHealthReport {
  id: string;
  status?: string;
  latency?: number | string;
  availability?: number | string;
}

type SettingsAITestResult = Record<string, any>;

/**
 * useSettingsAI
 *
 * Hook especializado para Conexões Multi-IA do SettingsWorkspace.
 */
export default function useSettingsAI() {
  const workspace = useWorkspace();

  const {
    showAddConn,
    setShowAddConn,
    handleCreateAIConnection,
    newConnName,
    setNewConnName,
    newConnProvider,
    setNewConnProvider,
    newConnApiKey,
    setNewConnApiKey,
    newConnBaseUrl,
    setNewConnBaseUrl,
    newConnModel,
    setNewConnModel,
    savingConn,
    loadingConns,
    aiConns,
    aiHealth,
    testResult,
    handleTestAIConnection,
    testingConnId,
    handleDeleteAIConnection,
  } = workspace.ai;

  const normalizedAIConnections = useMemo<SettingsAIConnection[]>(
    () =>
      aiConns.map((connection, index) => {
        const safeConnection = connection as Partial<SettingsAIConnection>;

        return {
          id: safeConnection.id ?? `ai-connection-${index}`,
          connectionName: safeConnection.connectionName ?? 'Conexão sem nome',
          provider: safeConnection.provider ?? 'custom',
          model: safeConnection.model,
        };
      }),
    [aiConns]
  );

  const normalizedAIHealth = useMemo<SettingsAIHealthReport[]>(
    () =>
      Array.isArray(aiHealth)
        ? aiHealth.map((health, index) => {
            const safeHealth = health as Partial<SettingsAIHealthReport>;

            return {
              id: safeHealth.id ?? `ai-health-${index}`,
              status: safeHealth.status,
              latency: safeHealth.latency,
              availability: safeHealth.availability,
            };
          })
        : [],
    [aiHealth]
  );

  const normalizedTestResult = useMemo<SettingsAITestResult>(
    () => (testResult && typeof testResult === 'object' ? testResult : {}),
    [testResult]
  );

  const toggleAddConnection = useCallback(() => {
    setShowAddConn(!showAddConn);
  }, [setShowAddConn, showAddConn]);

  const handleCreateConnection = useCallback(
    (event: React.FormEvent) => {
      return handleCreateAIConnection(event);
    },
    [handleCreateAIConnection]
  );

  const handleTestConnection = useCallback(
    (connectionId: string) => {
      return handleTestAIConnection(connectionId);
    },
    [handleTestAIConnection]
  );

  const handleDeleteConnection = useCallback(
    (connectionId: string) => {
      return handleDeleteAIConnection(connectionId);
    },
    [handleDeleteAIConnection]
  );

  return useMemo(
    () => ({
      showAddConn,
      toggleAddConnection,
      handleCreateConnection,
      newConnName,
      setNewConnName,
      newConnProvider,
      setNewConnProvider,
      newConnApiKey,
      setNewConnApiKey,
      newConnBaseUrl,
      setNewConnBaseUrl,
      newConnModel,
      setNewConnModel,
      savingConn,
      loadingConns,
      aiConns: normalizedAIConnections,
      aiHealth: normalizedAIHealth,
      testResult: normalizedTestResult,
      handleTestConnection,
      testingConnId,
      handleDeleteConnection,
    }),
    [
      showAddConn,
      toggleAddConnection,
      handleCreateConnection,
      newConnName,
      setNewConnName,
      newConnProvider,
      setNewConnProvider,
      newConnApiKey,
      setNewConnApiKey,
      newConnBaseUrl,
      setNewConnBaseUrl,
      newConnModel,
      setNewConnModel,
      savingConn,
      loadingConns,
      normalizedAIConnections,
      normalizedAIHealth,
      normalizedTestResult,
      handleTestConnection,
      testingConnId,
      handleDeleteConnection,
    ]
  );
}
