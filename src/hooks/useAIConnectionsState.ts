import { useState } from 'react';

interface UseAIConnectionsStateArgs {
  tenantOnlyHeaders: () => Record<string, string>;
  tenantJsonHeaders: () => Record<string, string>;
}

/**
 * useAIConnectionsState
 * Estado e operações locais da tela de conexões com IAs.
 */
export default function useAIConnectionsState({
  tenantOnlyHeaders,
  tenantJsonHeaders,
}: UseAIConnectionsStateArgs) {
  const [aiConns, setAiConns] = useState<any[]>([]);
  const [aiHealth, setAiHealth] = useState<any[]>([]);
  const [loadingConns, setLoadingConns] = useState(false);
  const [testingConnId, setTestingConnId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: any }>({});

  const [showAddConn, setShowAddConn] = useState(false);
  const [newConnName, setNewConnName] = useState('');
  const [newConnProvider, setNewConnProvider] = useState('gemini');
  const [newConnApiKey, setNewConnApiKey] = useState('');
  const [newConnBaseUrl, setNewConnBaseUrl] = useState('');
  const [newConnModel, setNewConnModel] = useState('');
  const [savingConn, setSavingConn] = useState(false);

  const fetchAIConnections = async () => {
    setLoadingConns(true);
    try {
      const res = await fetch('/api/ai-connections', { headers: tenantOnlyHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAiConns(data);
      }

      const healthResponse = await fetch('/api/ai-health', { headers: tenantOnlyHeaders() });
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setAiHealth(healthData);
      }
    } catch (error) {
      console.error('Failed to load AI connections or health status:', error);
    } finally {
      setLoadingConns(false);
    }
  };

  const handleCreateAIConnection = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newConnName.trim()) return;

    setSavingConn(true);
    try {
      const res = await fetch('/api/ai-connections', {
        method: 'POST',
        headers: tenantJsonHeaders(),
        body: JSON.stringify({
          connectionName: newConnName,
          provider: newConnProvider,
          apiKey: newConnApiKey,
          baseUrl: newConnBaseUrl || undefined,
          model: newConnModel || undefined,
        }),
      });

      if (res.ok) {
        setNewConnName('');
        setNewConnProvider('gemini');
        setNewConnApiKey('');
        setNewConnBaseUrl('');
        setNewConnModel('');
        setShowAddConn(false);
        await fetchAIConnections();
      }
    } catch (error) {
      console.error('Failed to create AI connection:', error);
    } finally {
      setSavingConn(false);
    }
  };

  const handleDeleteAIConnection = async (id: string) => {
    if (!window.confirm('Deseja realmente remover esta conexão? A chave API será excluída para sempre.')) return;

    try {
      const res = await fetch(`/api/ai-connections/${id}`, {
        method: 'DELETE',
        headers: tenantOnlyHeaders(),
      });

      if (res.ok) {
        await fetchAIConnections();
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
    }
  };

  const handleTestAIConnection = async (id: string) => {
    setTestingConnId(id);

    try {
      const res = await fetch('/api/ai-connections/test', {
        method: 'POST',
        headers: tenantJsonHeaders(),
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult((prev) => ({ ...prev, [id]: data }));
      } else {
        setTestResult((prev) => ({ ...prev, [id]: { success: false, error: 'Serviço indisponível' } }));
      }
    } catch (error) {
      setTestResult((prev) => ({ ...prev, [id]: { success: false, error: String(error) } }));
    } finally {
      setTestingConnId(null);
    }
  };

  return {
    aiConns,
    aiHealth,
    loadingConns,
    testingConnId,
    testResult,
    showAddConn,
    setShowAddConn,
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
    fetchAIConnections,
    handleCreateAIConnection,
    handleDeleteAIConnection,
    handleTestAIConnection,
  };
}
