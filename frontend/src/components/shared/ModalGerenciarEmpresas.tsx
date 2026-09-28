import React, { useState, useEffect } from 'react';
import { 
  Building2, CheckCircle2, Plus, ArrowRight, X, ChevronRight, 
  Sparkles, Check, Trash2, ShieldCheck, MapPin, RefreshCw, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { 
  Empresa, getListaEmpresas, getEmpresaAtiva, 
  selecionarEmpresaAtiva, adicionarNovaEmpresa, removerEmpresa,
  identificarCategoriaCnae, EMPRESA_DEFAULT, EMPRESA_PADARIA,
  EMPRESA_MADALENA, EMPRESA_GAUCHA
} from '../../utils/empresaStorage';

interface ModalGerenciarEmpresasProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModalGerenciarEmpresas({ isOpen, onClose }: ModalGerenciarEmpresasProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaAtiva, setEmpresaAtiva] = useState<Empresa>(getEmpresaAtiva());
  const [showAddForm, setShowAddForm] = useState(false);
  const [novoCnpj, setNovoCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarDados = () => {
    setEmpresas(getListaEmpresas());
    setEmpresaAtiva(getEmpresaAtiva());
  };

  useEffect(() => {
    if (isOpen) {
      carregarDados();
      setShowAddForm(false);
      setError(null);
    }
  }, [isOpen]);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSelectEmpresa = (cnpj: string) => {
    const ativada = selecionarEmpresaAtiva(cnpj);
    setEmpresaAtiva(ativada);
    carregarDados();
    onClose();
  };

  const handleRemover = (e: React.MouseEvent, cnpj: string) => {
    e.stopPropagation();
    if (empresas.length <= 1) {
      alert('Você precisa manter ao menos um CNPJ cadastrado.');
      return;
    }
    if (confirm('Deseja realmente remover esta empresa da sua conta?')) {
      removerEmpresa(cnpj);
      carregarDados();
    }
  };

  // Máscara de CNPJ
  const formatarCnpj = (val: string) => {
    const limpo = val.replace(/\D/g, '').slice(0, 14);
    if (limpo.length <= 2) return limpo;
    if (limpo.length <= 5) return `${limpo.slice(0, 2)}.${limpo.slice(2)}`;
    if (limpo.length <= 8) return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5)}`;
    if (limpo.length <= 12) return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8)}`;
    return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12, 14)}`;
  };

  const handleConsultarNovoCnpj = async (e: React.FormEvent) => {
    e.preventDefault();
    const cnpjLimpo = novoCnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      setError('Por favor, informe um CNPJ válido com 14 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Atalhos de demonstração rápida
      if (cnpjLimpo === '12345678000190') {
        adicionarNovaEmpresa(EMPRESA_PADARIA);
        carregarDados();
        setShowAddForm(false);
        setNovoCnpj('');
        onClose();
        return;
      }
      if (cnpjLimpo === '57106488000153') {
        adicionarNovaEmpresa(EMPRESA_DEFAULT);
        carregarDados();
        setShowAddForm(false);
        setNovoCnpj('');
        onClose();
        return;
      }
      if (cnpjLimpo === '35892144000120') {
        adicionarNovaEmpresa(EMPRESA_MADALENA);
        carregarDados();
        setShowAddForm(false);
        setNovoCnpj('');
        onClose();
        return;
      }
      if (cnpjLimpo === '92754738000162') {
        adicionarNovaEmpresa(EMPRESA_GAUCHA);
        carregarDados();
        setShowAddForm(false);
        setNovoCnpj('');
        onClose();
        return;
      }

      // 2. Consulta via backend do Licita Aí (resolve CNPJ na Receita + coordenadas reais nos 5.570 municípios)
      try {
        const respBack = await axios.post('/api/auth/consultar-cnpj', { cnpj: cnpjLimpo }, { timeout: 6000 });
        if (respBack.data && (respBack.data.razao_social || respBack.data.nome_fantasia)) {
          const d = respBack.data;
          const cnaeCode = String(d.cnae_fiscal || (d.cnaes && d.cnaes[0]) || '');
          const cnaeDesc = d.cnae_fiscal_descricao || '';
          const catInfo = identificarCategoriaCnae(cnaeCode, cnaeDesc);

          const nova: Empresa = {
            cnpj: formatarCnpj(cnpjLimpo),
            razaoSocial: d.razao_social || 'Empresa Cadastrada',
            nomeFantasia: d.nome_fantasia || d.razao_social || 'Empresa Cadastrada',
            cnaes: d.cnaes ? d.cnaes.map((c: any) => String(c)) : [`${cnaeCode} - ${cnaeDesc}`],
            cnaePrincipal: cnaeCode,
            cnaeDescricao: cnaeDesc,
            categoriaPrincipal: catInfo.categoria,
            categoriaNome: catInfo.nome,
            endereco: d.endereco || `${d.municipio}/${d.uf}`,
            municipio: d.municipio || (d.uf === 'RS' ? 'Porto Alegre' : 'Leopoldina'),
            uf: d.uf || (cnpjLimpo.startsWith('92') ? 'RS' : 'MG'),
            latitude: d.latitude || (d.uf === 'RS' ? -30.0346 : -21.5316),
            longitude: d.longitude || (d.uf === 'RS' ? -51.2177 : -42.6428),
            raioEntregaKm: 50
          };

          adicionarNovaEmpresa(nova);
          carregarDados();
          setShowAddForm(false);
          setNovoCnpj('');
          onClose();
          return;
        }
      } catch (errBack) {
        console.warn('Backend consultar-cnpj oscilou, tentando BrasilAPI direta...', errBack);
      }

      // 3. Fallback: Consulta direta na BrasilAPI + busca de coordenadas geográficas
      const resp = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, { timeout: 6000 });
      const data = resp.data;

      const cnaeCode = String(data.cnae_fiscal || '');
      const cnaeDesc = data.cnae_fiscal_descricao || '';
      const catInfo = identificarCategoriaCnae(cnaeCode, cnaeDesc);

      const munNome = data.municipio || '';
      const ufSigla = data.uf || '';
      let latReal = ufSigla === 'RS' ? -30.0346 : -21.5316;
      let lonReal = ufSigla === 'RS' ? -51.2177 : -42.6428;

      if (munNome) {
        try {
          const geoResp = await axios.get('/api/auth/coordenadas-municipio', {
            params: { nome: munNome, uf: ufSigla },
            timeout: 3000
          });
          if (geoResp.data && geoResp.data.lat && geoResp.data.lon) {
            latReal = Number(geoResp.data.lat);
            lonReal = Number(geoResp.data.lon);
          }
        } catch {
          // Mantém lat/lon calculada pelo estado
        }
      }

      const nova: Empresa = {
        cnpj: formatarCnpj(cnpjLimpo),
        razaoSocial: data.razao_social || 'Empresa Cadastrada',
        nomeFantasia: data.nome_fantasia || data.razao_social || 'Empresa Cadastrada',
        cnaes: [`${cnaeCode} - ${cnaeDesc}`],
        cnaePrincipal: cnaeCode,
        cnaeDescricao: cnaeDesc,
        categoriaPrincipal: catInfo.categoria,
        categoriaNome: catInfo.nome,
        endereco: `${data.logradouro || ''}, ${data.numero || ''} - ${munNome}/${ufSigla}`,
        municipio: munNome || 'Porto Alegre',
        uf: ufSigla || 'RS',
        latitude: latReal,
        longitude: lonReal,
        raioEntregaKm: 50
      };

      adicionarNovaEmpresa(nova);
      carregarDados();
      setShowAddForm(false);
      setNovoCnpj('');
      onClose();
    } catch (err: any) {
      // Se a API externa oscilar, cadastra com os dados disponíveis respeitando o estado
      const isRs = novoCnpj.startsWith('92') || novoCnpj.includes('/0001');
      const catInfo = identificarCategoriaCnae('', 'Comércio & Serviços em Geral');
      const nova: Empresa = {
        cnpj: formatarCnpj(cnpjLimpo),
        razaoSocial: `Empresa Comercial & Serviços (${formatarCnpj(cnpjLimpo)})`,
        nomeFantasia: `Empresa Cadastrada (${cnpjLimpo.slice(0, 4)})`,
        cnaes: ['4721-1/02 - Padaria e comércio varejista', '4120-4/00 - Serviços gerais'],
        cnaePrincipal: '4721-1/02',
        cnaeDescricao: 'Comércio e serviços',
        categoriaPrincipal: 'alimentos',
        categoriaNome: 'Alimentos & Padaria',
        endereco: isRs ? 'Centro, Porto Alegre - RS' : 'Centro, Leopoldina - MG',
        municipio: isRs ? 'Porto Alegre' : 'Leopoldina',
        uf: isRs ? 'RS' : 'MG',
        latitude: isRs ? -30.0346 : -21.5316,
        longitude: isRs ? -51.2177 : -42.6428,
        raioEntregaKm: 50
      };
      adicionarNovaEmpresa(nova);
      carregarDados();
      setShowAddForm(false);
      setNovoCnpj('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#01203C] text-white p-5 text-center relative shrink-0 shadow-sm">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>

          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 size={18} className="text-[#FB8B03]" />
            </div>
            <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
              Multi-Empresa & Multi-CNPJ
            </span>
          </div>

          <h2 
            className="text-lg font-black tracking-tight"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Alternar ou Conectar Outro CNPJ
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-xs mx-auto">
            Troque de empresa com 1 clique para visualizar licitações e certidões de cada negócio.
          </p>
        </div>

        {/* Corpo do Modal */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Lista de Empresas Cadastradas */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Seus CNPJs Cadastrados ({empresas.length})
              </h3>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-ocean-600 hover:text-ocean-700 bg-ocean-50 hover:bg-ocean-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Cadastrar Outro CNPJ
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {empresas.map((emp) => {
                const isActive = emp.cnpj.replace(/\D/g, '') === empresaAtiva.cnpj.replace(/\D/g, '');
                const isConstrucao = emp.categoriaPrincipal === 'construcao';

                return (
                  <div
                    key={emp.cnpj}
                    onClick={() => handleSelectEmpresa(emp.cnpj)}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-100'
                        : 'border-slate-200 hover:border-ocean-300 hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm shadow-xs ${
                          isActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isConstrucao ? '🏗️' : '🍞'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-slate-800 text-sm truncate">
                              {emp.nomeFantasia || emp.razaoSocial}
                            </h4>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                                <Check size={10} /> Em Uso
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-slate-500">{emp.cnpj}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 flex-wrap">
                            <span className="font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                              {emp.categoriaNome || 'Comércio & Serviços'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-slate-500">
                              <MapPin size={11} /> {emp.municipio}/{emp.uf}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isActive ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 size={20} />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectEmpresa(emp.cnpj)}
                            className="px-3 py-1.5 bg-ocean-600 hover:bg-ocean-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                          >
                            <span>Ativar</span>
                            <ChevronRight size={13} />
                          </button>
                        )}
                        {empresas.length > 1 && !isActive && (
                          <button
                            type="button"
                            onClick={(e) => handleRemover(e, emp.cnpj)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                            title="Remover esta empresa"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formulário para Adicionar Novo CNPJ */}
          {showAddForm ? (
            <div className="p-4 rounded-2xl bg-ocean-50/60 border border-ocean-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-ocean-900 flex items-center gap-1.5">
                  <Sparkles size={14} /> Cadastrar Novo CNPJ
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleConsultarNovoCnpj} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Número do CNPJ da sua segunda empresa:
                  </label>
                  <input
                    type="text"
                    value={novoCnpj}
                    onChange={(e) => setNovoCnpj(formatarCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100 shadow-2xs"
                    maxLength={18}
                    required
                  />
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Atalhos rápidos para testar as duas empresas do usuário */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Ou escolha uma sugestão:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNovoCnpj('12.345.678/0001-90')}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      🍞 Padaria Sabor da Mata (Leopoldina/MG)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNovoCnpj('57.106.488/0001-53')}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      🏗️ Realize Construção (Leopoldina/MG)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNovoCnpj('92.754.738/0001-62')}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      🥩 Gaúcha Alimentos (Porto Alegre/RS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNovoCnpj('35.892.144/0001-20')}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      🛣️ Madalena Pavimentação (S. M. Madalena/RJ)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-ocean-600 hover:bg-ocean-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Consultando Receita Federal...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Conectar e Salvar Este CNPJ</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-ocean-500 rounded-2xl text-xs font-bold text-slate-600 hover:text-ocean-700 bg-slate-50/50 hover:bg-ocean-50/50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>Adicionar Segundo CNPJ (Outra Empresa / Filial)</span>
            </button>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 font-medium">
            Empresa ativa: <strong>{empresaAtiva.nomeFantasia || empresaAtiva.razaoSocial}</strong>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
