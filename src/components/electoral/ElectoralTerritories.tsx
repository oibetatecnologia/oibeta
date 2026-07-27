import React from 'react';
import { Globe, Plus } from 'lucide-react';
import type { Territory } from './types';


interface ElectoralTerritoriesProps {
  territories: Territory[];
  onCreate: () => void;
}

/**
 * ElectoralTerritories
 *
 * Tela de territórios do Beta Electoral.
 *
 * Responsabilidade:
 * - renderizar hierarquia territorial;
 * - renderizar lista de territórios;
 * - exibir estado vazio;
 * - delegar criação para o ElectoralWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function ElectoralTerritories({
  territories,
  onCreate,
}: ElectoralTerritoriesProps) {
  return (
  <div className="space-y-6 animate-fade-in" id="electoral-tab-territories">
    
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">Políticas de Territórios</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Zoneamento, locais de votação e subdivisões administrativas da governança municipal.</p>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-1.5 bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Novo Território
      </button>
    </div>

    {territories.length === 0 ? (
      <div className="border border-[var(--border-color)] rounded-xl p-12 text-center bg-[var(--bg-card)] max-w-xl mx-auto space-y-4">
        <Globe className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto" />
        <div>
          <h4 className="text-sm font-bold text-[var(--text-main)]">Nenhum dado encontrado.</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Nenhum território cadastrado ainda nesta organização municipal.</p>
        </div>
        <button 
          onClick={onCreate}
          className="bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
        >
          Registrar Primeiro Território
        </button>
      </div>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hierarchy view - Bloco 4 requirement */}
        <div className="lg:col-span-2 p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)]/30 pb-2">
            <span className="text-xs font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">Visualizador Hierárquico de Geografia Eleitoral</span>
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">({territories.length} cadastrados)</span>
          </div>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
            {/* Root folders of regions */}
            {territories.filter(t => t.type === 'REGION').map(region => (
              <div key={region.id} className="p-3 border border-[var(--border-color)]/65 bg-[var(--bg-card)] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-sans font-bold text-[var(--text-main)]">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-rose-500" />
                    <span>Região: {region.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">Cód: #{region.code || region.id.slice(0, 4)}</span>
                </div>

                {/* Children under region (states, municipalities, cities) */}
                <div className="ml-6 pl-3 border-l border-[var(--border-color)]/60 space-y-2">
                  {territories.filter(t => t.parentId === region.id).map(child => (
                    <div key={child.id} className="text-xs space-y-1">
                      <span className="font-semibold text-[var(--text-main)] block">🏛️ {child.type === 'STATE' ? 'Estado' : child.type === 'CITY' ? 'Município' : child.type === 'ZONE' ? 'Zona' : 'Local'}: {child.name}</span>
                      
                      {/* Sub children (like zones under municipality, etc.) */}
                      <div className="ml-4 pl-3 border-l border-[var(--border-color)]/40 space-y-1">
                        {territories.filter(sub => sub.parentId === child.id).map(subChild => (
                          <span key={subChild.id} className="text-[11px] text-[var(--text-secondary)] block">
                            📍 {subChild.type === 'ZONE' ? 'Zona' : subChild.type === 'POLING_PLACE' ? 'Local de Votação' : subChild.type}: {subChild.name} {subChild.code && `(Zona ${subChild.code})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Print isolated list without parent region defined */}
            {territories.filter(t => t.type !== 'REGION' && !t.parentId).map(orphan => (
              <div key={orphan.id} className="p-3 bg-[var(--border-color)]/10 border border-[var(--border-color)]/40 rounded-xl flex items-center justify-between text-xs font-sans text-[var(--text-secondary)]">
                <span className="font-semibold">🌍 {orphan.type === 'STATE' ? 'Estado/UF' : orphan.type === 'CITY' ? 'Município' : orphan.type === 'ZONE' ? 'Zona' : 'Local de Votação'}: {orphan.name}</span>
                <span className="font-mono text-[10px]">{orphan.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* List format */}
        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4">
          <span className="text-xs font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono block">Territórios Listados</span>
          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
            {territories.map((t) => (
              <div key={t.id} className="p-3 border border-[var(--border-color)]/50 rounded-xl space-y-1 bg-[var(--bg-card)] hover:border-[var(--blue-accent)]/20 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-main)]">{t.name}</span>
                  <span className="text-[9px] bg-rose-500/10 text-rose-500 border border-rose-500/15 px-1.5 py-0.2 rounded font-mono font-bold leading-none uppercase">{t.type}</span>
                </div>
                {t.parentId && (
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                    Subordinado ID: #{t.parentId.slice(0, 6)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    )}

  </div>
  );
}
