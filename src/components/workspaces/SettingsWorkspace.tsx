import React from 'react';
import { BrainCircuit, Plus, Trash2, CheckCircle, Clock, CheckCircle2, Circle, AlertCircle, X, Activity } from 'lucide-react';
import useSettingsTheme from '../../hooks/useSettingsTheme';
import useSettingsAI from '../../hooks/useSettingsAI';
import useSettingsDebug from '../../hooks/useSettingsDebug';

interface SettingsWorkspaceProps {
}

export default function SettingsWorkspace() {
  const {
    theme,
    followSystem,
    user,
    onLogout,
    selectTheme,
    toggleFollowSystem,
  } = useSettingsTheme();

  const {
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
    aiConns,
    aiHealth,
    testResult,
    handleTestConnection,
    testingConnId,
    handleDeleteConnection,
  } = useSettingsAI();

  const {
    debugLogs,
    isFetchingDebug,
    refreshDebugLogs,
  } = useSettingsDebug();

  return (
<div className="space-y-6">
              
              <div className="border-b border-[var(--border-color)] pb-3 select-none">
                <h1 className="text-xl sm:text-2xl font-black text-[var(--text-main)] font-sans"># Configurações do Workspace</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1.5 font-sans leading-relaxed">Sintonize a interface visual e o comportamento do cérebro da Oi Beta.</p>
              </div>

              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 space-y-5 md:space-y-6 shadow-sm">
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-mono">Tema e Identidade de Interface</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <button 
                    onClick={() => selectTheme('dark')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      theme === 'dark' && !followSystem
                        ? 'border-[var(--blue-accent)] bg-[var(--bg-sidebar)] shadow-md'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-main)]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-sm sm:text-base text-[var(--text-main)]">Oi Beta Dark</span>
                      {(theme === 'dark' && !followSystem) && <span className="w-3 h-3 rounded-full bg-[var(--blue-accent)] shrink-0 animate-scale-in" />}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Tema padrão. Inspirado no GitHub Dark, Obsidian e ambiente executivo moderno do VS Code.</p>
                  </button>

                  <button 
                    onClick={() => selectTheme('light')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      theme === 'light' && !followSystem
                        ? 'border-[var(--blue-accent)] bg-[var(--bg-sidebar)] shadow-md'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-main)]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-sm sm:text-base text-[var(--text-main)]">Oi Beta Light</span>
                      {(theme === 'light' && !followSystem) && <span className="w-3 h-3 rounded-full bg-[var(--blue-accent)] shrink-0 animate-scale-in" />}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Inspirado em GitHub Light e Notion. Tons de off-white sóbrios e de excepcional legibilidade.</p>
                  </button>

                  <button 
                    onClick={() => selectTheme('gov')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      theme === 'gov' && !followSystem
                        ? 'border-[var(--blue-accent)] bg-[var(--bg-sidebar)] shadow-md'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-main)]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-sm sm:text-base text-[var(--text-main)]">Oi Beta Gov</span>
                      {(theme === 'gov' && !followSystem) && <span className="w-3 h-3 rounded-full bg-[var(--blue-accent)] shrink-0 animate-scale-in" />}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Aparência cívica e institucional. Base com tonalidades botânicas profundas e alta sobriedade.</p>
                  </button>

                  <button 
                    onClick={() => selectTheme('intelligence')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      theme === 'intelligence' && !followSystem
                        ? 'border-[var(--blue-accent)] bg-[var(--bg-sidebar)] shadow-md'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-main)]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-sm sm:text-base text-[var(--text-main)]">Oi Beta Intelligence</span>
                      {(theme === 'intelligence' && !followSystem) && <span className="w-3 h-3 rounded-full bg-[var(--blue-accent)] shrink-0 animate-scale-in" />}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Sensação de cérebro eletrônico profundo. Tons de violeta executivo e roxo estelar.</p>
                  </button>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)] flex items-start sm:items-center gap-3 select-none text-left">
                  <input 
                    type="checkbox" 
                    id="follow-theme-os"
                    checked={followSystem}
                    onChange={(e) => toggleFollowSystem(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--blue-accent)] border-[var(--border-color)] bg-[var(--bg-sidebar)] cursor-pointer mt-1 sm:mt-0"
                  />
                  <label htmlFor="follow-theme-os" className="text-xs sm:text-sm font-bold text-[var(--text-main)] cursor-pointer leading-normal">
                    Seguir tema do sistema operacional, alternando automaticamente entre Dark e Light.
                  </label>
                </div>
              </div>

              {/* ==================== SUA SESSÃO SAAS MULTI-TENANT (SPRINT 6) ==================== */}
              {user && (
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 space-y-4 shadow-sm text-left">
                  <div className="flex items-center gap-3 select-none">
                    <div className="w-10 h-10 rounded-full bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center font-extrabold text-sm uppercase">
                      {user.name ? user.name.slice(0, 2) : "OB"}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">Conta Conectada</h3>
                      <p className="text-sm font-extrabold text-[var(--text-main)]">{user.name} <span className="text-xs text-[var(--text-secondary)] font-mono font-normal">({user.email})</span></p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-color)] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs select-none">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1 font-mono">Nome da Organização</span>
                      <div className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-color)] font-bold text-[var(--text-main)]">
                        🏢 {user.organizationId || "Organização Local Oi Beta"}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1 font-mono">Função SaaS Tenant</span>
                      <div className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-color)] font-bold text-[var(--text-main)] uppercase font-mono">
                        🔑 {user.role || "Membro Administrativo"}
                      </div>
                    </div>
                  </div>

                  {onLogout && (
                    <button
                      onClick={() => onLogout()}
                      type="button"
                      className="w-full py-3 mt-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                    >
                      Efetuar Logout / Desconectar Workspace
                    </button>
                  )}
                </div>
              )}

              {/* ==================== GERENCIA DE CONEXÕES MULTI-IA (SPRINT 8) ==================== */}
              <div id="ai-connections-panel" className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 space-y-6 shadow-sm text-left">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 select-none">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-[var(--blue-accent)] shrink-0" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-mono">🔑 Colegiado de Especialistas Multi-IA</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] font-sans">Cadastre e sincronize múltiplos provedores sob a governança da Beta.</p>
                    </div>
                  </div>
                  <button 
                    onClick={toggleAddConnection} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-color)] hover:border-[var(--text-secondary)] text-xs font-bold text-[var(--text-main)] font-mono transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showAddConn ? 'Cancelar' : 'Nova Conexão'}
                  </button>
                </div>

                {showAddConn && (
                  <form onSubmit={handleCreateConnection} className="p-4 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--border-color)] space-y-4 animate-slide-in">
                    <h4 className="text-xs font-bold text-[var(--text-main)] uppercase font-mono">Registrar Novo Especialista</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 font-mono">Nome do Canal / Conexão</label>
                        <input 
                          type="text"
                          required
                          value={newConnName}
                          onChange={(e) => setNewConnName(e.target.value)}
                          placeholder="Ex: OpenAI Prod, Claude Local, etc."
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-sm focus:border-[var(--blue-accent)] outline-none font-sans"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 font-mono">Provedor de Tecnologia</label>
                        <select
                          value={newConnProvider}
                          onChange={(e) => setNewConnProvider(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-sm focus:border-[var(--blue-accent)] outline-none font-mono"
                        >
                          <option value="gemini">Google Gemini SDK</option>
                          <option value="openai">OpenAI Api Core</option>
                          <option value="claude">Anthropic Claude</option>
                          <option value="groq">Groq Cloud Spec</option>
                          <option value="openrouter">OpenRouter Gateway</option>
                          <option value="ollama">Ollama (Inteligência Local)</option>
                          <option value="custom">Provedor Customizado (API Endpoint)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 font-mono">Chave de API (API Key)</label>
                        <input 
                          type="password"
                          required={newConnProvider !== 'ollama'}
                          value={newConnApiKey}
                          onChange={(e) => setNewConnApiKey(e.target.value)}
                          placeholder="Cole sua credencial privativa aqui"
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-sm focus:border-[var(--blue-accent)] outline-none font-mono"
                        />
                        <span className="text-[10px] text-[var(--text-secondary)] font-sans mt-1 block">🔒 Suas chaves de API nunca são expostas ao cliente ou transmitidas em texto simples. Elas são criptografadas localmente via AES-256 antes da persistência.</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 font-mono">Base URL Customizada (Opcional)</label>
                          <input 
                            type="text"
                            value={newConnBaseUrl}
                            onChange={(e) => setNewConnBaseUrl(e.target.value)}
                            placeholder="Ex: http://localhost:11434"
                            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-sm focus:border-[var(--blue-accent)] outline-none font-sans"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 font-mono">Modelo Específico (Opcional)</label>
                          <input 
                            type="text"
                            value={newConnModel}
                            onChange={(e) => setNewConnModel(e.target.value)}
                            placeholder="Ex: gpt-4o, llama3, Claude-3-opus, etc."
                            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-sm focus:border-[var(--blue-accent)] outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingConn}
                      className="w-full py-2.5 rounded-lg bg-[var(--blue-accent)] hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                    >
                      {savingConn ? 'Criptografando & Salvando...' : 'Salvar Canal Especialista'}
                    </button>
                  </form>
                )}

                {loadingConns ? (
                  <div className="py-8 text-center text-[var(--text-secondary)] font-mono animate-pulse">
                    Varrendo canais cognitivos...
                  </div>
                ) : aiConns.length === 0 ? (
                  <div className="py-8 text-center text-[var(--text-secondary)] border border-dashed border-[var(--border-color)] rounded-xl font-sans text-xs">
                     Não há nenhum especialista Multi-IA conectado atualmente no seu Workspace SaaS.<br />
                    <span className="text-[10px] opacity-75 mt-1 block">A Beta utilizará automaticamente as chaves de API globais do sistema de forma resiliente.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiConns.map((conn) => {
                      const healthReport = aiHealth.find((h) => h.id === conn.id);
                      const status = healthReport?.status || 'desconhecido';
                      const latency = healthReport?.latency !== undefined ? healthReport.latency : 'N/A';
                      const availability = healthReport?.availability !== undefined ? healthReport.availability : 'N/A';
                      const testRes = testResult[conn.id];

                      return (
                        <div key={conn.id} className="p-4 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                              <h4 className="text-sm font-extrabold text-[var(--text-main)] font-sans">{conn.connectionName}</h4>
                              <span className="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] uppercase font-mono">{conn.provider}</span>
                            </div>
                            
                            <div className="mt-2 grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)] font-mono">
                              {conn.model && <span>Model: <b className="text-[var(--text-main)] font-normal">{conn.model}</b></span>}
                              <span>Latência: <b className="text-[var(--text-main)] font-normal">{latency}ms</b></span>
                              <span>Disponibilidade: <b className="text-[var(--text-main)] font-normal">{availability}</b></span>
                            </div>

                            {testRes && (
                              <div className={`mt-2 p-2 rounded text-[11px] font-sans ${testRes.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {testRes.success ? `✅ Conexão estabelecida com sucesso! Modelo ativo: ${testRes.modelInfo}` : `❌ Falha de Conexão: ${testRes.error}`}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 select-none self-end sm:self-center">
                            <button
                              onClick={() => handleTestConnection(conn.id)}
                              disabled={testingConnId === conn.id}
                              className="px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--text-secondary)] text-xs font-bold text-[var(--text-main)] font-mono transition shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              {testingConnId === conn.id ? 'Testando...' : 'Testar Link'}
                            </button>
                            <button
                              onClick={() => handleDeleteConnection(conn.id)}
                              className="p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-rose-500 hover:text-rose-500 text-[var(--text-secondary)] transition shadow-sm cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ==================== PAINEL DE DEBUG DA BETA AI ==================== */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 select-none">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[var(--blue-accent)] shrink-0 animate-pulse" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-mono">Painel de Diagnóstico & Logs Beta AI</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] font-sans">Acompanhe a intenção detectada, a confiança do parser, tempos de resposta e erros.</p>
                    </div>
                  </div>
                  <button 
                    onClick={refreshDebugLogs} 
                    disabled={isFetchingDebug}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-color)] hover:border-[var(--text-secondary)] text-xs font-bold text-[var(--text-main)] font-mono transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Clock className={`w-3.5 h-3.5 ${isFetchingDebug ? 'animate-spin' : ''}`} />
                    {isFetchingDebug ? 'Atualizando...' : 'Recarregar'}
                  </button>
                </div>

                {debugLogs.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-[var(--border-color)] rounded-xl select-none">
                    <BrainCircuit className="w-8 h-8 text-[var(--text-secondary)] mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-mono text-[var(--text-secondary)]">Nenhuma transação ou análise de intenção registrada neste ciclo.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {debugLogs.map((log) => {
                      const isSuccess = log.executed;
                      const hasError = !!log.errorReturned;
                      const confidencePercent = Math.round((log.confidence || 0) * 100);

                      // Colors based on intent
                      let intentColorClass = "bg-neutral-100 text-neutral-850 border-neutral-300 dark:bg-neutral-900/40 dark:text-neutral-300 dark:border-neutral-800";
                      if (log.intentType?.startsWith("CREATE_")) {
                        intentColorClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/60";
                      } else if (log.intentType?.startsWith("DELETE_")) {
                        intentColorClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/60";
                      } else if (log.intentType?.startsWith("ASK_")) {
                        intentColorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/60";
                      }

                      return (
                        <div 
                          key={log.id} 
                          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 space-y-3 transition hover:border-[var(--text-secondary)]"
                        >
                          {/* Log Header */}
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs border ${intentColorClass}`}>
                                {log.intentType || "DESCONHECIDA"}
                              </span>
                              <span className="text-[10px] font-mono text-[var(--text-secondary)] select-none">
                                ID: {log.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-secondary)]" title="Tempo de processamento cognitivo">
                                <Clock className="w-3 h-3 text-[var(--blue-accent)]" />
                                <span>{log.executionTime || 0}ms</span>
                              </div>
                              <span className="text-[10px] font-mono text-[var(--text-secondary)] select-none">
                                {new Date(log.createdAt).toLocaleTimeString("pt-BR")}
                              </span>
                            </div>
                          </div>

                          {/* Detail Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[var(--border-color)]/50">
                            {/* Confidence metric */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="text-[var(--text-secondary)]">Confiança do Parser:</span>
                                <span className={confidencePercent >= 75 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                                  {confidencePercent}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-[var(--bg-sidebar)] overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    confidencePercent >= 75 ? "bg-emerald-500" : "bg-amber-500"
                                  }`} 
                                  style={{ width: `${confidencePercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Execution state */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono">
                              <span className="text-[var(--text-secondary)] sm:hidden">Despacho de Ação:</span>
                              <div className="flex items-center gap-1.5">
                                {isSuccess ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-emerald-500 font-bold">Ação Despachada</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                    <span className="text-[var(--text-secondary)]">Consulta / Chat Geral</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Executed Action Type and Error Reporting panel */}
                          {(isSuccess || hasError) && (
                            <div className="p-2.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-x-auto text-[11px] font-mono leading-relaxed space-y-1">
                              {isSuccess && (
                                <div className="text-[var(--text-main)]">
                                  <span className="text-[var(--text-secondary)]">Ação Executada:</span> {log.intentType?.replace("CREATE_", "Create_")?.replace("UPDATE_", "Update_")?.replace("DELETE_", "Delete_")}Action
                                </div>
                              )}
                              {hasError && (
                                <div className="text-red-500 font-medium">
                                  <span className="text-red-400 font-bold">Erro Retornado:</span> {log.errorReturned}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
  );
}
