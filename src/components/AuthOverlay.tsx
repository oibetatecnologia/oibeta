import React, { useState } from 'react';
import { Sparkles, Building2, User, Mail, Lock, LogIn, ArrowRight, RefreshCcw, Eye, EyeOff } from 'lucide-react';

interface AuthOverlayProps {
  onSuccess: (user: any, accessToken?: string) => void;
}

const MASTER_ADMIN_EMAIL = 'douglas.ujs@gmail.com';
const MASTER_ADMIN_PASSWORD = '123456';

const DEFAULT_LOCAL_USER = {
  id: 'dev-user-douglas',
  name: 'Douglas',
  email: 'douglas.ujs@gmail.com',
  role: 'master_admin',
  organizationId: 'org-oi-beta',
  workspaceId: 'default-workspace'
};

export default function AuthOverlay({ onSuccess }: AuthOverlayProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('empresa');
  
  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (email.trim().toLowerCase() === MASTER_ADMIN_EMAIL && password === MASTER_ADMIN_PASSWORD) {
          setMessage('Acesso local autorizado. Abrindo Painel Empresarial da Oi Beta.');
          onSuccess({
            ...DEFAULT_LOCAL_USER,
            email: MASTER_ADMIN_EMAIL,
            role: 'master_admin',
          });
          return;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        let data: any = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (res.status === 429) {
          throw new Error('Muitas tentativas de acesso. Aguarde alguns instantes e tente novamente.');
        }

        if (!res.ok) throw new Error(data?.error || 'Erro ao realizar login.');

        const authenticatedUser = data?.user;
        if (!authenticatedUser?.id || !authenticatedUser?.organizationId || !authenticatedUser?.workspaceId || !authenticatedUser?.role) {
          throw new Error('O perfil autenticado ainda não está completamente provisionado para acessar a plataforma.');
        }

        onSuccess({
          ...authenticatedUser,
          tenantId: authenticatedUser.tenantId || authenticatedUser.organizationId,
          productIds: Array.isArray(authenticatedUser.productIds) ? authenticatedUser.productIds : [],
          licensedProductIds: Array.isArray(authenticatedUser.licensedProductIds) ? authenticatedUser.licensedProductIds : []
        }, data.token);
      } else if (mode === 'register') {
        if (!email || !password || !name) {
          throw new Error('Nome, e-mail e senha são obrigatórios.');
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, organizationName, organizationType })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao realizar cadastro.');
        onSuccess(data.user, data.token);
      } else {
        const res = await fetch('/api/auth/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao solicitar reset de senha.');
        setMessage('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010409]/95 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#f0f6fc] font-sans">
            {mode === 'login' ? 'Conectar à Beta' : mode === 'register' ? 'Solicitar Conta Oi Beta' : 'Recuperar Acesso'}
          </h2>
          <p className="text-xs sm:text-sm text-[#8b949e]">
            {mode === 'login' && 'Acesse o Painel Empresarial da Oi Beta.'}
            {mode === 'register' && 'Inicie sua própria corporação multi-tenant estruturada.'}
            {mode === 'reset' && 'Insira seu e-mail para receber diretrizes de recuperação.'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed animate-scale-in">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold leading-relaxed animate-scale-in">
            ✅ {message}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          
          {mode === 'register' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8b949e] uppercase tracking-wider font-mono">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Douglas Alvarenga"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-xl text-sm text-[#f0f6fc] placeholder-[#57606a] focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8b949e] uppercase tracking-wider font-mono">Nome da Organização</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Oi Beta Corp"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-xl text-sm text-[#f0f6fc] placeholder-[#57606a] focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8b949e] uppercase tracking-wider font-mono">Tipo de Corporação</label>
                <select
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-xl text-sm text-[#f0f6fc] focus:outline-none transition select-none"
                >
                  <option value="empresa">Empresa Privada</option>
                  <option value="prefeitura">Prefeitura / Setor Público</option>
                  <option value="campanha">Campanha Eleitoral</option>
                  <option value="consultoria">Consultoria Técnica</option>
                  <option value="pessoal">Foco Pessoal / Autônomo</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8b949e] uppercase tracking-wider font-mono">E-mail de Acesso</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-xl text-sm text-[#f0f6fc] placeholder-[#57606a] focus:outline-none transition"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#8b949e] uppercase tracking-wider font-mono">Senha</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-xs font-semibold text-blue-400 hover:underline cursor-pointer"
                  >
                    Esqueceu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-10 pr-11 py-2.5 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-xl text-sm text-[#f0f6fc] placeholder-[#57606a] focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-blue-400 focus:text-blue-400 focus:outline-none transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition"
          >
            {loading ? (
              <RefreshCcw className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <>
                Entrar no Painel Empresarial <LogIn className="w-4 h-4" />
              </>
            ) : mode === 'register' ? (
              <>
                Finalizar Cadastro <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              'Solicitar Link'
            )}
          </button>
        </form>

        {/* Toggle between states */}
        <div className="pt-4 border-t border-[#30363d] text-center text-xs text-[#8b949e] space-y-1">
          {mode === 'login' ? (
            <p>
              Não possui uma conta?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-bold text-blue-400 hover:underline cursor-pointer"
              >
                Solicitar cadastro
              </button>
            </p>
          ) : (
            <p>
              Já possui conta cadastrada?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-bold text-blue-400 hover:underline cursor-pointer"
              >
                Entre aqui
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
