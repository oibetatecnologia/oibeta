import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RefreshCw, Layers, CheckSquare, BrainCircuit, FileText, ArrowRight, MessageSquareCode, ShieldCheck } from 'lucide-react';
import { ChatMessage, Project, Decision, Task, Memory } from '../types';

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  projects: Project[];
  activeProject: Project | null;
  onSendMessage: (text: string) => Promise<void>;
  onClearChat: () => Promise<void>;
  onAcceptSuggestion: (type: 'project' | 'decision' | 'task' | 'memory' | 'stopPoint', data: any) => Promise<void>;
  isSending: boolean;
}

export function renderMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    let content = line.trim();
    if (content.startsWith('### ')) {
      return <h4 key={idx} className="text-sm font-bold text-[var(--cyan-accent)] mt-2.5 mb-1">{content.slice(4)}</h4>;
    }
    if (content.startsWith('## ') || content.startsWith('# ')) {
      const title = content.startsWith('## ') ? content.slice(3) : content.slice(2);
      return <h3 key={idx} className="text-base font-extrabold text-[var(--text-main)] mt-4 mb-2 border-b border-[var(--border-color)] pb-1">{title}</h3>;
    }
    if (content.startsWith('- ') || content.startsWith('* ')) {
      const cleanLine = content.slice(2);
      return (
        <li key={idx} className="text-sm ml-4 list-disc text-[var(--text-main)] leading-relaxed my-1">
          {renderBoldText(cleanLine)}
        </li>
      );
    }
    if (content === '') {
      return <div key={idx} className="h-2" />;
    }
    return <p key={idx} className="text-sm text-[var(--text-main)] leading-relaxed my-1.5">{renderBoldText(line)}</p>;
  });
}

function renderBoldText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold text-[var(--cyan-accent)]">{part}</strong>;
    }
    return part;
  });
}

export default function ChatPanel({
  chatHistory,
  projects,
  activeProject,
  onSendMessage,
  onClearChat,
  onAcceptSuggestion,
  isSending
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickQuestion = (question: string) => {
    if (isSending) return;
    onSendMessage(question);
  };

  // Profile image for welcoming elegant Beta
  const betaProfilePic = new URL('../assets/images/beta_avatar_1780432830265.png', import.meta.url).href;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden min-h-[500px]" id="oi-beta-chat-panel">
      {/* Header */}
      <div className="bg-[var(--bg-sidebar)] px-5 py-4 flex items-center justify-between border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={betaProfilePic} 
              alt="Oi Beta"
              className="w-16 h-16 rounded-full border-2 border-[var(--blue-accent)]/50 object-cover object-center bg-slate-900 shadow-[0_0_18px_rgba(59,130,246,0.25)] select-none"
              id="avatar-oi-beta"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--bg-sidebar)] rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-[var(--text-main)] tracking-wide text-sm sm:text-base">Beta</h2>
              <span className="text-[9px] bg-[var(--blue-accent)]/10 text-[var(--cyan-accent)] font-mono px-2 py-0.5 rounded-full border border-[var(--blue-accent)]/20 uppercase tracking-widest font-extrabold scale-90">Sempre ativa</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium">Observando, aprendendo e executando</p>
          </div>
        </div>
        <button 
          onClick={onClearChat}
          className="text-[var(--text-secondary)] hover:text-[var(--text-main)] p-2 rounded-xl hover:bg-[var(--bg-main)] border border-transparent hover:border-[var(--border-color)] transition duration-150 text-xs flex items-center gap-1 cursor-pointer bg-transparent"
          title="Reiniciar conversa"
          id="btn-clear-chat"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold font-mono uppercase tracking-widest hidden sm:inline">Limpar</span>
        </button>
      </div>

      {/* Suggestion Context Warning with GovTech style */}
      {activeProject && (
        <div className="bg-[var(--bg-main)]/50 text-[var(--cyan-accent)] text-xs px-5 py-2.5 border-b border-[var(--border-color)]/50 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--cyan-accent)] shrink-0" />
          <span className="font-medium text-xs">Foco Ativo: <strong className="text-[var(--text-main)] font-bold">{activeProject.name}</strong></span>
        </div>
      )}

      {/* Messages Scrollbox */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4" id="chat-messages-container">
        {chatHistory.map((msg) => {
          const isBeta = msg.sender === 'beta';
          return (
            <div 
              key={msg.id} 
              className={`flex gap-3 max-w-[92%] ${isBeta ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              id={`chat-msg-${msg.id}`}
            >
              {isBeta && (
                <div className="w-8 h-8 rounded-full border border-[var(--border-color)] overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
                  <img 
                    src={betaProfilePic} 
                    alt="B"
                    className="w-full h-full object-cover object-center select-none"
                  />
                </div>
              )}
              
              <div className="flex flex-col gap-1 max-w-full">
                {/* Bubble */}
                <div 
                  className={`px-4 py-3 rounded-2xl text-[13px] sm:text-sm leading-relaxed shadow-sm ${
                    isBeta 
                      ? 'bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)]' 
                      : 'bg-[var(--blue-accent)] text-white'
                  }`}
                >
                  {isBeta ? (
                    <div className="space-y-1.5">{renderMarkdown(msg.content)}</div>
                  ) : (
                    <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                  )}
                </div>

                {/* Sub-text timestamp */}
                <span className={`text-[10px] text-[var(--text-secondary)] px-1 font-mono mt-0.5 ${isBeta ? 'text-left' : 'text-right'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                {/* Automation Suggestions from Beta */}
                {isBeta && msg.suggestions && (
                  <div className="mt-2 bg-[var(--bg-main)]/90 border border-[var(--border-color)] rounded-xl p-3.5 space-y-3.5 animate-fade-in text-xs max-w-sm shadow-sm" id="beta-suggested-automation">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--cyan-accent)] uppercase tracking-widest font-mono">
                      <BrainCircuit className="w-3.5 h-3.5 text-[var(--cyan-accent)]" />
                      <span>Sincronização Estratégica</span>
                    </div>

                    {msg.suggestions?.suggestedProject && (
                      <div className="border-t border-[var(--border-color)]/60 pt-2 flex flex-col gap-1.5">
                        <p className="text-[var(--text-secondary)]">Deseja cadastrar o novo projeto <strong className="text-[var(--text-main)]">"{msg.suggestions?.suggestedProject.name}"</strong>?</p>
                        <button 
                          onClick={() => onAcceptSuggestion('project', msg.suggestions!.suggestedProject)}
                          className="bg-[var(--blue-accent)] hover:opacity-90 text-white font-bold py-1.5 px-3 rounded-lg text-xs self-start flex items-center gap-1.5 transition border-0 cursor-pointer shadow-sm"
                        >
                          <Layers className="w-3.5 h-3.5" /> Registrar Projeto
                        </button>
                      </div>
                    )}

                    {msg.suggestions?.suggestedDecision && (
                      <div className="border-t border-[var(--border-color)]/60 pt-2 flex flex-col gap-1.5">
                        <p className="text-[var(--text-secondary)]">Deseja registrar esta decisão sob o projeto <strong className="text-[var(--cyan-accent)]">{projects.find(p => p.id === msg.suggestions!.suggestedDecision.projectId)?.name || 'selecionado'}</strong>?</p>
                        <p className="text-xs bg-[var(--bg-sidebar)] p-2.5 rounded-lg text-[var(--text-secondary)] italic border border-[var(--border-color)] font-mono">"{msg.suggestions?.suggestedDecision.title}"</p>
                        <button 
                          onClick={() => onAcceptSuggestion('decision', msg.suggestions!.suggestedDecision)}
                          className="bg-[var(--blue-accent)] hover:opacity-90 text-white font-bold py-1.5 px-3 rounded-lg text-xs self-start flex items-center gap-1.5 transition border-0 cursor-pointer shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" /> Registrar Decisão
                        </button>
                      </div>
                    )}

                    {msg.suggestions?.suggestedTask && (
                      <div className="border-t border-[var(--border-color)]/60 pt-2 flex flex-col gap-1.5">
                        <p className="text-[var(--text-secondary)]">Deseja adicionar a tarefa <strong className="text-[var(--text-main)]">"{msg.suggestions?.suggestedTask.title}"</strong>?</p>
                        <button 
                          onClick={() => onAcceptSuggestion('task', msg.suggestions!.suggestedTask)}
                          className="bg-[var(--blue-accent)] hover:opacity-90 text-white font-bold py-1.5 px-3 rounded-lg text-xs self-start flex items-center gap-1.5 transition border-0 cursor-pointer shadow-sm"
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> Adicionar à lista
                        </button>
                      </div>
                    )}

                    {msg.suggestions?.suggestedMemory && (
                      <div className="border-t border-[var(--border-color)]/60 pt-2 flex flex-col gap-1.5">
                        <p className="text-[var(--text-secondary)]">Deseja registrar esta memória no cérebro corporativo?</p>
                        <p className="text-xs bg-[var(--bg-sidebar)] p-2.5 rounded-lg text-[var(--text-secondary)] italic border border-[var(--border-color)] font-mono">"{msg.suggestions?.suggestedMemory.content}"</p>
                        <button 
                          onClick={() => onAcceptSuggestion('memory', msg.suggestions!.suggestedMemory)}
                          className="bg-[var(--blue-accent)] hover:opacity-90 text-white font-bold py-1.5 px-3 rounded-lg text-xs self-start flex items-center gap-1.5 transition border-0 cursor-pointer shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Registrar Memória
                        </button>
                      </div>
                    )}

                    {msg.suggestions?.suggestedStopPointUpdate && (
                      <div className="border-t border-[var(--border-color)]/60 pt-2 flex flex-col gap-1.5">
                        <p className="text-[var(--text-secondary)]">A Beta analisou que o trabalho parou no seguinte ponto. Confirmar?</p>
                        <p className="text-xs bg-[var(--bg-sidebar)] p-2.5 rounded-lg text-[var(--cyan-accent)] font-mono border border-[var(--border-color)]">"{msg.suggestions?.suggestedStopPointUpdate.stopPoint}"</p>
                        <button 
                          onClick={() => onAcceptSuggestion('stopPoint', msg.suggestions!.suggestedStopPointUpdate)}
                          className="bg-[var(--blue-accent)] hover:opacity-90 text-white font-bold py-1.5 px-3 rounded-lg text-xs self-start flex items-center gap-1.5 transition border-0 cursor-pointer shadow-sm"
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> Atualizar Parada
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center" id="is-typing-indicator">
            <div className="w-8 h-8 rounded-full border border-[var(--border-color)] overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
              <img 
                src={betaProfilePic} 
                alt="B"
                className="w-full h-full object-cover object-center select-none" 
              />
            </div>
            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] rounded-2xl px-4 py-3 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[var(--cyan-accent)] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-[var(--cyan-accent)] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-[var(--cyan-accent)] rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Command Center Shortcuts in GovTech corporate style */}
      <div className="px-5 py-3 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)]">
        <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mb-2 font-mono">Comandos operacionais:</p>
        <div className="flex flex-wrap gap-1.5">
          <button 
            type="button"
            onClick={() => handleQuickQuestion('De onde paramos nos projetos ativos?')}
            disabled={isSending}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-[var(--text-secondary)] transition cursor-pointer"
          >
            📊 De onde paramos?
          </button>
          <button 
            type="button"
            onClick={() => handleQuickQuestion('Quais são as metas e projetos estratégicos em andamento?')}
            disabled={isSending}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-[var(--text-secondary)] transition cursor-pointer"
          >
            💼 Projetos ativos?
          </button>
          <button 
            type="button"
            onClick={() => handleQuickQuestion('Resuma as principais decisões formais tomadas hoje.')}
            disabled={isSending}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-[var(--text-secondary)] transition cursor-pointer"
          >
            📜 Decisões tomadas?
          </button>
        </div>
      </div>

      {/* Input Box Form */}
      <form onSubmit={handleSubmit} className="px-5 py-3 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex gap-2">
        <input 
          id="oi-beta-speech-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isSending ? "Beta está analisando o contexto..." : "Converse com a Beta — cérebro operacional da Oi Beta..."}
          disabled={isSending}
          className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/50 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[var(--blue-accent)] transition disabled:opacity-50"
        />
        <button 
          id="btn-send-message"
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="bg-[var(--blue-accent)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 transition disabled:opacity-55 flex items-center justify-center shrink-0 cursor-pointer border-0 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
