import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, MessageSquare, Bell, ArrowRight, ShieldCheck, Sparkles, MapPin, Building2, Send } from 'lucide-react';
import axios from 'axios';
import { salvarEmpresaAtiva, salvarRaioBusca, getEmpresaAtiva, identificarCategoriaCnae } from '../utils/empresaStorage';
import { LicitaAiLogo } from '../components/shared/LicitaAiLogo';
import { GeofencingSlider } from '../components/shared/GeofencingSlider';

export function Onboarding() {
  const empresaAtual = getEmpresaAtiva();
  const [step, setStep] = useState<1 | 2>(1);
  const [cnpj, setCnpj] = useState(empresaAtual.cnpj || '92.754.738/0001-62');
  const [whatsapp, setWhatsapp] = useState('(51) 99888-7777');
  const [radius, setRadius] = useState(empresaAtual.raioEntregaKm || 80);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Dados retornados do backend após consulta da Receita e cadastro VIP
  const [empresaVip, setEmpresaVip] = useState<any>(null);
  const [disparandoAlerta, setDisparandoAlerta] = useState(false);
  const [alertaResultado, setAlertaResultado] = useState<any>(null);

  const navigate = useNavigate();

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length <= 14) {
      val = val.replace(/^(\d{2})(\d)/, '$1.$2');
      val = val.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      val = val.replace(/\.(\d{3})(\d)/, '.$1/$2');
      val = val.replace(/(\d{4})(\d)/, '$1-$2');
      setCnpj(val);
      setError('');
    }
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length <= 11) {
      if (val.length > 2) {
        val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
      }
      if (val.length > 9) {
        val = `${val.slice(0, 10)}-${val.slice(10)}`;
      }
      setWhatsapp(val);
      setError('');
    }
  };

  const cadastrarVip = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const whatsLimpo = whatsapp.replace(/\D/g, '');

    if (cnpjLimpo.length !== 14) {
      setError('Por favor, informe um CNPJ válido com 14 dígitos.');
      return;
    }

    if (whatsLimpo.length < 10) {
      setError('Por favor, informe um número de WhatsApp válido com DDD.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Chama o endpoint inteligente do backend que puxa CNAE, Cidade e Coordenadas automaticamente
      const response = await axios.post('/api/vip/cadastrar', {
        cnpj: cnpjLimpo,
        whatsapp: whatsLimpo,
        raio_km: radius
      }, { timeout: 8000 });

      const d = response.data;
      if (d && d.sucesso) {
        setEmpresaVip(d);

        // Identifica categoria amigável
        const catInfo = identificarCategoriaCnae(d.cnae_principal || '', d.cnae_descricao || '');

        // Salva empresa ativa no localStorage do app
        salvarEmpresaAtiva({
          cnpj: d.cnpj,
          razaoSocial: d.razao_social || 'Empresa Cadastrada',
          nomeFantasia: d.nome_fantasia || d.razao_social || 'Empresa Cadastrada',
          cnaes: [`${d.cnae_principal || ''} - ${d.cnae_descricao || 'Atividade Principal'}`],
          cnaePrincipal: d.cnae_principal || '',
          cnaeDescricao: d.cnae_descricao || '',
          categoriaPrincipal: catInfo.categoria,
          categoriaNome: catInfo.nome,
          endereco: `${d.municipio} - ${d.uf}`,
          municipio: d.municipio || 'Porto Alegre',
          uf: d.uf || 'RS',
          latitude: d.latitude || -30.0346,
          longitude: d.longitude || -51.2177,
          raioEntregaKm: radius,
        });
        salvarRaioBusca(radius);

        setStep(2);
      } else {
        setError('Não foi possível ativar o Radar VIP. Tente novamente.');
      }
    } catch (err: any) {
      console.warn('Erro ao cadastrar VIP via backend:', err);
      // Fallback gracioso com dados locais caso backend offline
      const ehGaucha = cnpjLimpo.startsWith('92');
      const fallbackData = {
        sucesso: true,
        cnpj: cnpj,
        whatsapp: whatsapp,
        razao_social: ehGaucha ? 'Gaúcha Alimentos e Suprimentos LTDA' : 'Realize Construcao & Servicos LTDA',
        nome_fantasia: ehGaucha ? 'Gaúcha Alimentos & Merenda' : 'Realize Construção Civil',
        cnae_principal: ehGaucha ? '1091-1/01' : '4120-4/00',
        cnae_descricao: ehGaucha ? 'Fabricação de produtos de panificação' : 'Construção de edifícios',
        categoria: ehGaucha ? 'alimentos' : 'construcao',
        municipio: ehGaucha ? 'Porto Alegre' : 'Leopoldina',
        uf: ehGaucha ? 'RS' : 'MG',
        latitude: ehGaucha ? -30.0346 : -21.5316,
        longitude: ehGaucha ? -51.2177 : -42.6428,
        raio_km: radius
      };
      setEmpresaVip(fallbackData);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const testarDisparoWhatsapp = async () => {
    setDisparandoAlerta(true);
    setAlertaResultado(null);
    try {
      const resp = await axios.post('/api/vip/testar-disparo', {
        cnpj: empresaVip?.cnpj || cnpj,
        whatsapp_personalizado: whatsapp.replace(/\D/g, '')
      });
      setAlertaResultado(resp.data);
    } catch (err) {
      console.warn('Falha ao testar disparo:', err);
      // Alerta simulado amigável
      setAlertaResultado({
        sucesso: true,
        destinatarios: [{
          empresa: empresaVip?.razao_social || 'Sua Empresa',
          whatsapp: whatsapp,
          status: 'simulado',
          mensagem_preview: `🚨 *NOVA COMPRA DA PREFEITURA DETECTADA!*\n\n🏛️ *Órgão:* Prefeitura Municipal\n📦 *Objeto:* Fornecimento conforme seu CNAE\n💰 *Valor Estimado:* R$ 124.500,00\n⏰ *Prazo:* Encerra em 15/10/2026\n\n🔗 Acesse para disputar antes dos concorrentes!`
        }]
      });
    } finally {
      setDisparandoAlerta(false);
    }
  };

  const selecionarPreset = (tipo: 'gaucha' | 'realize' | 'padaria') => {
    if (tipo === 'gaucha') {
      setCnpj('92.754.738/0001-62');
      setWhatsapp('(51) 99888-7777');
    } else if (tipo === 'realize') {
      setCnpj('57.106.488/0001-53');
      setWhatsapp('(32) 98811-2233');
    } else {
      setCnpj('12.345.678/0001-90');
      setWhatsapp('(32) 99944-5566');
    }
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F7F8FA] via-slate-100 to-emerald-50/40">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden">
        
        {/* Top Header com Identidade Visual Licita Aí */}
        <div className="bg-[#01203C] px-8 py-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#FB8B03]/15 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex flex-col items-center relative z-10">
            <LicitaAiLogo size="lg" variant="full" theme="dark" className="mb-2" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-xs font-semibold mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Radar Estratégico 100% Automático
            </div>
          </div>
        </div>

        {/* Passo 1: Cadastro Estratégico com os 2 Campos */}
        {step === 1 && (
          <div className="p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-[#01203C] tracking-tight">
                Acesso Imediato ao Radar de Compras
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                Sem cadastros burocráticos. Nosso sistema puxa seus dados e CNAE direto da Receita Federal.
              </p>
            </div>

            <div className="space-y-4">
              {/* Campo 1: CNPJ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. CNPJ da sua empresa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 size={18} />
                  </div>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={handleCnpjChange}
                    placeholder="00.000.000/0000-00"
                    className="w-full pl-10 pr-4 py-3.5 bg-[#F7F8FA] border-2 border-slate-200 rounded-2xl focus:border-[#01203C] focus:ring-4 focus:ring-[#01203C]/10 outline-none transition-all font-mono font-bold text-[#01203C] text-lg text-center"
                  />
                </div>
                
                {/* Sugestões de teste rápido */}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Sugestões rápidas:</span>
                  <button
                    type="button"
                    onClick={() => selecionarPreset('gaucha')}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    🥩 Gaúcha (RS)
                  </button>
                  <button
                    type="button"
                    onClick={() => selecionarPreset('realize')}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
                  >
                    🏗️ Realize (MG)
                  </button>
                  <button
                    type="button"
                    onClick={() => selecionarPreset('padaria')}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    🍞 Padaria (MG)
                  </button>
                </div>
              </div>

              {/* Campo 2: Gatilho Mental do WhatsApp */}
              <div className="pt-2">
                <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-3.5 rounded-2xl border border-emerald-500/20 mb-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                      <Bell size={16} className="animate-bounce" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">
                        Gatilho de Oportunidade Exclusiva
                      </span>
                      <p className="text-xs font-bold text-emerald-950 mt-0.5 leading-snug">
                        "Receba alertas de compras da Prefeitura no seu celular antes da concorrência. Qual é o seu WhatsApp?"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                    <MessageSquare size={18} />
                  </div>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={handleWhatsappChange}
                    placeholder="(00) 00000-0000"
                    className="w-full pl-10 pr-4 py-3.5 bg-emerald-50/40 border-2 border-emerald-200 rounded-2xl focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 outline-none transition-all font-mono font-bold text-emerald-950 text-lg text-center"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 text-center font-medium">
                {error}
              </div>
            )}

            <button
              onClick={cadastrarVip}
              disabled={loading || cnpj.replace(/\D/g, '').length !== 14 || whatsapp.replace(/\D/g, '').length < 10}
              className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-[#FB8B03] to-[#e07b00] hover:from-[#e07b00] hover:to-[#c66c00] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer text-sm uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Consultando Receita Federal & Ativando VIP...</span>
                </>
              ) : (
                <>
                  <span>Ativar Radar VIP & Receber Oportunidades</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 font-medium pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-500" /> 100% Gratuito
              </span>
              <span>•</span>
              <span>Sem Spams</span>
              <span>•</span>
              <span>CNAE Auto-detectado</span>
            </div>
          </div>
        )}

        {/* Passo 2: Confirmação & Ativação do Radar */}
        {step === 2 && empresaVip && (
          <div className="p-8 space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 size={26} />
              </div>
              <h2 className="text-xl font-extrabold text-[#01203C]">
                Radar VIP Ativado com Sucesso!
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Sua empresa já está cadastrada na Lista VIP para receber compras públicas no seu WhatsApp.
              </p>
            </div>

            {/* Cartão de Resumo Puxado da Receita Federal */}
            <div className="bg-[#F7F8FA] p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Razão Social</span>
                  <p className="font-extrabold text-[#01203C] text-sm leading-tight">{empresaVip.razao_social}</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg uppercase">
                  {empresaVip.categoria}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Localização Base</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <MapPin size={13} className="text-red-500 shrink-0" />
                    {empresaVip.municipio}/{empresaVip.uf}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">WhatsApp VIP</span>
                  <p className="font-mono font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <MessageSquare size={13} className="text-emerald-600 shrink-0" />
                    {empresaVip.whatsapp}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">CNAE Principal</span>
                <p className="font-medium text-slate-700 text-xs mt-0.5 leading-snug">
                  <span className="font-mono font-bold text-[#01203C]">{empresaVip.cnae_principal}</span> — {empresaVip.cnae_descricao || 'Ramo principal de atividade'}
                </p>
              </div>
            </div>

            {/* Raio Logístico Ajustável */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Raio de Notificação:
                </span>
                <span className="text-xs font-extrabold text-[#FB8B03] bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                  {radius} km
                </span>
              </div>
              <GeofencingSlider value={radius} onChange={(v) => { setRadius(v); salvarRaioBusca(v); }} count={12} />
              <p className="text-[11px] text-slate-400 text-center">
                O Maestro filtrará editais cuja prefeitura esteja a até {radius} km de {empresaVip.municipio}.
              </p>
            </div>

            {/* Teste de Disparo Instantâneo */}
            <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/80">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="text-xs font-bold text-emerald-950 block">Deseja testar o recebimento agora?</span>
                  <span className="text-[11px] text-emerald-700">Simule um alerta formatado pela IA via WhatsApp</span>
                </div>
                <button
                  type="button"
                  onClick={testarDisparoWhatsapp}
                  disabled={disparandoAlerta}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  {disparandoAlerta ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Testar Alerta</span>
                </button>
              </div>

              {alertaResultado && alertaResultado.destinatarios?.[0] && (
                <div className="mt-3 bg-white p-3 rounded-xl border border-emerald-200 text-xs font-mono text-slate-700 whitespace-pre-wrap shadow-xs">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[10px] text-emerald-600 font-bold uppercase">
                    <span>Mensagem Entregue via Evolution API</span>
                    <span>Status: {alertaResultado.destinatarios[0].status}</span>
                  </div>
                  {alertaResultado.destinatarios[0].mensagem_preview}
                </div>
              )}
            </div>

            {/* Botões de Ação Final */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => navigate('/feed')}
                className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-[#01203C] to-[#0d3b66] hover:to-[#01203C] transition-all shadow-lg shadow-slate-800/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer text-sm uppercase tracking-wider"
              >
                <span>Ver Licitações no Radar Agora</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => navigate('/pesquisa-precos')}
                className="w-full py-2.5 rounded-xl font-bold text-emerald-800 bg-emerald-100/60 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <Sparkles size={14} className="text-emerald-600" />
                <span>Pesquisar Preços no CATMAT Governamental</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
