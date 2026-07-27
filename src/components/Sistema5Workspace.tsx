import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FolderOpen, FileSignature, Layers, ShieldAlert,
  Plus, Eye, RefreshCw, Search, FileText, Landmark, Clock
} from 'lucide-react';

interface Sistema5WorkspaceProps {
  user: any;
  setActiveTab: (tab: string) => void;
  activeTab: string;
  selectedProjectId: string;
}

export default function Sistema5Workspace({ user, setActiveTab, activeTab, selectedProjectId }: Sistema5WorkspaceProps) {
  const [currentSubTab, setCurrentSubTab] = useState<string>('dashboard');
  const [data, setData] = useState<any>({
    protocols: [],
    processes: [],
    workflows: [],
    documents: [],
    audits: [],
    reports: []
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab.startsWith('s5_')) {
      const tab = activeTab.split('_')[1];
      setCurrentSubTab(tab);
    }
  }, [activeTab]);

  const handleSubTabChange = (tabId: string) => {
    setCurrentSubTab(tabId);
    setActiveTab(`s5_${tabId}`);
  };

  const fetchAllData = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const workspaceId = selectedProjectId;

      const endpoints = [
        `/api/gov/protocols?workspaceId=${workspaceId}`,
        `/api/gov/processes?workspaceId=${workspaceId}`,
        `/api/gov/workflows?workspaceId=${workspaceId}`,
        `/api/gov/documents?workspaceId=${workspaceId}`,
        `/api/gov/audits?workspaceId=${workspaceId}`,
        `/api/gov/reports?workspaceId=${workspaceId}`
      ];

      const responses = await Promise.all(endpoints.map(ep => fetch(ep)));
      
      const results = {};
      const keys = ['protocols', 'processes', 'workflows', 'documents', 'audits', 'reports'];
      
      for(let i=0; i<responses.length; i++) {
        if (!responses[i].ok) throw new Error(`Erro buscando ${keys[i]}`);
        results[keys[i]] = await responses[i].json();
      }

      setData(results);
    } catch (err: any) {
      console.error("fetchError in Sistema5:", err);
      setError(err?.message || "Falha ao consultar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedProjectId]);

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Landmark className="w-16 h-16 text-[var(--text-secondary)] animate-pulse" />
        <h3 className="text-xl font-bold text-[var(--text-main)]">Selecione um Espaço de Trabalho</h3>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--text-main)] pb-20 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[var(--border-color)] pb-5 gap-4">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-[var(--green-accent)]">Workspace GovTech</span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-sans text-[var(--text-main)] flex items-center gap-2">
            📄 Sistema 5 <span className="text-xs bg-[var(--green-accent)]/10 text-[var(--green-accent)] border border-[var(--green-accent)]/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">PREFEITURA ZERO PAPEL</span>
          </h1>
        </div>
        <button 
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-secondary)] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar dados
          </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border-color)] pb-px scrollbar-none">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'protocolos', label: 'Protocolos', icon: FolderOpen },
          { id: 'processos', label: 'Processos', icon: FileSignature },
          { id: 'workflow', label: 'Workflow', icon: Layers },
          { id: 'ged', label: 'GED', icon: Layers },
          { id: 'documentos', label: 'Documentos', icon: FileText },
          { id: 'auditoria', label: 'Auditoria', icon: ShieldAlert },
          { id: 'relatorios', label: 'Relatórios', icon: FileText }
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isSelected = currentSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isSelected 
                  ? 'border-[var(--green-accent)] text-[var(--green-accent)] bg-[var(--green-accent)]/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-[var(--border-color)]'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
         <div className="p-10 text-center">Carregando dados...</div>
      ) : (
        <div className="space-y-6">
          {currentSubTab === 'dashboard' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               {[
                 {title: 'Protocolos', val: data.protocols.length},
                 {title: 'Processos', val: data.processes.length},
                 {title: 'Workflows', val: data.workflows.length},
                 {title: 'Documentos', val: data.documents.length},
                 {title: 'Auditorias', val: data.audits.length},
                 {title: 'Relatórios', val: data.reports.length}
               ].map(item => (
                 <div key={item.title} className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl">
                   <p className="text-xs text-[var(--text-secondary)]">{item.title}</p>
                   <h3 className="text-2xl font-bold">{item.val > 0 ? item.val : 'NO_DATA'}</h3>
                 </div>
               ))}
            </div>
          )}
          {currentSubTab !== 'dashboard' && (
            <div className="p-10 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl">
              <h2 className="text-lg font-bold mb-4">{currentSubTab.toUpperCase()}</h2>
              {data[currentSubTab]?.length === 0 ? "Nenhum dado encontrado." : 
                <pre className="text-xs">{JSON.stringify(data[currentSubTab], null, 2)}</pre>
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}
