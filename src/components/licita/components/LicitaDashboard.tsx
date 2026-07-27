import React from "react";
import {
  ArrowRight,
  Briefcase,
  FileEdit,
  FileSignature,
  FileText,
  Globe,
  Users,
} from "lucide-react";

interface LicitaDashboardProps {
  opportunities: any[];
  bids: any[];
  suppliers: any[];
  contracts: any[];
  arps: any[];
  reports: any[];
  setActiveTab: (tab: string) => void;
}

export default function LicitaDashboard({
  opportunities,
  bids,
  suppliers,
  contracts,
  arps,
  reports,
  setActiveTab,
}: LicitaDashboardProps) {
  const isDashboardEmpty =
    opportunities.length === 0 &&
    bids.length === 0 &&
    suppliers.length === 0 &&
    contracts.length === 0 &&
    arps.length === 0 &&
    reports.length === 0;

  return (
    <div className="space-y-6">
      {isDashboardEmpty ? (
        <div className="p-12 border border-[var(--border-color)] bg-[var(--bg-card)]/30 rounded-2xl text-center space-y-4">
          <span className="text-3xl">📭</span>
          <h3 className="text-lg font-black text-[var(--text-main)] font-mono uppercase tracking-wider">
            NO_DATA
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Nenhum registro de oportunidades, certames, fornecedores ou
            contratos foi encontrado neste workspace.
          </p>
        </div>
      ) : (
        <>
          {/* METRICS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Oportunidades Card */}
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[110px] hover:border-indigo-500/35 transition-all">
              <div>
                <span className="text-[10px] font-mono uppercase font-black text-[var(--text-secondary)] block tracking-wider">
                  Oportunidades
                </span>
                <div className="text-3xl font-extrabold text-[var(--text-main)] mt-2 font-mono">
                  {opportunities.length === 0
                    ? "NO_DATA"
                    : opportunities.length}
                </div>
              </div>
              <Globe className="absolute right-3 bottom-3 w-8 h-8 text-[var(--text-secondary)]/15" />
            </div>

            {/* Certames Card */}
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[110px] hover:border-indigo-500/35 transition-all">
              <div>
                <span className="text-[10px] font-mono uppercase font-black text-[var(--text-secondary)] block tracking-wider">
                  Certames Licitatórios
                </span>
                <div className="text-3xl font-extrabold text-[var(--text-main)] mt-2 font-mono">
                  {bids.length === 0 ? "NO_DATA" : bids.length}
                </div>
              </div>
              <Briefcase className="absolute right-3 bottom-3 w-8 h-8 text-[var(--text-secondary)]/15" />
            </div>

            {/* Fornecedores Card */}
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[110px] hover:border-indigo-500/35 transition-all">
              <div>
                <span className="text-[10px] font-mono uppercase font-black text-[var(--text-secondary)] block tracking-wider">
                  Fornecedores Homologados
                </span>
                <div className="text-3xl font-extrabold text-[var(--text-main)] mt-2 font-mono">
                  {suppliers.length === 0 ? "NO_DATA" : suppliers.length}
                </div>
              </div>
              <Users className="absolute right-3 bottom-3 w-8 h-8 text-[var(--text-secondary)]/15" />
            </div>

            {/* Contratos Card */}
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[110px] hover:border-indigo-500/35 transition-all">
              <div>
                <span className="text-[10px] font-mono uppercase font-black text-[var(--text-secondary)] block tracking-wider">
                  Contratos Ativos
                </span>
                <div className="text-3xl font-extrabold text-[var(--text-main)] mt-2 font-mono">
                  {contracts.length === 0 ? "NO_DATA" : contracts.length}
                </div>
              </div>
              <FileText className="absolute right-3 bottom-3 w-8 h-8 text-[var(--text-secondary)]/15" />
            </div>

            {/* ARPs Card */}
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[110px] hover:border-indigo-500/35 transition-all">
              <div>
                <span className="text-[10px] font-mono uppercase font-black text-[var(--text-secondary)] block tracking-wider">
                  Atas ARP
                </span>
                <div className="text-3xl font-extrabold text-[var(--text-main)] mt-2 font-mono">
                  {arps.length === 0 ? "NO_DATA" : arps.length}
                </div>
              </div>
              <FileSignature className="absolute right-3 bottom-3 w-8 h-8 text-[var(--text-secondary)]/15" />
            </div>

            {/* Relatórios Card */}
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[110px] hover:border-indigo-500/35 transition-all">
              <div>
                <span className="text-[10px] font-mono uppercase font-black text-[var(--text-secondary)] block tracking-wider">
                  Relatórios Emitidos
                </span>
                <div className="text-3xl font-extrabold text-[var(--text-main)] mt-2 font-mono">
                  {reports.length === 0 ? "NO_DATA" : reports.length}
                </div>
              </div>
              <FileEdit className="absolute right-3 bottom-3 w-8 h-8 text-[var(--text-secondary)]/15" />
            </div>
          </div>

          {/* QUICK INSIGHTS / RECENT ITEMS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                <span className="text-xs font-black font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                  Próximos Certames Licitatórios
                </span>
                <button
                  onClick={() => setActiveTab("licita_bids")}
                  className="text-xs hover:underline text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
                >
                  Ver todos <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {bids.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">
                  Nenhum dado encontrado.
                </p>
              ) : (
                <div className="space-y-3">
                  {bids.slice(0, 4).map((b, idx) => (
                    <div
                      key={b.id || idx}
                      className="flex justify-between items-center bg-[var(--bg-card)]/50 p-2.5 border border-[var(--border-color)]/70 rounded-lg"
                    >
                      <div>
                        <h4 className="text-xs font-bold truncate max-w-[280px]">
                          {b.title}
                        </h4>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                          Órgão:{" "}
                          {b.metadata?.orgao ||
                            b.metadata?.organ ||
                            "Não Definido"}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 font-bold rounded-full ${b.status === "ACTIVE" || b.status === "HOMOLOGATED" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"}`}
                      >
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                <span className="text-xs font-black font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                  Contratos Ativos Recentes
                </span>
                <button
                  onClick={() => setActiveTab("licita_contracts")}
                  className="text-xs hover:underline text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
                >
                  Ver todos <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {contracts.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">
                  Nenhum dado encontrado.
                </p>
              ) : (
                <div className="space-y-3">
                  {contracts.slice(0, 4).map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className="flex justify-between items-center bg-[var(--bg-card)]/50 p-2.5 border border-[var(--border-color)]/70 rounded-lg"
                    >
                      <div>
                        <h4 className="text-xs font-bold">
                          Contrato nº {c.number || c.id.substring(0, 8)}
                        </h4>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                          Fornecedor:{" "}
                          {c.supplierName || "Corporação Licenciada"}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {c.value
                          ? c.value.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "R$ 0,00"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
