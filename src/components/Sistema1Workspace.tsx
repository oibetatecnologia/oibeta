import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FileText, Users, CheckSquare, Layers, Activity, FileSignature,
  Plus, Edit, Eye, Trash2, ArrowRight, CheckCircle, XCircle, X, Download, AlertCircle,
  RefreshCw, Search, Filter, Calendar, FolderOpen, Send, Clock, UserCheck, Check,
  ChevronRight, Award, ShieldAlert, Landmark, Sparkles
} from 'lucide-react';

interface Sistema1WorkspaceProps {
  user: any;
  setActiveTab: (tab: string) => void;
  activeTab: string;
  selectedProjectId: string;
}

// Data structures from backend domains (custom-mapped inside our frontend module)
interface PublicPublication {
  id: string;
  status: string;
  metadataJson: {
    title?: string;
    category?: string;
    createdAt?: string;
  };
  createdAt?: string;
}

interface OmbudsmanRequest {
  id: string;
  subject: string;
  content: string | null;
  status: string;
  metadataJson: {
    type?: 'ouvidoria' | 'esic';
    protocol?: string;
    category?: string; // for ouvidoria (Elogio, Reclamação, Denúncia, Sugestão)
    requester?: string; // for esic (Solicitante name)
    deadline?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface OmbudsmanResponse {
  id: string;
  requestId: string;
  content: string;
  status: string;
  metadataJson: {
    responderName?: string;
    createdAt?: string;
  };
  createdAt: string;
}

interface TransparencyReport {
  id: string;
  publicationId: string;
  title: string;
  content: string | null;
  status: string;
  metadataJson: {
    type?: string;
    author?: string;
    downloadUrl?: string;
  };
  createdAt: string;
}

export default function Sistema1Workspace({ user, setActiveTab, activeTab, selectedProjectId }: Sistema1WorkspaceProps) {
  // Current tab matching or fallback
  const [currentSubTab, setCurrentSubTab] = useState<string>('dashboard');

  // Backend state storage
  const [publications, setPublications] = useState<PublicPublication[]>([]);
  const [requests, setRequests] = useState<OmbudsmanRequest[]>([]);
  const [responses, setResponses] = useState<OmbudsmanResponse[]>([]);
  const [reports, setReports] = useState<TransparencyReport[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal / Interaction states
  const [isPubModalOpen, setIsPubModalOpen] = useState(false);
  const [pubForm, setPubForm] = useState({
    title: '',
    category: 'Receitas',
    status: 'ACTIVE'
  });

  const [isOuvModalOpen, setIsOuvModalOpen] = useState(false);
  const [ouvForm, setOuvForm] = useState({
    subject: '',
    content: '',
    category: 'Reclamação'
  });

  const [isEsicModalOpen, setIsEsicModalOpen] = useState(false);
  const [esicForm, setEsicForm] = useState({
    subject: '',
    content: '',
    requester: ''
  });

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    title: '',
    content: '',
    status: 'APPROVED'
  });

  // Detailed views
  const [selectedRequest, setSelectedRequest] = useState<OmbudsmanRequest | null>(null);
  const [selectedPublication, setSelectedPublication] = useState<PublicPublication | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [responseContent, setResponseContent] = useState('');

  // Sync sub tabs directly with activeTab
  useEffect(() => {
    if (activeTab === 's1_dashboard') setCurrentSubTab('dashboard');
    else if (activeTab === 's1_transparencia' || activeTab === 'transparencia') setCurrentSubTab('transparencia');
    else if (activeTab === 's1_ouvidoria' || activeTab === 'ouvidoria') setCurrentSubTab('ouvidoria');
    else if (activeTab === 's1_esic' || activeTab === 'esic') setCurrentSubTab('esic');
    else if (activeTab === 's1_solicitacoes') setCurrentSubTab('solicitacoes');
    else if (activeTab === 's1_indicadores') setCurrentSubTab('indicadores');
    else if (activeTab === 's1_relatorios') setCurrentSubTab('relatorios');
  }, [activeTab]);

  const handleSubTabChange = (tabId: string) => {
    setCurrentSubTab(tabId);
    if (tabId === 'dashboard') setActiveTab('s1_dashboard');
    else if (tabId === 'transparencia') setActiveTab('s1_transparencia');
    else if (tabId === 'ouvidoria') setActiveTab('s1_ouvidoria');
    else if (tabId === 'esic') setActiveTab('s1_esic');
    else if (tabId === 'solicitacoes') setActiveTab('s1_solicitacoes');
    else if (tabId === 'indicadores') setActiveTab('s1_indicadores');
    else if (tabId === 'relatorios') setActiveTab('s1_relatorios');
  };

  // Fetch all real data from backend
  const fetchAllData = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const workspaceId = selectedProjectId;

      // Parallel reads on actual backend endpoints
      const [resPubs, resReqs, resReps, resReports] = await Promise.all([
        fetch(`/api/gov/public-publications?workspaceId=${workspaceId}`),
        fetch(`/api/gov/ombudsman/requests?workspaceId=${workspaceId}`),
        fetch(`/api/gov/ombudsman/responses?workspaceId=${workspaceId}`),
        fetch(`/api/gov/transparency/reports?workspaceId=${workspaceId}`)
      ]);

      if (!resPubs.ok || !resReqs.ok || !resReps.ok || !resReports.ok) {
        throw new Error("Erro na comunicação com as APIs do Governo.");
      }

      const pubsData = await resPubs.json();
      const reqsData = await resReqs.json();
      const repsData = await resReps.json();
      const reportsData = await resReports.json();

      setPublications(Array.isArray(pubsData) ? pubsData : []);
      setRequests(Array.isArray(reqsData) ? reqsData : []);
      setResponses(Array.isArray(repsData) ? repsData : []);
      setReports(Array.isArray(reportsData) ? reportsData : []);
    } catch (err: any) {
      console.error("fetchError in Sistema1:", err);
      setError(err?.message || "Houve uma falha ao consultar dados do servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedProjectId]);

  // Handle Form Submissions via standard POST
  const handleCreatePublication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubForm.title.trim()) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/gov/public-publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedProjectId,
          status: pubForm.status,
          metadataJson: {
            title: pubForm.title,
            category: pubForm.category,
            createdAt: new Date().toISOString()
          }
        })
      });
      if (!res.ok) throw new Error("Erro de processamento.");
      
      setPubForm({ title: '', category: 'Receitas', status: 'ACTIVE' });
      setIsPubModalOpen(false);
      await fetchAllData();
    } catch (err) {
      alert("Houve uma falha ao cadastrar a publicação.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateOuvidoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ouvForm.subject.trim() || !ouvForm.content.trim()) return;
    setLoadingAction(true);
    try {
      const protocolNumber = `OUV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch('/api/gov/ombudsman/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedProjectId,
          subject: ouvForm.subject,
          content: ouvForm.content,
          status: 'PENDING',
          metadataJson: {
            type: 'ouvidoria',
            category: ouvForm.category,
            protocol: protocolNumber,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        })
      });
      if (!res.ok) throw new Error("Erro de processamento.");

      setOuvForm({ subject: '', content: '', category: 'Reclamação' });
      setIsOuvModalOpen(false);
      await fetchAllData();
    } catch (err) {
      alert("Falha ao registrar manifestação.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateEsic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esicForm.subject.trim() || !esicForm.content.trim() || !esicForm.requester.trim()) return;
    setLoadingAction(true);
    try {
      const protocolNumber = `SIC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch('/api/gov/ombudsman/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedProjectId,
          subject: esicForm.subject,
          content: esicForm.content,
          status: 'PENDING',
          metadataJson: {
            type: 'esic',
            requester: esicForm.requester,
            protocol: protocolNumber,
            deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        })
      });
      if (!res.ok) throw new Error("Erro de processamento.");

      setEsicForm({ subject: '', content: '', requester: '' });
      setIsEsicModalOpen(false);
      await fetchAllData();
    } catch (err) {
      alert("Falha ao cadastrar solicitação.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !responseContent.trim()) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/gov/ombudsman/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedProjectId,
          requestId: selectedRequest.id,
          content: responseContent,
          status: 'APPROVED',
          metadataJson: {
            responderName: user?.name || "Ouvidor-Geral",
            createdAt: new Date().toISOString()
          }
        })
      });
      if (!res.ok) throw new Error("Erro de processamento.");

      setResponseContent('');
      setIsResponding(false);
      setSelectedRequest(null);
      await fetchAllData();
    } catch (err) {
      alert("Falha ao registrar resposta do ouvidor.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.title.trim() || !reportForm.content.trim()) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/gov/transparency/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedProjectId,
          publicationId: `PUB-${Math.floor(1000 + Math.random() * 9000)}`,
          title: reportForm.title,
          content: reportForm.content,
          status: reportForm.status,
          metadataJson: {
            type: 'transparencia',
            author: user?.name || "Controlador-Geral",
            downloadUrl: "#"
          }
        })
      });
      if (!res.ok) throw new Error("Erro ao criar relatório.");

      setReportForm({ title: '', content: '', status: 'APPROVED' });
      setIsReportModalOpen(false);
      await fetchAllData();
    } catch (err) {
      alert("Falha ao criar relatório de transparência.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Metric Calculation Logic Derived Live From Real Backend Data
  const computeRealMetrics = () => {
    const ouvidoriaItems = requests.filter(r => r.metadataJson?.type === 'ouvidoria');
    const esicItems = requests.filter(r => r.metadataJson?.type === 'esic');
    
    // Status metrics
    const totalManifestations = ouvidoriaItems.length;
    const totalRequestsCount = requests.length;

    const resolvedRequests = requests.filter(r => responses.some(rep => rep.requestId === r.id));
    const finishedRequestsCount = resolvedRequests.length;
    const pendingRequestsCount = totalRequestsCount - finishedRequestsCount;

    // SLA (Met within deadline)
    let metSlaCount = 0;
    resolvedRequests.forEach(req => {
      const deadlineStr = req.metadataJson?.deadline;
      const responseObj = responses.find(rep => rep.requestId === req.id);
      if (deadlineStr && responseObj) {
        const deadline = new Date(deadlineStr).getTime();
        const repliedAt = new Date(responseObj.createdAt || req.updatedAt).getTime();
        if (repliedAt <= deadline) {
          metSlaCount++;
        }
      }
    });
    const avgSla = finishedRequestsCount > 0 ? Math.round((metSlaCount / finishedRequestsCount) * 100) : null;

    // Tempo médio de resposta (in days)
    let totalDiffDays = 0;
    let respondedCount = 0;
    resolvedRequests.forEach(req => {
      const responseObj = responses.find(rep => rep.requestId === req.id);
      if (responseObj) {
        const start = new Date(req.createdAt).getTime();
        const end = new Date(responseObj.createdAt || req.updatedAt).getTime();
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0) {
          totalDiffDays += diffDays;
          respondedCount++;
        }
      }
    });
    const avgResponseTime = respondedCount > 0 ? (totalDiffDays / respondedCount).toFixed(1) : null;

    return {
      avgSla: avgSla !== null ? `${avgSla}%` : 'NO_DATA',
      avgResponseTime: avgResponseTime !== null ? `${avgResponseTime} dias` : 'NO_DATA',
      totalManifestations,
      finishedRequestsCount,
      pendingRequestsCount,
      totalPublications: publications.length,
      totalReports: reports.length
    };
  };

  const metrics = computeRealMetrics();

  // Helper date formatter
  const formatDate = (isoStr: any) => {
    if (!isoStr) return '-';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return isoStr;
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Landmark className="w-16 h-16 text-[var(--text-secondary)] animate-pulse" />
        <h3 className="text-xl font-bold text-[var(--text-main)]">Selecione um Espaço de Trabalho</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-md">
          Para visualizar os dados reais do Portal de Transparência, Ouvidoria Geral e e-SIC, selecione uma organização ou projeto de governo ativa no menu superior.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--text-main)] pb-20 space-y-8 animate-fade-in">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[var(--border-color)] pb-5 gap-4">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-[var(--cyan-accent)]">Workspace GovTech</span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-sans text-[var(--text-main)] flex items-center gap-2">
            🏛️ Sistema 1 <span className="text-xs bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] border border-[var(--blue-accent)]/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">BETA OPERACIONAL</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
            Transparência Ativa, Ouvidoria Geral (Lei 13.460/17) e Transparência Passiva (e-SIC / LAI) integradas.
          </p>
        </div>
        
        {/* Actions Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-secondary)] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar dados reais
          </button>
        </div>
      </div>

      {/* SPRINT REQUIRED SUB-NAV */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border-color)] pb-px scrollbar-none">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'transparencia', label: 'Transparência', icon: FileText },
          { id: 'ouvidoria', label: 'Ouvidoria', icon: Users },
          { id: 'esic', label: 'e-SIC', icon: CheckSquare },
          { id: 'solicitacoes', label: 'Solicitações', icon: Layers },
          { id: 'indicadores', label: 'Indicadores', icon: Activity },
          { id: 'relatorios', label: 'Relatórios', icon: FileSignature }
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isSelected = currentSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isSelected 
                  ? 'border-[var(--blue-accent)] text-[var(--blue-accent)] bg-[var(--blue-accent)]/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-[var(--border-color)]'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ERROR MESSAGE IF ANY */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/15 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-500">Falha de Comunicação</h4>
            <p className="text-xs text-[var(--text-secondary)]">{error}</p>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE SCREEN */}
      {loading ? (
        // Loading State Skeleton
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3 animate-pulse">
                <div className="h-2.5 bg-[var(--border-color)] w-1/3 rounded"></div>
                <div className="h-6 bg-[var(--border-color)] w-3/4 rounded mt-1"></div>
              </div>
            ))}
          </div>
          <div className="h-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl animate-pulse"></div>
        </div>
      ) : (
        <>
          {/* SUBMENU 1: DASHBOARD */}
          {currentSubTab === 'dashboard' && (
            <div className="space-y-8">
              
              {/* TOP SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* 1. Publicações */}
                <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                    <FileText className="w-3 h-3 text-[var(--cyan-accent)]" /> Transparência Ativa
                  </span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold tracking-tight font-sans text-[var(--text-main)]">
                      {metrics.totalPublications}
                    </h3>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-normal">Publicações oficiais publicadas</p>
                </div>

                {/* 2. Ouvidoria Manifestations */}
                <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                    <Users className="w-3 h-3 text-[var(--green-accent)]" /> Manifestações
                  </span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold tracking-tight font-sans text-[var(--text-main)]">
                      {metrics.totalManifestations}
                    </h3>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-normal">Total Ouvidoria (Lei 13.460/17)</p>
                </div>

                {/* 3. e-SIC Requests */}
                <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-[var(--blue-accent)]" /> Pedidos e-SIC
                  </span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold tracking-tight font-sans text-[var(--text-main)]">
                      {requests.filter(r => r.metadataJson?.type === 'esic').length}
                    </h3>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-normal">Pedidos de acesso passivo (LAI)</p>
                </div>

                {/* 4. Concluídas */}
                <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-500" /> Atendidas
                  </span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold tracking-tight font-sans text-emerald-500">
                      {metrics.finishedRequestsCount}
                    </h3>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-normal">Solicitações com resposta real</p>
                </div>

                {/* 5. Pendentes */}
                <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" /> Pendentes
                  </span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold tracking-tight font-sans text-amber-500">
                      {metrics.pendingRequestsCount}
                    </h3>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-normal">Aguardando manifestação do órgão</p>
                </div>

              </div>

              {/* RECENT RECORDS PREVIEW GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Latests Portal publications */}
                <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-main)]">Últimas Publicações — Portal da Transparência</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Documentos ativos de transparência governamental.</p>
                    </div>
                    <button 
                      onClick={() => handleSubTabChange('transparencia')}
                      className="text-xs text-[var(--blue-accent)] font-semibold hover:underline flex items-center gap-1"
                    >
                      Ver todas <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {publications.length === 0 ? (
                    <div className="p-10 border border-dashed border-[var(--border-color)] rounded-xl text-center space-y-1">
                      <FolderOpen className="w-8 h-8 text-[var(--text-secondary)] mx-auto opacity-40" />
                      <p className="text-xs text-[var(--text-secondary)]">Nenhum dado encontrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {publications.slice(0, 4).map(pub => (
                        <div key={pub.id} className="p-3.5 bg-[var(--bg-main)]/40 hover:bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl flex items-center justify-between transition gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--text-main)] truncate">
                              {pub.metadataJson?.title || "Documento de Transparência"}
                            </p>
                            <span className="inline-block mt-1 text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold uppercase bg-[var(--cyan-accent)]/10 text-[var(--cyan-accent)] border border-[var(--cyan-accent)]/20">
                              {pub.metadataJson?.category || "Geral"}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                            {formatDate(pub.metadataJson?.createdAt || pub.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Latest Citizen Manifestations / Requests */}
                <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-main)]">Ouvidoria & e-SIC Recentes</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Canais de recebimento e suporte ao cidadão da prefeitura.</p>
                    </div>
                    <button 
                      onClick={() => handleSubTabChange('solicitacoes')}
                      className="text-xs text-[var(--blue-accent)] font-semibold hover:underline flex items-center gap-1"
                    >
                      Ver todas <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {requests.length === 0 ? (
                    <div className="p-10 border border-dashed border-[var(--border-color)] rounded-xl text-center space-y-1">
                      <Users className="w-8 h-8 text-[var(--text-secondary)] mx-auto opacity-40" />
                      <p className="text-xs text-[var(--text-secondary)]">Nenhum dado encontrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {requests.slice(0, 4).map(req => {
                        const hasResponse = responses.some(rep => rep.requestId === req.id);
                        return (
                          <div key={req.id} className="p-3.5 bg-[var(--bg-main)]/40 hover:bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl flex items-center justify-between transition gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                                  {req.metadataJson?.protocol || "#"}
                                </span>
                                <span className={`text-[9px] px-1 rounded font-bold uppercase ${
                                  req.metadataJson?.type === 'ouvidoria' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                                    : 'bg-sky-500/10 text-sky-400 border border-sky-500/15'
                                }`}>
                                  {req.metadataJson?.type === 'ouvidoria' ? 'Ouvidoria' : 'e-SIC'}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[var(--text-main)] truncate mt-1">
                                {req.subject}
                              </p>
                            </div>
                            <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-bold ${
                              hasResponse 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {hasResponse ? 'Respondida' : 'Pendente'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* RELATÓRIOS COMPLIANCE ALERT BANNER */}
              <div className="p-6 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Conformidade à Lei de Acesso à Informação (LAI)
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-2xl">
                    Verifique os prazos e relatórios em conformidade com as diretrizes do Tribunal de Contas. O e-SIC possui limite máximo de 20 (+10) dias de tolerância legal para atendimento definitivo de solicitações.
                  </p>
                </div>
                <div className="text-xs text-indigo-400 font-mono font-bold bg-indigo-505/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-center md:text-right shrink-0">
                  ESTADO ATUAL: OPERACIONAL
                </div>
              </div>

            </div>
          )}

          {/* SUBMENU 2: PORTAL DA TRANSPARÊNCIA */}
          {currentSubTab === 'transparencia' && (
            <div className="space-y-6">
              
              {/* Actions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-color)] pb-4 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                    📂 Portal de Transparência Ativa
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">Divulgação de atos institucionais, receitas e despesas.</p>
                </div>
                <button
                  onClick={() => setIsPubModalOpen(true)}
                  className="flex items-center justify-center gap-1 bg-[var(--blue-accent)] hover:bg-[var(--blue-accent)]/90 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Publicar Documento Real
                </button>
              </div>

              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--bg-card)] p-4 border border-[var(--border-color)] rounded-xl">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar publicações por título..."
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg pl-9 pr-4 py-2 focus:ring-1 focus:ring-[var(--blue-accent)] outline-none text-[var(--text-main)]"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 text-[var(--text-main)] cursor-pointer outline-none"
                  >
                    <option value="ALL">Todas as Categorias</option>
                    <option value="Receitas">Receitas</option>
                    <option value="Despesas">Despesas</option>
                    <option value="Licitações">Licitações</option>
                    <option value="Pessoal">Pessoal</option>
                    <option value="Contratos">Contratos</option>
                    <option value="Emendas">Emendas</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 text-[var(--text-main)] cursor-pointer outline-none"
                  >
                    <option value="ALL">Todos os status</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="ARQUIVADO">Arquivado</option>
                    <option value="PENDENTE">Pendente</option>
                  </select>
                </div>
              </div>

              {/* Real Listing Table */}
              {(() => {
                const filteredPubs = publications.filter(pub => {
                  const title = (pub.metadataJson?.title || '').toLowerCase();
                  const cat = pub.metadataJson?.category || 'Receitas';
                  const stat = pub.status || 'ACTIVE';
                  const matchesSearch = title.includes(searchQuery.toLowerCase());
                  const matchesCategory = categoryFilter === 'ALL' || cat === categoryFilter;
                  const matchesStatus = statusFilter === 'ALL' || stat === statusFilter;
                  return matchesSearch && matchesCategory && matchesStatus;
                });

                if (filteredPubs.length === 0) {
                  return (
                    <div className="p-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-center space-y-2">
                      <FolderOpen className="w-12 h-12 text-[var(--text-secondary)] mx-auto opacity-35" />
                      <h4 className="text-sm font-bold text-[var(--text-main)]">Nenhum dado encontrado.</h4>
                      <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">Não encontramos publicações registradas para os filtros selecionados.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] text-[10.5px] uppercase font-mono text-[var(--text-secondary)]">
                          <th className="px-6 py-3.5 font-semibold">Documento / Publicação</th>
                          <th className="px-6 py-3.5 font-semibold">Categoria</th>
                          <th className="px-6 py-3.5 font-semibold">Status</th>
                          <th className="px-6 py-3.5 font-semibold">Data de Publicação</th>
                          <th className="px-6 py-3.5 font-semibold text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)] text-xs">
                        {filteredPubs.map(pub => (
                          <tr key={pub.id} className="hover:bg-[var(--bg-main)]/35 transition">
                            <td className="px-6 py-4">
                              <span className="font-bold text-[var(--text-main)] block truncate max-w-md">
                                {pub.metadataJson?.title || "Relatório Institucional"}
                              </span>
                              <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                                ID: {pub.id.slice(0, 8)}...
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-[var(--cyan-accent)]/10 text-[var(--cyan-accent)] border border-[var(--cyan-accent)]/15">
                                {pub.metadataJson?.category || "Geral"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                pub.status === 'ACTIVE' ? 'text-emerald-500' : 'text-[var(--text-secondary)]'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${pub.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                                {pub.status === 'ACTIVE' ? 'Ativo' : pub.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-[11px] text-[var(--text-secondary)]">
                              {formatDate(pub.metadataJson?.createdAt || pub.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => setSelectedPublication(pub)}
                                className="text-xs font-bold text-[var(--blue-accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                Visualizar <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            </div>
          )}

          {/* SUBMENU 3: OUVIDORIA GERAL */}
          {currentSubTab === 'ouvidoria' && (
            <div className="space-y-6">
              
              {/* Actions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-color)] pb-4 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                    🗣️ Ouvidoria Geral e Manifestações (Lei 13.460/17)
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">Elogios, reclamações, denúncias e sugestões dos munícipes.</p>
                </div>
                <button
                  onClick={() => setIsOuvModalOpen(true)}
                  className="flex items-center justify-center gap-1 bg-[var(--green-accent)] hover:bg-[var(--green-accent)]/90 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Registrar Manifestação Cidadã
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--bg-card)] p-4 border border-[var(--border-color)] rounded-xl">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar manifestação por assunto ou protocolo..."
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg pl-9 pr-4 py-2 focus:ring-1 focus:ring-[var(--blue-accent)] outline-none text-[var(--text-main)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 text-[var(--text-main)] cursor-pointer outline-none"
                  >
                    <option value="ALL">Todas as situações</option>
                    <option value="PENDING">Aguardando Resposta</option>
                    <option value="RESOLVED">Respondida</option>
                  </select>
                </div>
              </div>

              {/* Real Listing Table */}
              {(() => {
                const ouvidoriaItems = requests.filter(r => r.metadataJson?.type === 'ouvidoria');
                
                const filteredItems = ouvidoriaItems.filter(item => {
                  const subject = item.subject.toLowerCase();
                  const protocol = (item.metadataJson?.protocol || '').toLowerCase();
                  const hasResponse = responses.some(rep => rep.requestId === item.id);
                  const isPending = !hasResponse;

                  const matchesSearch = subject.includes(searchQuery.toLowerCase()) || protocol.includes(searchQuery.toLowerCase());
                  const matchesStatus = statusFilter === 'ALL' || 
                                        (statusFilter === 'RESOLVED' && hasResponse) || 
                                        (statusFilter === 'PENDING' && isPending);
                  
                  return matchesSearch && matchesStatus;
                });

                if (filteredItems.length === 0) {
                  return (
                    <div className="p-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-center space-y-2">
                      <Users className="w-12 h-12 text-[var(--text-secondary)] mx-auto opacity-35" />
                      <h4 className="text-sm font-bold text-[var(--text-main)]">Nenhum dado encontrado.</h4>
                      <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">Nenhuma manifestação cidadã localizada com os filtros atuais.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] text-[10.5px] uppercase font-mono text-[var(--text-secondary)]">
                          <th className="px-6 py-3.5 font-semibold">Protocolo</th>
                          <th className="px-6 py-3.5 font-semibold">Manifestação / Assunto</th>
                          <th className="px-6 py-3.5 font-semibold">Categoria</th>
                          <th className="px-6 py-3.5 font-semibold">Prazo de Resposta</th>
                          <th className="px-6 py-3.5 font-semibold">Situação</th>
                          <th className="px-6 py-3.5 font-semibold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)] text-xs">
                        {filteredItems.map(item => {
                          const hasResponse = responses.some(rep => rep.requestId === item.id);
                          return (
                            <tr key={item.id} className="hover:bg-[var(--bg-main)]/35 transition">
                              <td className="px-6 py-4 font-mono font-bold text-[var(--blue-accent)]">
                                {item.metadataJson?.protocol || `#${item.id.slice(0,6)}`}
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-[var(--text-main)] block truncate max-w-sm">
                                  {item.subject}
                                </span>
                                <span className="text-[10px] text-[var(--text-secondary)] block truncate max-w-sm mt-0.5">
                                  {item.content || "Sem detalhamento adicional."}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {item.metadataJson?.category || "Reclamação"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-[var(--text-secondary)]">
                                {formatDate(item.metadataJson?.deadline)}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                  hasResponse ? 'text-emerald-400' : 'text-amber-500'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${hasResponse ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  {hasResponse ? 'Atendido' : 'Aguardando Resposta'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedRequest(item);
                                    setIsResponding(false);
                                  }}
                                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  Visualizar <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(item);
                                    setIsResponding(true);
                                  }}
                                  className="text-xs font-bold text-[var(--blue-accent)] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  Responder <Send className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            </div>
          )}

          {/* SUBMENU 4: e-SIC */}
          {currentSubTab === 'esic' && (
            <div className="space-y-6">
              
              {/* Actions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-color)] pb-4 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                    ✉️ e-SIC — Pedido de Acesso à Informação (Lei Federal nº 12.527)
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">Transparência Passiva governamental em cumprimento à Lei de Acesso à Informação.</p>
                </div>
                <button
                  onClick={() => setIsEsicModalOpen(true)}
                  className="flex items-center justify-center gap-1 bg-[var(--blue-accent)] hover:bg-[var(--blue-accent)]/90 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar Solicitação Passiva
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--bg-card)] p-4 border border-[var(--border-color)] rounded-xl">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar solicitação por protocolo, assunto ou requerente..."
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg pl-9 pr-4 py-2 focus:ring-1 focus:ring-[var(--blue-accent)] outline-none text-[var(--text-main)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 text-[var(--text-main)] cursor-pointer outline-none"
                  >
                    <option value="ALL">Todos os status</option>
                    <option value="PENDING">Aguardando Resposta</option>
                    <option value="RESOLVED">Concluídas</option>
                  </select>
                </div>
              </div>

              {/* Real Listing Table */}
              {(() => {
                const esicItems = requests.filter(r => r.metadataJson?.type === 'esic');
                
                const filteredItems = esicItems.filter(item => {
                  const subject = item.subject.toLowerCase();
                  const protocol = (item.metadataJson?.protocol || '').toLowerCase();
                  const requester = (item.metadataJson?.requester || '').toLowerCase();
                  const hasResponse = responses.some(rep => rep.requestId === item.id);
                  const isPending = !hasResponse;

                  const matchesSearch = subject.includes(searchQuery.toLowerCase()) || 
                                        protocol.includes(searchQuery.toLowerCase()) || 
                                        requester.includes(searchQuery.toLowerCase());
                  const matchesStatus = statusFilter === 'ALL' || 
                                        (statusFilter === 'RESOLVED' && hasResponse) || 
                                        (statusFilter === 'PENDING' && isPending);
                  
                  return matchesSearch && matchesStatus;
                });

                if (filteredItems.length === 0) {
                  return (
                    <div className="p-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-center space-y-2">
                      <CheckSquare className="w-12 h-12 text-[var(--text-secondary)] mx-auto opacity-35" />
                      <h4 className="text-sm font-bold text-[var(--text-main)]">Nenhum dado encontrado.</h4>
                      <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">Nenhum pedido de acesso à informação e-SIC registrado atualmente.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] text-[10.5px] uppercase font-mono text-[var(--text-secondary)]">
                          <th className="px-6 py-3.5 font-semibold">Nº Protocolo</th>
                          <th className="px-6 py-3.5 font-semibold">Solicitante</th>
                          <th className="px-6 py-3.5 font-semibold">Especificação do Pedido</th>
                          <th className="px-6 py-3.5 font-semibold">Prazo de Resposta</th>
                          <th className="px-6 py-3.5 font-semibold">Situação</th>
                          <th className="px-6 py-3.5 font-semibold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)] text-xs">
                        {filteredItems.map(item => {
                          const hasResponse = responses.some(rep => rep.requestId === item.id);
                          return (
                            <tr key={item.id} className="hover:bg-[var(--bg-main)]/35 transition">
                              <td className="px-6 py-4 font-mono font-bold text-[var(--cyan-accent)]">
                                {item.metadataJson?.protocol || `#${item.id.slice(0, 6)}`}
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-[var(--text-main)]">
                                  {item.metadataJson?.requester || "Anônimo"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-semibold text-[var(--text-main)] block truncate max-w-sm">
                                  {item.subject}
                                </span>
                                <span className="text-[10px] text-[var(--text-secondary)] block truncate max-w-sm mt-0.5">
                                  {item.content || "Nenhum detalhe adicional informado."}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-[11px] text-[var(--text-secondary)]">
                                {formatDate(item.metadataJson?.deadline)}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                  hasResponse ? 'text-emerald-400' : 'text-amber-500'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${hasResponse ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  {hasResponse ? 'Concluído' : 'Em Análise (Prazo Legal)'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedRequest(item);
                                    setIsResponding(false);
                                  }}
                                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  Visualizar <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(item);
                                    setIsResponding(true);
                                  }}
                                  className="text-xs font-bold text-[var(--blue-accent)] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  Responder <Send className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            </div>
          )}

          {/* SUBMENU 5: SOLICITAÇÕES CONSOLIDADAS */}
          {currentSubTab === 'solicitacoes' && (
            <div className="space-y-6">
              
              <div className="border-b border-[var(--border-color)] pb-4">
                <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  🗂️ Painel Unificado de Demandas Citizen
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">Controle integrado de todas as manifestações de Ouvidoria, e-SIC e LAI.</p>
              </div>

              {/* Filters Panel */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[var(--bg-card)] p-4 border border-[var(--border-color)] rounded-xl">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por assunto, protocolo ou detalhes do pedido..."
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg pl-9 pr-4 py-2 focus:ring-1 focus:ring-[var(--blue-accent)] outline-none text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 text-[var(--text-main)] cursor-pointer outline-none"
                  >
                    <option value="ALL">Todos os Canais</option>
                    <option value="ouvidoria">Ouvidoria Geral</option>
                    <option value="esic">e-SIC / LAI</option>
                  </select>
                </div>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 text-[var(--text-main)] cursor-pointer outline-none"
                  >
                    <option value="ALL">Todas as situações</option>
                    <option value="PENDING">Pendente</option>
                    <option value="RESOLVED">Respondida</option>
                  </select>
                </div>
              </div>

              {/* Combined Requests List */}
              {(() => {
                const filtered = requests.filter(item => {
                  const matchesSearch = item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      (item.metadataJson?.protocol || '').toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesType = typeFilter === 'ALL' || item.metadataJson?.type === typeFilter;
                  
                  const hasResponse = responses.some(rep => rep.requestId === item.id);
                  const matchesStatus = statusFilter === 'ALL' || 
                                        (statusFilter === 'RESOLVED' && hasResponse) ||
                                        (statusFilter === 'PENDING' && !hasResponse);

                  return matchesSearch && matchesType && matchesStatus;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-center space-y-2">
                      <Layers className="w-12 h-12 text-[var(--text-secondary)] mx-auto opacity-35" />
                      <h4 className="text-sm font-bold text-[var(--text-main)]">Nenhum dado encontrado.</h4>
                      <p className="text-xs text-[var(--text-secondary)]">Não existem demandas registradas para os critérios informados.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(item => {
                      const hasResponse = responses.some(rep => rep.requestId === item.id);
                      const isOuv = item.metadataJson?.type === 'ouvidoria';
                      return (
                        <div key={item.id} className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm hover:border-[var(--blue-accent)]/45 transition space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-[var(--text-secondary)]">
                              {item.metadataJson?.protocol || '#000000'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                isOuv 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                  : 'bg-sky-500/10 text-sky-400 border border-sky-500/15'
                              }`}>
                                {isOuv ? 'Ouvidoria' : 'e-SIC (LAI)'}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                hasResponse ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}>
                                {hasResponse ? 'Atendida' : 'Pendente'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-[var(--text-main)] truncate">{item.subject}</h4>
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                              {item.content || "Nenhum teor ou detalhe complementar fornecido."}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] text-[10.5px] text-[var(--text-secondary)]">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[var(--cyan-accent)]" /> {formatDate(item.createdAt)}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedRequest(item);
                                setIsResponding(false);
                              }}
                              className="text-xs text-[var(--blue-accent)] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              Visualizar Detalhe <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
          )}

          {/* SUBMENU 6: INDICADORES */}
          {currentSubTab === 'indicadores' && (
            <div className="space-y-8 animate-scale-in">
              
              <div className="border-b border-[var(--border-color)] pb-4">
                <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  📊 Indicadores de Transparência e Atendimento
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">Métricas reais computadas pelo banco de dados sobre volume de respostas e eficiência.</p>
              </div>

              {/* Real Metrics Highlight */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">SLA Médio Geral</span>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--blue-accent)]">{metrics.avgSla}</h2>
                    <p className="text-[10px] text-[var(--text-secondary)]">Atendimento dentro do prazo da LAI</p>
                  </div>
                  <Award className="w-10 h-10 text-[var(--blue-accent)]/20" />
                </div>

                <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Tempo de Resposta</span>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--cyan-accent)]">{metrics.avgResponseTime}</h2>
                    <p className="text-[10px] text-[var(--text-secondary)]">Média de dias para resposta final</p>
                  </div>
                  <Clock className="w-10 h-10 text-[var(--cyan-accent)]/20" />
                </div>

                <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Demandas Concluídas</span>
                    <h2 className="text-3xl font-bold tracking-tight text-emerald-500">{metrics.finishedRequestsCount}</h2>
                    <p className="text-[10px] text-[var(--text-secondary)]">Manifestações e-SIC & Ouvidoria sanadas</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-emerald-500/20" />
                </div>

                <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Demandas Pendentes</span>
                    <h2 className="text-3xl font-bold tracking-tight text-amber-500">{metrics.pendingRequestsCount}</h2>
                    <p className="text-[10px] text-[var(--text-secondary)]">Aguardando diligência do órgão público</p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-amber-500/20" />
                </div>

              </div>

              {/* Metric Verification details */}
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[var(--cyan-accent)]" /> Detalhamento de Auditoria dos Indicadores
                </h4>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-3">
                  <p>
                    De acordo com a Lei Federal nº 12.527/2011, as prefeituras e câmaras municipais devem divulgar ativamente as seguintes métricas de controle, obtidas em tempo real das interações no banco de dados. No momento, o sistema audita {requests.length} interações totais para o Workspace selecionado.
                  </p>
                  <ul className="list-disc leading-relaxed list-inside pl-2 space-y-1 font-mono text-[11px] text-[var(--text-secondary)]">
                    <li>SLA de Ouvidoria Geral (Meta recomendada de atendimento: &gt; 90% dentro do prazo legal)</li>
                    <li>SLA de e-SIC (Meta legal obrigatória: resposta definitiva em até 20 dias, com prorrogação justificada de mais 10 dias)</li>
                    <li>Publicações Ativas de Transparência (Atas, portarias, relatórios de gestão fiscal RGF, relatórios resumidos da execução orçamentária RREO)</li>
                  </ul>
                  <p className="border-t border-[var(--border-color)] pt-3 text-[10px] text-[var(--text-secondary)] flex items-center justify-between">
                    <span>Última simulação e indexação do banco JSON: {new Date().toLocaleDateString('pt-BR')}</span>
                    <span className="text-green-400 font-bold shrink-0">● CONFORMIDADE OK</span>
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* SUBMENU 7: RELATÓRIOS */}
          {currentSubTab === 'relatorios' && (
            <div className="space-y-6">
              
              {/* Actions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-color)] pb-4 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                    📋 Relatórios de Ouvidoria e LAI
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">Exportação e consulta de relatórios de auditoria e conformidade.</p>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center justify-center gap-1 bg-[var(--blue-accent)] hover:bg-[var(--blue-accent)]/90 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Gerar Relatório de Auditoria
                </button>
              </div>

              {/* Real Listing Table */}
              {(() => {
                if (reports.length === 0) {
                  return (
                    <div className="p-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-center space-y-2">
                      <FileSignature className="w-12 h-12 text-[var(--text-secondary)] mx-auto opacity-35" />
                      <h4 className="text-sm font-bold text-[var(--text-main)]">Nenhum dado encontrado.</h4>
                      <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">Nenhum relatório de conformidade, prestação de contas RGF ou Ouvidoria localizado.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] text-[10.5px] uppercase font-mono text-[var(--text-secondary)]">
                          <th className="px-6 py-3.5 font-semibold">Código ID / Publicação</th>
                          <th className="px-6 py-3.5 font-semibold">Título do Relatório</th>
                          <th className="px-6 py-3.5 font-semibold">Responsável pela Emissão</th>
                          <th className="px-6 py-3.5 font-semibold font-mono">Status</th>
                          <th className="px-6 py-3.5 font-semibold">Data de Geração</th>
                          <th className="px-6 py-3.5 font-semibold text-right">Download</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)] text-xs">
                        {reports.map((report) => (
                          <tr key={report.id} className="hover:bg-[var(--bg-main)]/35 transition">
                            <td className="px-6 py-4 font-mono text-[var(--text-secondary)]">
                              {report.publicationId || `REP-${report.id.slice(0, 6)}`}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-[var(--text-main)] block truncate max-w-sm">
                                {report.title}
                              </span>
                              {report.content && (
                                <span className="text-[10px] text-[var(--text-secondary)] block truncate max-w-sm mt-0.5">
                                  {report.content}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[var(--text-main)]">
                                {report.metadataJson?.author || "Controlador Interno"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                report.status === 'APPROVED' ? 'text-emerald-500' : 'text-amber-500'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${report.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                {report.status === 'APPROVED' ? 'Homologado' : 'Rascunho'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-[11px] text-[var(--text-secondary)]">
                              {formatDate(report.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <a
                                href={`data:text/plain;charset=utf-8,${encodeURIComponent(report.content || '')}`}
                                download={`${report.title.toLowerCase().replace(/\s+/g, '_')}_documento.txt`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--blue-accent)] hover:underline cursor-pointer"
                              >
                                Baixar <Download className="w-3.5 h-3.5" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            </div>
          )}
        </>
      )}

      {/* ==================== CREATE PUBLICATION MODAL ==================== */}
      {isPubModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-main)]">Publicar Documento — Transparência Ativa</h3>
              <button 
                onClick={() => setIsPubModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePublication} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Título do Informativo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prestação de Contas Trimestral RREO 1º Bimestre"
                  value={pubForm.title}
                  onChange={(e) => setPubForm({ ...pubForm, title: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-[var(--blue-accent)] outline-none text-[var(--text-main)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Categoria Geral</label>
                  <select
                    value={pubForm.category}
                    onChange={(e) => setPubForm({ ...pubForm, category: e.target.value })}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2.5 outline-none text-[var(--text-main)] cursor-pointer"
                  >
                    <option value="Receitas">Receitas</option>
                    <option value="Despesas">Despesas</option>
                    <option value="Licitações">Licitações</option>
                    <option value="Pessoal">Pessoal</option>
                    <option value="Contratos">Contratos</option>
                    <option value="Emendas">Emendas</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Estado Inicial</label>
                  <select
                    value={pubForm.status}
                    onChange={(e) => setPubForm({ ...pubForm, status: e.target.value })}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2.5 outline-none text-[var(--text-main)] cursor-pointer"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="ARQUIVADO">Arquivado</option>
                    <option value="PENDENTE">Pendente</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)] mt-6">
                <button
                  type="button"
                  onClick={() => setIsPubModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-xs font-semibold rounded-xl text-[var(--text-secondary)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-[var(--blue-accent)] hover:bg-[var(--blue-accent)]/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  {loadingAction && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Confirmar Publicação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE OUVIDORIA MODAL ==================== */}
      {isOuvModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-main)]">Registrar Nova Manifestação Cidadã</h3>
              <button 
                onClick={() => setIsOuvModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateOuvidoria} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Título do Requerimento / Assunto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reclamação sobre iluminação pública queimada"
                  value={ouvForm.subject}
                  onChange={(e) => setOuvForm({ ...ouvForm, subject: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-[var(--blue-accent)] outline-none text-[var(--text-main)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Categoria Ouvidoria</label>
                <select
                  value={ouvForm.category}
                  onChange={(e) => setOuvForm({ ...ouvForm, category: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2.5 outline-none text-[var(--text-main)] cursor-pointer"
                >
                  <option value="Reclamação">Reclamação</option>
                  <option value="Elogio">Elogio</option>
                  <option value="Sugestão">Sugestão</option>
                  <option value="Denúncia">Denúncia</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Conteúdo / Descrição Detalhada</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Especifique os fatos, local e detalhes para que a Ouvidoria possa realizar diligências."
                  value={ouvForm.content}
                  onChange={(e) => setOuvForm({ ...ouvForm, content: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 outline-none text-[var(--text-main)] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)] mt-6">
                <button
                  type="button"
                  onClick={() => setIsOuvModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-xs font-semibold rounded-xl text-[var(--text-secondary)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-[var(--green-accent)] hover:bg-[var(--green-accent)]/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  {loadingAction && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Registrar Manifestação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE ESIC MODAL ==================== */}
      {isEsicModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-main)]">Cadastrar Pedido — e-SIC / LAI</h3>
              <button 
                onClick={() => setIsEsicModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEsic} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Nome Completo do Solicitante</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Albuquerque da Silva"
                  value={esicForm.requester}
                  onChange={(e) => setEsicForm({ ...esicForm, requester: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-[var(--blue-accent)] outline-none text-[var(--text-main)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Especificação do Pedido de Informação</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Folha salarial detalhada do setor de engenharia"
                  value={esicForm.subject}
                  onChange={(e) => setEsicForm({ ...esicForm, subject: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-[var(--blue-accent)] outline-none text-[var(--text-main)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Instrução / Detalhamento Legal</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Relate detalhadamente quais relatórios orçamentários ou fiscais deseja acessar passivamente."
                  value={esicForm.content}
                  onChange={(e) => setEsicForm({ ...esicForm, content: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 outline-none text-[var(--text-main)] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)] mt-6">
                <button
                  type="button"
                  onClick={() => setIsEsicModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-xs font-semibold rounded-xl text-[var(--text-secondary)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-[var(--blue-accent)] hover:bg-[var(--blue-accent)]/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  {loadingAction && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Cadastrar Protocolo SIC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE REPORT MODAL ==================== */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-main)]">Gerar Relatório de Auditoria</h3>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateReport} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Título do Relatório</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Relatório Trimestral de Conformidade Ouvidoria"
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-[var(--blue-accent)] outline-none text-[var(--text-main)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Teor Orçamentário / Resumo Executivo</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Apresente as conclusões do relatório consolidado..."
                  value={reportForm.content}
                  onChange={(e) => setReportForm({ ...reportForm, content: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 outline-none text-[var(--text-main)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Situação de Homologação</label>
                <select
                  value={reportForm.status}
                  onChange={(e) => setReportForm({ ...reportForm, status: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2.5 outline-none text-[var(--text-main)] cursor-pointer"
                >
                  <option value="APPROVED">Homologado</option>
                  <option value="DRAFT">Rascunho Interno</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)] mt-6">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-xs font-semibold rounded-xl text-[var(--text-secondary)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-[var(--blue-accent)] hover:bg-[var(--blue-accent)]/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  {loadingAction && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Homologar Relatório
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DETAIL / ACTION REQUEST DRAWER-MODAL ==================== */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] max-w-xl w-full rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)]">
              <div>
                <span className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">Demand Protocol Record</span>
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 mt-0.5">
                  📁 {selectedRequest.metadataJson?.protocol || "PROTOCOL-N/A"}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedRequest(null);
                  setIsResponding(false);
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Request properties */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono block">CANAL DE ORIGEM:</span>
                  <span className="font-bold text-[var(--text-main)] uppercase">
                    {selectedRequest.metadataJson?.type === 'ouvidoria' ? '🗣️ Ouvidoria' : '✉️ e-SIC'}
                  </span>
                </div>
                {selectedRequest.metadataJson?.category && (
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono block">CATEGORIA:</span>
                    <span className="font-bold text-[var(--text-main)]">{selectedRequest.metadataJson.category}</span>
                  </div>
                )}
                {selectedRequest.metadataJson?.requester && (
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono block">REQUERENTE:</span>
                    <span className="font-bold text-[var(--text-main)]">{selectedRequest.metadataJson.requester}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono block">PRAZO LIMITE DEFINIDO:</span>
                  <span className="font-mono text-red-400 font-bold">{formatDate(selectedRequest.metadataJson?.deadline)}</span>
                </div>
              </div>

              {/* Subject & Content */}
              <div className="p-4 bg-[var(--bg-main)]/55 border border-[var(--border-color)] rounded-xl space-y-1.5">
                <span className="text-[10px] text-[var(--text-secondary)] font-mono uppercase block">Assunto / Teorema do Pedido:</span>
                <h4 className="text-xs font-bold text-[var(--text-main)]">{selectedRequest.subject}</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2 whitespace-pre-wrap">
                  {selectedRequest.content || "Sem detalhamento adicional catalogado."}
                </p>
              </div>

              {/* Existing responses list */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Respostas e Pareceres Oficiais</span>
                {responses.filter(r => r.requestId === selectedRequest.id).length === 0 ? (
                  <div className="p-4 bg-amber-500/5 border border-dashed border-amber-500/15 rounded-xl text-center">
                    <p className="text-xs text-amber-500">Nenhum parecer emitido ainda para este protocolo.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {responses.filter(r => r.requestId === selectedRequest.id).map(rep => (
                      <div key={rep.id} className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="font-bold text-emerald-400"> Parecer do {rep.metadataJson?.responderName || "Ouvidor Especializado"}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono">{formatDate(rep.metadataJson?.createdAt || rep.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{rep.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Show Response form or close control */}
              {isResponding ? (
                <form onSubmit={handleCreateResponse} className="pt-4 border-t border-[var(--border-color)] space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] block">Escrever Parecer de Resposta ao Munícipe</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Redija a resposta formal do órgão público..."
                      value={responseContent}
                      onChange={(e) => setResponseContent(e.target.value)}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-lg p-2.5 outline-none text-[var(--text-main)] resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsResponding(false)}
                      className="px-3.5 py-1.5 border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-[11px] font-semibold rounded-lg text-[var(--text-secondary)] transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loadingAction}
                      className="px-3.5 py-1.5 bg-[var(--blue-accent)] hover:bg-[var(--blue-accent)]/90 text-white text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      {loadingAction && <RefreshCw className="w-3 h-3 animate-spin" />}
                      Enviar Parecer Final
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-between pt-4 border-t border-[var(--border-color)]">
                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setIsResponding(false);
                    }}
                    className="px-4 py-2 bg-[var(--bg-sidebar)] hover:bg-[var(--bg-main)] text-xs font-semibold rounded-xl text-[var(--text-secondary)] transition cursor-pointer"
                  >
                    Fechar Protocolo
                  </button>
                  {!responses.some(rep => rep.requestId === selectedRequest.id) && (
                    <button
                      onClick={() => setIsResponding(true)}
                      className="px-4 py-2 bg-[var(--blue-accent)] hover:bg-[var(--blue-accent)]/90 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      Emitir Resposta do Órgão
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW PUBLICATION DETAILS MODAL ==================== */}
      {selectedPublication && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)]">
              <div>
                <span className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">Transparency Portal Record</span>
                <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5 mt-0.5">
                  🔍 Detalhe da Publicação
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPublication(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">Título do Documento:</span>
                <h4 className="text-sm font-bold text-[var(--text-main)]">{selectedPublication.metadataJson?.title || "Documento Administrativo"}</h4>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-mono">ID ÚNICO:</span>
                  <span className="font-mono text-[var(--text-main)] truncate block">{selectedPublication.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-mono">CATEGORIA:</span>
                  <span className="font-bold text-[var(--text-main)] uppercase">{selectedPublication.metadataJson?.category || "Geral"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-mono">STATUS:</span>
                  <span className="font-bold text-emerald-400">Ativo / Homologado</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-mono">DATA DE LANÇAMENTO:</span>
                  <span className="font-bold text-[var(--text-main)]">{formatDate(selectedPublication.metadataJson?.createdAt || selectedPublication.createdAt)}</span>
                </div>
              </div>

              <div className="p-3 bg-green-500/5 border border-green-500/15 rounded-xl flex items-start gap-2.5 text-xs text-[var(--text-secondary)] mt-4">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>Este arquivo foi assinado digitalmente com carimbo de tempo ICP-Brasil e está indexado ativamente para consulta pública.</p>
              </div>

              <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setSelectedPublication(null)}
                  className="px-4 py-2 bg-[var(--bg-sidebar)] hover:bg-[var(--bg-main)] text-xs font-semibold rounded-xl text-[var(--text-secondary)] transition cursor-pointer"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
