import React, { useState } from 'react';
import { PackagePlus, Save, Trash2, Search, Plus } from 'lucide-react';
import type { RadarSavedSearch, RadarTenantProduct, RadarTenantProductInput } from '../../core/commercial/RadarTenantCatalogRepository';

interface Props {
  products: RadarTenantProduct[];
  searches: RadarSavedSearch[];
  onSaveProduct(input:RadarTenantProductInput):Promise<void>;
  onDeleteProduct(id:string):Promise<void>;
  onSaveSearch(input:{name:string;keywords:string[];active:boolean}):Promise<void>;
  onDeleteSearch(id:string):Promise<void>;
  onUseSearch(search:RadarSavedSearch):void;
}
const empty:RadarTenantProductInput={name:'',description:'',category:'',manufacturer:'',brand:'',unit:'',keywords:[],synonyms:[],classificationCodes:[],regions:[],notes:'',active:true};
export default function RadarTenantCatalogPanel({products,searches,onSaveProduct,onDeleteProduct,onSaveSearch,onDeleteSearch,onUseSearch}:Props){
  const [draft,setDraft]=useState<RadarTenantProductInput>(empty); const [searchName,setSearchName]=useState(''); const [searchKeywords,setSearchKeywords]=useState(''); const [busy,setBusy]=useState(false);
  const update=(key:keyof RadarTenantProductInput,value:unknown)=>setDraft((current)=>({...current,[key]:value}));
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{await onSaveProduct(draft);setDraft(empty);}finally{setBusy(false);}};
  const saveSearch=async()=>{const keywords=searchKeywords.split(',').map((item)=>item.trim()).filter(Boolean);if(!searchName.trim()||!keywords.length)return;setBusy(true);try{await onSaveSearch({name:searchName.trim(),keywords,active:true});setSearchName('');setSearchKeywords('');}finally{setBusy(false);}};
  return <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
    <form onSubmit={submit} className="xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div><h2 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2"><PackagePlus className="w-4 h-4 text-violet-400"/>Catálogo de produtos da empresa</h2><p className="text-xs text-[var(--text-secondary)] mt-1">Produtos privados deste tenant usados pelo motor de compatibilidade do Radar.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="field" placeholder="Nome do produto *" value={draft.name} onChange={(e)=>update('name',e.target.value)}/><input className="field" placeholder="Categoria" value={draft.category||''} onChange={(e)=>update('category',e.target.value)}/>
        <input className="field" placeholder="Marca" value={draft.brand||''} onChange={(e)=>update('brand',e.target.value)}/><input className="field" placeholder="Fabricante" value={draft.manufacturer||''} onChange={(e)=>update('manufacturer',e.target.value)}/>
        <input className="field md:col-span-2" placeholder="Descrição do produto" value={draft.description} onChange={(e)=>update('description',e.target.value)}/>
        <input className="field md:col-span-2" placeholder="Palavras-chave separadas por vírgula" value={draft.keywords.join(', ')} onChange={(e)=>update('keywords',e.target.value.split(',').map((v)=>v.trim()).filter(Boolean))}/>
        <input className="field" placeholder="Sinônimos" value={draft.synonyms.join(', ')} onChange={(e)=>update('synonyms',e.target.value.split(',').map((v)=>v.trim()).filter(Boolean))}/><input className="field" placeholder="CATMAT, NCM ou códigos" value={draft.classificationCodes.join(', ')} onChange={(e)=>update('classificationCodes',e.target.value.split(',').map((v)=>v.trim()).filter(Boolean))}/>
        <input className="field md:col-span-2" placeholder="Regiões de interesse (UF, cidade ou região)" value={draft.regions.join(', ')} onChange={(e)=>update('regions',e.target.value.split(',').map((v)=>v.trim()).filter(Boolean))}/>
      </div><button disabled={busy||!draft.name.trim()} className="px-4 py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 text-xs font-black text-violet-200 disabled:opacity-40 flex items-center gap-2"><Save className="w-4 h-4"/>Salvar produto</button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">{products.map((product)=><article key={product.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-4"><div className="flex justify-between gap-3"><div><h3 className="text-xs font-black text-[var(--text-main)]">{product.name}</h3><p className="text-[10px] text-[var(--text-secondary)] mt-1">{product.category||'Sem categoria'} • {product.keywords.length} palavra(s)-chave</p></div><button type="button" onClick={()=>onDeleteProduct(product.id)} className="text-red-300"><Trash2 className="w-4 h-4"/></button></div><p className="text-[10px] text-[var(--text-secondary)] mt-2 line-clamp-2">{product.description||product.keywords.join(', ')}</p></article>)}</div>
    </form>
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4"><div><h2 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2"><Search className="w-4 h-4 text-cyan-400"/>Pesquisas salvas</h2><p className="text-xs text-[var(--text-secondary)] mt-1">Monitoramento por palavras-chave independente do catálogo.</p></div><input className="field" placeholder="Nome da pesquisa" value={searchName} onChange={(e)=>setSearchName(e.target.value)}/><input className="field" placeholder="Palavras-chave separadas por vírgula" value={searchKeywords} onChange={(e)=>setSearchKeywords(e.target.value)}/><button type="button" disabled={busy} onClick={saveSearch} className="px-3 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-xs font-black text-cyan-200 flex items-center gap-2"><Plus className="w-4 h-4"/>Salvar pesquisa</button><div className="space-y-2">{searches.map((search)=><div key={search.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3"><div className="flex justify-between"><button type="button" onClick={()=>onUseSearch(search)} className="text-left"><strong className="text-xs text-[var(--text-main)]">{search.name}</strong><p className="text-[10px] text-[var(--text-secondary)] mt-1">{search.keywords.join(', ')}</p></button><button type="button" onClick={()=>onDeleteSearch(search.id)} className="text-red-300"><Trash2 className="w-4 h-4"/></button></div></div>)}</div></div>
  </section>;
}
