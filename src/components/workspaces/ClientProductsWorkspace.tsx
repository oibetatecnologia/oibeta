import React from 'react';
import { CheckCircle2, LockKeyhole, Package } from 'lucide-react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import { ProductAccessService } from '../../core/licensing/ProductAccessService';

export default function ClientProductsWorkspace() {
  const { user } = useWorkspace().tenant;
  const access = ProductAccessService.buildSnapshot(user);
  const licensed = access.availableProducts.filter((product) => product.tabs.length > 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Licenciamento do tenant</p>
        <h1 className="mt-2 text-2xl font-black text-[var(--text-main)]">Produtos da organização</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Produtos pertencem à Oi Beta e são habilitados neste tenant conforme o contrato.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {licensed.map((product) => (
          <article key={product.id} className="rounded-3xl border border-emerald-500/25 bg-[var(--bg-card)] p-5">
            <div className="flex items-center justify-between">
              <Package className="h-5 w-5 text-[var(--blue-accent)]" />
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Habilitado</span>
            </div>
            <h2 className="mt-4 font-black text-[var(--text-main)]">{product.commercialName}</h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{product.description}</p>
            <p className="mt-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{product.tabs.length} área(s) disponíveis</p>
          </article>
        ))}
        {licensed.length === 0 && (
          <div className="rounded-3xl border border-dashed border-[var(--border-color)] p-8 text-center text-[var(--text-secondary)] md:col-span-2 xl:col-span-3">
            <LockKeyhole className="mx-auto h-7 w-7" />
            <p className="mt-3 text-sm">Nenhum produto comercial foi habilitado para este usuário.</p>
          </div>
        )}
      </div>
    </div>
  );
}
