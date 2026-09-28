import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Mic, MicOff, Send, FileText, Download, Copy, Check, 
  Calendar, Clock, AlertTriangle, ArrowLeft, ExternalLink, HelpCircle, 
  Bot, Volume2, ShieldCheck, CheckCircle2, ChevronRight, Bell, 
  Printer, MessageSquare, BookOpen, AlertCircle, Building2, MapPin, Heart
} from 'lucide-react';
import { getEmpresaAtiva, Empresa } from '../utils/empresaStorage';
import { mockOportunidades } from '../data/mockData';
import { LINKS_EMISSAO_OFICIAL } from '../utils/cndStorage';
import { BrasaoPrefeitura } from '../components/shared/BrasaoPrefeitura';
import { getFavoritosIds, toggleFavoritoOportunidade, isOportunidadeFavorita } from '../utils/favoritosStorage';

interface MensagemChatLocal {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audioDuration?: string;
  sugestaoAcao?: {
    tipo: 'documento' | 'licitacao' | 'link';
    titulo: string;
    payload?: string;
  };
}

export function SosIA() {
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<Empresa>(getEmpresaAtiva());
  const [activeTab, setActiveTab] = useState<'chat' | 'documentos' | 'onde_tirar' | 'avisos'>('chat');
  const [favoritosIds, setFavoritosIds] = useState<string[]>(getFavoritosIds());
  
  // Estado do Chat & Áudio
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Estado da Elaboração de Documentos
  const [tipoDocumentoSelecionado, setTipoDocumentoSelecionado] = useState<'me_epp' | 'impedimento' | 'proposta' | 'habilitacao'>('me_epp');
  const [docCopied, setDocCopied] = useState(false);

  // Sincronização de Favoritos
  useEffect(() => {
    const handleFavs = (e: any) => {
      setFavoritosIds(e.detail?.ids || getFavoritosIds());
    };
    window.addEventListener('favoritos_alterados', handleFavs);
    return () => window.removeEventListener('favoritos_alterados', handleFavs);
  }, []);

  const handleToggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoritoOportunidade(id);
  };

  // APENAS AS LICITAÇÕES FAVORITADAS PELO USUÁRIO NO FEED
  const licitacoesFavoritadas = mockOportunidades.filter(op => 
    favoritosIds.includes(op.id) || (op.numeroControlePNCP && favoritosIds.includes(op.numeroControlePNCP))
  );

  // Histórico de Mensagens
  const [messages, setMessages] = useState<MensagemChatLocal[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Olá, ${empresa.nomeFantasia || empresa.razaoSocial}! Sou o SOS Copiloto IA do Licita Aí. Estou aqui para te ajudar em tudo sobre licitações:
• Elaborar declarações e propostas comerciais sob medida;
• Avisar quando e onde serão as licitações do seu segmento;
• Ensinar o passo a passo de onde emitir cada certidão obrigatória.

Você pode me mandar uma mensagem de texto ou clicar no microfone para falar comigo!`,
      timestamp: new Date().toISOString()
    }
  ]);

  useEffect(() => {
    const handleEmpresaAlterada = (e: any) => {
      setEmpresa(e.detail || getEmpresaAtiva());
    };
    window.addEventListener('empresa_alterada', handleEmpresaAlterada);
    return () => window.removeEventListener('empresa_alterada', handleEmpresaAlterada);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Controle de Gravação de Áudio
  const startRecording = () => {
    setIsRecording(true);
    setRecordSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingAndSend = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    const duracaoFormatada = `00:${recordSeconds < 10 ? '0' : ''}${recordSeconds}`;

    // Simulação inteligente de transcrição de áudio do pequeno empresário
    const perguntasAudioExemplos = [
      "Quero saber quando vai ser a licitação de pães e merenda em Leopoldina e onde emito a certidão da Receita Federal?",
      "Gere para mim a declaração de ME e EPP para eu colocar na minha proposta de hoje.",
      "Onde tiro a Certidão Negativa de Débitos Trabalhistas do TST?",
      "Qual é o prazo limite para entregar a proposta no pregão de Cataguases?"
    ];
    const textoTranscrito = perguntasAudioExemplos[Math.floor(Math.random() * perguntasAudioExemplos.length)];

    const novaMensagemUsuario: MensagemChatLocal = {
      id: Date.now().toString(),
      role: 'user',
      content: `🎤 Áudio gravado (${duracaoFormatada}): "${textoTranscrito}"`,
      timestamp: new Date().toISOString(),
      audioDuration: duracaoFormatada
    };

    setMessages(prev => [...prev, novaMensagemUsuario]);

    // Resposta contextual do copiloto
    setTimeout(() => {
      let resposta = '';
      if (textoTranscrito.includes('quando vai ser')) {
        resposta = `📅 **Aviso de Licitação em Leopoldina/MG:**\n\nA **Dispensa Eletrônica nº 012/2026** (Gêneros de Padaria e Merenda) ocorrerá no dia **02 de Outubro de 2026 às 09:00h**.\n\n⚠️ **Atenção ao Prazo:** O envio de propostas encerra às **08:30h do mesmo dia**!\n\nPara a **Certidão da Receita Federal (PGFN)**, você emite no portal oficial sem custo algum. Acesse a aba **"Onde Tirar Documentos"** acima para o link direto.`;
      } else if (textoTranscrito.includes('declaração de ME')) {
        resposta = `✅ **Declaração de ME/EPP Elaborada!**\n\nJá preparei a sua declaração oficial com base na **Lei Complementar nº 123/2006**, preenchida com o CNPJ ${empresa.cnpj} da **${empresa.razaoSocial}**.\n\nVocê pode visualizá-la e copiá-la na aba **"Elaborar Documentos"** acima!`;
      } else if (textoTranscrito.includes('Trabalhistas')) {
        resposta = `⚖️ **Certidão Trabalhista (CNDT / TST):**\n\nVocê pode emitir gratuitamente no site do Tribunal Superior do Trabalho em menos de 1 minuto, informando apenas o CNPJ ${empresa.cnpj}.\n\nClique na aba **"Onde Tirar Documentos"** aqui no SOS IA que te levo direto para a página de emissão.`;
      } else {
        resposta = `Entendido! Analisei sua solicitação com base na Nova Lei de Licitações (14.133/2021). Para ${empresa.nomeFantasia || 'sua empresa'}, as certidões necessárias já estão mapeadas e sua declaração de ME/EPP já está disponível para download.`;
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resposta,
        timestamp: new Date().toISOString()
      }]);
    }, 1200);
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordSeconds(0);
  };

  // Envio de Texto
  const handleSendText = (textoManual?: string) => {
    const textToSend = textoManual || inputText;
    if (!textToSend.trim()) return;

    const novaMensagem: MensagemChatLocal = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, novaMensagem]);
    if (!textoManual) setInputText('');

    setTimeout(() => {
      let resposta = '';
      const t = textToSend.toLowerCase();

      if (t.includes('onde') && (t.includes('tirar') || t.includes('emit') || t.includes('certid'))) {
        resposta = `🏛️ **Onde emitir seus documentos:**\n\n1. **Receita Federal & PGFN:** No portal Regularize / Receita (Validade: 180 dias);\n2. **Trabalhista (CNDT):** No portal do TST (Gratuito, emissão imediata);\n3. **FGTS (CRF):** No site da Caixa Econômica Federal;\n4. **Estadual (SEF/MG):** No SIARE da Secretaria da Fazenda de Minas Gerais;\n5. **Municipal:** Na Prefeitura de ${empresa.municipio || 'sua sede'}.\n\n👉 *Veja os botões com links diretos na aba **"Onde Tirar Documentos"** acima!*`;
      } else if (t.includes('quando') || t.includes('data') || t.includes('prazo') || t.includes('aviso')) {
        resposta = `⏰ **Próximas Licitações na sua Região:**\n\n• **Leopoldina/MG:** Dispensa nº 012/2026 — Abertura em **02/10/2026 às 09:00h** (Valor: R$ 18.500);\n• **Cataguases/MG:** Pregão nº 005/2026 — Disputa em **06/10/2026 às 10:00h**;\n• **Além Paraíba/MG:** Dispensa nº 018/2026 — Abertura em **09/10/2026 às 14:00h**.\n\n👉 *Consulte a contagem regressiva detalhada na aba **"Avisos & Prazos"**.*`;
      } else if (t.includes('declara') || t.includes('modelo') || t.includes('me/epp') || t.includes('proposta')) {
        resposta = `📝 **Elaboração de Documentos:**\n\nPronto! Já gerei a minuta oficial com os dados da **${empresa.razaoSocial}** (CNPJ: ${empresa.cnpj}).\n\nAbra a aba **"Elaborar Documentos"** logo acima para copiar o texto pronto ou baixar para imprimir e assinar!`;
      } else {
        resposta = `Olá! Com base na Lei 14.133/2021, como empresa classificada no segmento **${empresa.categoriaNome || 'Alimentos'}** em **${empresa.municipio || 'Leopoldina'}/${empresa.uf || 'MG'}**, você possui direito ao tratamento favorecido da Lei Complementar nº 123/2006 (desempate ficto e prioridade de contratação até R$ 80.000 em compras exclusivas).\n\nPosso te ajudar a gerar sua proposta comercial, suas declarações de habilitação ou tirar dúvidas sobre o edital!`;
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resposta,
        timestamp: new Date().toISOString()
      }]);
    }, 900);
  };

  // Gerador de Modelos de Documento
  const getDocumentoTexto = (tipo: string) => {
    const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const cidade = `${empresa.municipio || 'Leopoldina'} - ${empresa.uf || 'MG'}`;

    if (tipo === 'me_epp') {
      return `DECLARAÇÃO DE ENQUADRAMENTO COMO MICROEMPRESA OU EMPRESA DE PEQUENO PORTE
(Nos termos da Lei Complementar nº 123/2006)

À
Comissão de Contratação / Agente de Contratação
Prefeitura Municipal de ${empresa.municipio || 'Leopoldina'}/${empresa.uf || 'MG'}

A empresa ${empresa.razaoSocial.toUpperCase()}, inscrita no CNPJ/MF sob o nº ${empresa.cnpj}, com sede em ${empresa.endereco || 'Avenida Principal, Centro'}, por intermédio de seu representante legal devidamente constituído:

DECLARA, sob as penas da lei e em conformidade com o artigo 3º da Lei Complementar nº 123/2006 e alterações da Lei Complementar nº 147/2014, que:

1. Está enquadrada como MICROEMPRESA (ME) / EMPRESA DE PEQUENO PORTE (EPP);
2. Não se encontra incursa em nenhuma das vedações previstas no § 4º do artigo 3º da Lei Complementar nº 123/2006;
3. Cumpre os requisitos legais para a obtenção dos benefícios previstos nos artigos 42 a 49 da Lei Complementar nº 123/2006 e na Lei Federal nº 14.133/2021;
4. Sua receita bruta anual não ultrapassou o limite legal estabelecido em lei no ano-calendário anterior.

Por ser a expressão da verdade, firmamos a presente declaração.

${cidade}, ${dataHoje}.

___________________________________________________________
${empresa.razaoSocial.toUpperCase()}
CNPJ: ${empresa.cnpj}
Representante Legal`;
    }

    if (tipo === 'impedimento') {
      return `DECLARAÇÃO DE INEXISTÊNCIA DE FATOS IMPEDITIVOS E NÃO EMPREGO DE MENORES
(Art. 7º, XXXIII da Constituição Federal e Lei nº 14.133/2021)

A empresa ${empresa.razaoSocial.toUpperCase()}, inscrita no CNPJ sob o nº ${empresa.cnpj}, sediada em ${cidade}, por intermédio de seu representante legal, declara que:

1. Até a presente data, inexistem fatos supervenientes impeditivos para a sua habilitação jurídica e técnica no certame licitatório, ciente da obrigatoriedade de declarar ocorrências posteriores;
2. Não foi declarada inidônea para licitar ou contratar com a Administração Pública de qualquer esfera de governo;
3. Não emprega menor de dezoito anos em trabalho noturno, perigoso ou insalubre e não emprega menor de dezesseis anos, salvo na condição de aprendiz, a partir de quatorze anos, nos termos do inciso XXXIII do artigo 7º da Constituição Federal de 1988;
4. Não possui em seu quadro societário cônjuge, companheiro ou parente em linha reta ou colateral até o terceiro grau de agentes públicos do órgão licitante que atuem na condução deste processo.

${cidade}, ${dataHoje}.

___________________________________________________________
${empresa.razaoSocial.toUpperCase()}
CNPJ: ${empresa.cnpj}`;
    }

    if (tipo === 'habilitacao') {
      return `DECLARAÇÃO DE CUMPRIMENTO DOS REQUISITOS DE HABILITAÇÃO
(Artigo 63, inciso I da Lei Federal nº 14.133/2021)

À
Prefeitura Municipal / Órgão Licitante

A empresa ${empresa.razaoSocial.toUpperCase()}, inscrita no CNPJ sob o nº ${empresa.cnpj}, com sede em ${cidade}, DECLARA formalmente que atende plenamente a todos os requisitos de habilitação exigidos no instrumento convocatório (edital) e anexos, possuindo capacidade técnica, regularidade fiscal, jurídica e trabalhista vigentes.

Ciente de que a falsidade da presente declaração configurará infração administrativa, sujeitando o infrator às sanções de impedimento de licitar e declaração de inidoneidade, sem prejuízo das responsabilidades civis e criminais cabíveis.

${cidade}, ${dataHoje}.

___________________________________________________________
${empresa.razaoSocial.toUpperCase()}
CNPJ: ${empresa.cnpj}`;
    }

    // Proposta Comercial
    return `PROPOSTA COMERCIAL DE FORNECIMENTO
(Conforme Especificações do Edital)

À PREFEITURA MUNICIPAL DE ${empresa.municipio ? empresa.municipio.toUpperCase() : 'LEOPOLDINA'}
A/C: Agente de Contratação / Equipe de Apoio

DADOS DO PROPONENTE:
Razão Social: ${empresa.razaoSocial}
Nome Fantasia: ${empresa.nomeFantasia || empresa.razaoSocial}
CNPJ: ${empresa.cnpj}
Endereço: ${empresa.endereco || 'Zona Urbana'} - ${cidade}
Segmento: ${empresa.categoriaNome || 'Comércio & Serviços'}

Vimos por meio desta apresentar nossa Proposta Comercial para atendimento ao objeto licitado, conforme discriminação a seguir:

ITENS E PREÇOS OFERTADOS:
Item 01: Pães especiais e gêneros alimentícios artesanais frescos de primeira qualidade
Quantidade: Conforme Termo de Referência
Marca/Origem: Fabricação Própria / Produção Regional
Valor Unitário: R$ 14,50 / Kg
Valor Total Estimado: R$ 18.500,00 (Dezoito mil e quinhentos reais)

CONDIÇÕES GERAIS:
1. Validade da Proposta: 60 (sessenta) dias a contar da data de abertura do certame;
2. Condições de Pagamento: Conforme estabelecido em edital (30 dias após ateste da Nota Fiscal);
3. Prazo de Entrega: Imediato / Fracionado em até 24 horas após expedição da Ordem de Fornecimento;
4. No preço ofertado estão inclusos todos os tributos, encargos trabalhistas, previdenciários, fiscais, fretes e frete regional.

${cidade}, ${dataHoje}.

___________________________________________________________
${empresa.razaoSocial.toUpperCase()}
CNPJ: ${empresa.cnpj}`;
  };

  const handleCopyDocumento = () => {
    const texto = getDocumentoTexto(tipoDocumentoSelecionado);
    navigator.clipboard.writeText(texto);
    setDocCopied(true);
    setTimeout(() => setDocCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    const texto = getDocumentoTexto(tipoDocumentoSelecionado);
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Declaracao_${tipoDocumentoSelecionado}_${empresa.cnpj.replace(/\D/g, '')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Botão Superior de Voltar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/feed')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-bold text-[#01203C] hover:text-[#FB8B03] shadow-2xs transition-all cursor-pointer active:scale-95 group"
          title="Voltar para o Feed de Oportunidades"
        >
          <ArrowLeft size={16} className="text-[#FB8B03] group-hover:-translate-x-1 transition-transform" />
          <span>Voltar para as Oportunidades</span>
        </button>

        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Licita Aí &gt; SOS Copiloto IA
        </span>
      </div>

      {/* Banner Principal em Marinho Institucional */}
      <div className="bg-[#01203C] text-white p-6 sm:p-7 rounded-3xl shadow-sm relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#FB8B03]/20 via-transparent to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#FB8B03] text-[#01203C] flex items-center justify-center font-black">
                <Sparkles size={18} />
              </div>
              <span className="text-xs font-bold bg-white/15 px-3 py-0.5 rounded-full text-white">
                Inteligência Artificial Oficial B2G
              </span>
            </div>
            <h1 
              className="text-2xl sm:text-3xl font-black text-white tracking-tight"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              SOS Copiloto IA
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Fale ou digite suas dúvidas, elabore documentos e declarações prontas para assinar, consulte onde emitir certidões e veja as datas exatas dos certames.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto bg-white/10 p-2 rounded-2xl border border-white/15">
            <div className="w-3 h-3 rounded-full bg-[#1E8E5A] animate-pulse"></div>
            <span className="text-xs font-bold text-white">Copiloto Online</span>
          </div>
        </div>
      </div>

      {/* 4 Abas do SOS IA: Chat por Voz, Elaborar Documentos, Onde Tirar, Avisos de Prazos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`p-3.5 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none touch-manipulation active:scale-95 border ${
            activeTab === 'chat'
              ? 'bg-[#01203C] text-white border-[#01203C] shadow-sm'
              : 'bg-white text-slate-600 hover:text-[#01203C] border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-1">
            <Mic size={16} className={activeTab === 'chat' ? 'text-[#FB8B03]' : 'text-slate-400'} />
            <MessageSquare size={16} className={activeTab === 'chat' ? 'text-white' : 'text-slate-400'} />
          </div>
          <span>1. Falar / Digitar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documentos')}
          className={`p-3.5 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none touch-manipulation active:scale-95 border ${
            activeTab === 'documentos'
              ? 'bg-[#01203C] text-white border-[#01203C] shadow-sm'
              : 'bg-white text-slate-600 hover:text-[#01203C] border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText size={16} className={activeTab === 'documentos' ? 'text-[#FB8B03]' : 'text-slate-400'} />
          <span>2. Elaborar Documentos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('onde_tirar')}
          className={`p-3.5 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none touch-manipulation active:scale-95 border ${
            activeTab === 'onde_tirar'
              ? 'bg-[#01203C] text-white border-[#01203C] shadow-sm'
              : 'bg-white text-slate-600 hover:text-[#01203C] border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BookOpen size={16} className={activeTab === 'onde_tirar' ? 'text-[#FB8B03]' : 'text-slate-400'} />
          <span>3. Onde Tirar Certidões</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('avisos')}
          className={`p-3.5 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none touch-manipulation active:scale-95 border relative ${
            activeTab === 'avisos'
              ? 'bg-[#01203C] text-white border-[#01203C] shadow-sm'
              : 'bg-white text-slate-600 hover:text-[#01203C] border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-1">
            <Heart size={15} className={activeTab === 'avisos' ? 'text-[#FB8B03] fill-[#FB8B03]' : (licitacoesFavoritadas.length > 0 ? 'text-rose-500 fill-rose-500' : 'text-slate-400')} />
            <Calendar size={15} className={activeTab === 'avisos' ? 'text-white' : 'text-slate-400'} />
          </div>
          <span>4. Quando vai ser? ({licitacoesFavoritadas.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: CHAT INTELIGENTE COM SUPORTE A VOZ E ÁUDIO         */}
      {/* ======================================================== */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Header do Chat */}
          <div className="p-4 border-b border-slate-100 bg-[#F7F8FA] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#01203C] text-[#FB8B03] flex items-center justify-center shadow-xs">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#01203C]">Atendente Inteligente de Licitações</h3>
                <span className="text-[11px] text-slate-500 font-medium">Fale pelo microfone ou digite sua pergunta</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <Sparkles size={13} className="text-[#FB8B03]" />
              <span>Lei 14.133/2021 & LC 123/06</span>
            </div>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div key={msg.id} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 shadow-2xs ${
                    isAssistant
                      ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                      : 'bg-[#01203C] text-white rounded-tr-xs'
                  }`}>
                    {isAssistant && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-[#FB8B03]">
                        <Bot size={13} />
                        <span>Copiloto Licita Aí</span>
                      </div>
                    )}

                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
                      {msg.content}
                    </div>

                    <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.audioDuration && (
                        <span className="flex items-center gap-1 text-[#FB8B03] font-bold">
                          <Volume2 size={11} />
                          <span>{msg.audioDuration}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Sugestões Rápidas de 1 Toque */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Perguntas Rápidas:</span>
            <button
              onClick={() => handleSendText("Onde tiro a Certidão Negativa de Débitos Trabalhistas do TST?")}
              className="text-[11px] font-semibold bg-[#F7F8FA] hover:bg-slate-100 text-[#01203C] px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 transition-colors cursor-pointer"
            >
              🏛️ Onde tiro a CND do TST?
            </button>
            <button
              onClick={() => handleSendText("Gere para mim a declaração de ME e EPP para eu colocar na minha proposta")}
              className="text-[11px] font-semibold bg-[#F7F8FA] hover:bg-slate-100 text-[#01203C] px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 transition-colors cursor-pointer"
            >
              📝 Gerar Declaração ME/EPP
            </button>
            <button
              onClick={() => handleSendText("Quando vai ser a próxima licitação de alimentação em Leopoldina?")}
              className="text-[11px] font-semibold bg-[#F7F8FA] hover:bg-slate-100 text-[#01203C] px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 transition-colors cursor-pointer"
            >
              ⏰ Quando vai ser a próxima licitação?
            </button>
          </div>

          {/* Área de Entrada: Gravação de Áudio + Digitação */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
            {isRecording ? (
              /* Interface ativa de gravação de áudio com animação de onda sonora */
              <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-2xl animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-rose-600 animate-ping"></div>
                  <div>
                    <span className="text-xs font-bold text-rose-900 block">Gravando sua voz com o microfone...</span>
                    <span className="text-[11px] text-rose-700 font-mono">00:{recordSeconds < 10 ? '0' : ''}{recordSeconds} segundos</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelRecording}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={stopRecordingAndSend}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Send size={13} />
                    <span>Concluir e Enviar Áudio</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Interface Normal de Texto e Botão de Áudio */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-3 bg-[#FB8B03]/15 hover:bg-[#FB8B03]/25 text-[#D97602] hover:text-[#01203C] border border-[#FB8B03]/30 rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 text-xs font-bold shrink-0"
                  title="Clique para falar sua dúvida por áudio"
                >
                  <Mic size={17} />
                  <span className="hidden sm:inline">Falar por Áudio</span>
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder="Digite sua dúvida ou peça um documento (ex: onde tiro CND do FGTS?)..."
                  className="flex-1 p-3 bg-[#F7F8FA] border border-slate-200 rounded-2xl focus:border-[#01203C] focus:ring-2 focus:ring-[#01203C]/10 outline-none text-xs sm:text-sm text-[#01203C]"
                />

                <button
                  type="button"
                  onClick={() => handleSendText()}
                  disabled={!inputText.trim()}
                  className="p-3 bg-[#01203C] hover:bg-[#032F52] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title="Enviar mensagem"
                >
                  <Send size={16} className="text-[#FB8B03]" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: ELABORAÇÃO AUTOMÁTICA DE DOCUMENTOS                */}
      {/* ======================================================== */}
      {activeTab === 'documentos' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h2 
              className="text-lg font-black text-[#01203C] tracking-tight mb-1"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Gerador de Documentos e Declarações Oficiais
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mb-4">
              O Copiloto preenche automaticamente todos os dados da sua empresa ({empresa.razaoSocial}, CNPJ {empresa.cnpj}) em conformidade com as exigências da Lei nº 14.133/2021.
            </p>

            {/* Seleção do Tipo de Documento */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6">
              <button
                onClick={() => setTipoDocumentoSelecionado('me_epp')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  tipoDocumentoSelecionado === 'me_epp'
                    ? 'border-[#01203C] bg-[#01203C] text-white shadow-xs'
                    : 'border-slate-200 bg-[#F7F8FA] hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Lei 123/06</span>
                <span className="text-xs font-bold block mt-0.5">Declaração ME / EPP</span>
              </button>

              <button
                onClick={() => setTipoDocumentoSelecionado('impedimento')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  tipoDocumentoSelecionado === 'impedimento'
                    ? 'border-[#01203C] bg-[#01203C] text-white shadow-xs'
                    : 'border-slate-200 bg-[#F7F8FA] hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">CF / Art. 7º</span>
                <span className="text-xs font-bold block mt-0.5">Fato Impeditivo & Menor</span>
              </button>

              <button
                onClick={() => setTipoDocumentoSelecionado('habilitacao')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  tipoDocumentoSelecionado === 'habilitacao'
                    ? 'border-[#01203C] bg-[#01203C] text-white shadow-xs'
                    : 'border-slate-200 bg-[#F7F8FA] hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Lei 14.133</span>
                <span className="text-xs font-bold block mt-0.5">Cumprimento Habilitação</span>
              </button>

              <button
                onClick={() => setTipoDocumentoSelecionado('proposta')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  tipoDocumentoSelecionado === 'proposta'
                    ? 'border-[#01203C] bg-[#01203C] text-white shadow-xs'
                    : 'border-slate-200 bg-[#F7F8FA] hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Comercial</span>
                <span className="text-xs font-bold block mt-0.5">Modelo de Proposta</span>
              </button>
            </div>

            {/* Barra de Ações do Documento */}
            <div className="flex items-center justify-between mb-3 pt-3 border-t border-slate-100 flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-[#1E8E5A]" />
                <span>Preenchido com os dados do CNPJ {empresa.cnpj}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDocumento}
                  className="px-3.5 py-1.5 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  {docCopied ? <Check size={14} className="text-[#1E8E5A]" /> : <Copy size={14} className="text-[#FB8B03]" />}
                  <span>{docCopied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <button
                  onClick={handleDownloadTxt}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-[#01203C] border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <Download size={14} className="text-[#FB8B03]" />
                  <span>Baixar Arquivo</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Imprimir documento"
                >
                  <Printer size={14} />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
              </div>
            </div>

            {/* Visualizador de Folha Timbrada */}
            <div className="p-6 sm:p-8 bg-[#F7F8FA] border border-slate-200 rounded-2xl font-mono text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line shadow-inner max-h-[480px] overflow-y-auto">
              {getDocumentoTexto(tipoDocumentoSelecionado)}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: GUIA PASSO A PASSO "ONDE TIRAR CADA DOCUMENTO"    */}
      {/* ======================================================== */}
      {activeTab === 'onde_tirar' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs mb-4">
            <h2 
              className="text-lg font-black text-[#01203C] tracking-tight mb-1"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Onde e Como Tirar Cada Certidão Obrigatória
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              Todas as certidões necessárias para participar de licitações públicas com links oficiais diretos, instruções de emissão e prazos de validade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Receita Federal */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-white bg-[#01203C] px-2.5 py-0.5 rounded-full">
                    Esfera Federal
                  </span>
                  <span className="text-xs font-bold text-[#1E8E5A]">Validade: 180 dias</span>
                </div>
                <h3 className="font-bold text-sm text-[#01203C] mb-1">
                  Certidão Conjunta Federal e Dívida Ativa da União (Receita/PGFN)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Comprova regularidade dos tributos federais e previdenciários (INSS).
                </p>
                <div className="text-xs text-slate-700 space-y-1 mb-4 bg-[#F7F8FA] p-3 rounded-xl">
                  <p>• <strong>Onde tira:</strong> Portal da Receita Federal / Regularize.</p>
                  <p>• <strong>Custo:</strong> Gratuito e 100% online.</p>
                  <p>• <strong>O que precisa:</strong> Apenas o número do seu CNPJ ({empresa.cnpj}).</p>
                </div>
              </div>

              <a
                href={LINKS_EMISSAO_OFICIAL.federal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
              >
                <span>Acessar Portal da Receita Federal</span>
                <ExternalLink size={13} className="text-[#FB8B03]" />
              </a>
            </div>

            {/* 2. CNDT Trabalhista */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-white bg-[#01203C] px-2.5 py-0.5 rounded-full">
                    Justiça do Trabalho
                  </span>
                  <span className="text-xs font-bold text-[#1E8E5A]">Validade: 180 dias</span>
                </div>
                <h3 className="font-bold text-sm text-[#01203C] mb-1">
                  Certidão Negativa de Débitos Trabalhistas (CNDT / TST)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Comprova que a empresa não possui condenações trabalhistas pendentes de pagamento.
                </p>
                <div className="text-xs text-slate-700 space-y-1 mb-4 bg-[#F7F8FA] p-3 rounded-xl">
                  <p>• <strong>Onde tira:</strong> Portal Oficial do Tribunal Superior do Trabalho (TST).</p>
                  <p>• <strong>Tempo:</strong> Emissão imediata na tela em menos de 1 minuto.</p>
                  <p>• <strong>Dica:</strong> Pode emitir a 2ª via a qualquer momento.</p>
                </div>
              </div>

              <a
                href={LINKS_EMISSAO_OFICIAL.trabalhista.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
              >
                <span>Acessar Portal do TST Oficial</span>
                <ExternalLink size={13} className="text-[#FB8B03]" />
              </a>
            </div>

            {/* 3. FGTS Caixa */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-white bg-[#01203C] px-2.5 py-0.5 rounded-full">
                    Caixa Econômica
                  </span>
                  <span className="text-xs font-bold text-amber-600">Validade: 30 dias</span>
                </div>
                <h3 className="font-bold text-sm text-[#01203C] mb-1">
                  Certificado de Regularidade do FGTS (CRF / Caixa)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Atesta o recolhimento regular do Fundo de Garantia por Tempo de Serviço dos empregados.
                </p>
                <div className="text-xs text-slate-700 space-y-1 mb-4 bg-[#F7F8FA] p-3 rounded-xl">
                  <p>• <strong>Onde tira:</strong> Sistema Consulta Regularidade do Empregador da Caixa.</p>
                  <p>• <strong>Atenção:</strong> Vence a cada 30 dias. Recomendamos atualizar mensalmente.</p>
                </div>
              </div>

              <a
                href={LINKS_EMISSAO_OFICIAL.fgts.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
              >
                <span>Acessar Portal do FGTS da Caixa</span>
                <ExternalLink size={13} className="text-[#FB8B03]" />
              </a>
            </div>

            {/* 4. Estadual SEF/MG */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-white bg-[#01203C] px-2.5 py-0.5 rounded-full">
                    Esfera Estadual
                  </span>
                  <span className="text-xs font-bold text-[#1E8E5A]">Validade: 90 dias</span>
                </div>
                <h3 className="font-bold text-sm text-[#01203C] mb-1">
                  Certidão Negativa de Débitos Estaduais (SEF/MG SIARE)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Comprova a regularidade do ICMS e tributos de Minas Gerais.
                </p>
                <div className="text-xs text-slate-700 space-y-1 mb-4 bg-[#F7F8FA] p-3 rounded-xl">
                  <p>• <strong>Onde tira:</strong> Sistema Integrado de Administração da Receita Estadual (SIARE).</p>
                  <p>• <strong>Gratuito:</strong> Consulta pública via CNPJ ou Inscrição Estadual.</p>
                </div>
              </div>

              <a
                href={LINKS_EMISSAO_OFICIAL.estadual.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
              >
                <span>Acessar Portal SEF/MG (SIARE)</span>
                <ExternalLink size={13} className="text-[#FB8B03]" />
              </a>
            </div>

            {/* 5. Municipal */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-white bg-[#01203C] px-2.5 py-0.5 rounded-full">
                    Esfera Municipal
                  </span>
                  <span className="text-xs font-bold text-slate-600">Validade: 60 a 90 dias</span>
                </div>
                <h3 className="font-bold text-sm text-[#01203C] mb-1">
                  Certidão Negativa Municipal (Tributos & ISS)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Atesta regularidade com IPTU, ISSQN e taxas da Prefeitura de {empresa.municipio || 'Leopoldina'}.
                </p>
                <div className="text-xs text-slate-700 space-y-1 mb-4 bg-[#F7F8FA] p-3 rounded-xl">
                  <p>• <strong>Onde tira:</strong> Portal de Serviços da Prefeitura Municipal de {empresa.municipio || 'Leopoldina'}.</p>
                  <p>• <strong>Dica:</strong> Procure pela aba "Tributos / Certidão Negativa Web".</p>
                </div>
              </div>

              <a
                href={LINKS_EMISSAO_OFICIAL.municipal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
              >
                <span>Acessar Prefeitura de {empresa.municipio || 'Leopoldina'}</span>
                <ExternalLink size={13} className="text-[#FB8B03]" />
              </a>
            </div>

            {/* 6. Falência e Recuperação Judicial */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-white bg-[#01203C] px-2.5 py-0.5 rounded-full">
                    Poder Judiciário
                  </span>
                  <span className="text-xs font-bold text-slate-600">Validade: 90 dias</span>
                </div>
                <h3 className="font-bold text-sm text-[#01203C] mb-1">
                  Certidão de Falência, Concordata e Recuperação Judicial
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Exigida em licitações de maior vulto para comprovar saúde econômico-financeira.
                </p>
                <div className="text-xs text-slate-700 space-y-1 mb-4 bg-[#F7F8FA] p-3 rounded-xl">
                  <p>• <strong>Onde tira:</strong> No Distribuidor do Fórum da Comarca da sua sede ou pelo portal TJMG / TJRJ.</p>
                </div>
              </div>

              <a
                href="https://www.tjmg.jus.br"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#01203C] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Acessar Portal do TJMG</span>
                <ExternalLink size={13} className="text-[#FB8B03]" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: AVISOS DE LICITAÇÃO ("QUANDO VAI SER?")            */}
      {/* (EXCLUSIVO PARA LICITAÇÕES FAVORITADAS COM O CORAÇÃO)     */}
      {/* ======================================================== */}
      {activeTab === 'avisos' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-200/60 shadow-2xs">
                    <Heart size={17} className="fill-rose-500" />
                  </div>
                  <h2 
                    className="text-lg font-black text-[#01203C] tracking-tight"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    Radar de Datas: Suas Licitações Favoritadas
                  </h2>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm">
                  Aqui você acompanha a data exata de abertura e prazo de propostas <strong>apenas das licitações que você favoritou no Feed</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#F7F8FA] border border-slate-200 text-[#01203C] flex items-center gap-1.5">
                  <Heart size={14} className="fill-rose-500 text-rose-500" />
                  <span>{licitacoesFavoritadas.length} acompanhadas</span>
                </span>
                <button
                  onClick={() => navigate('/feed')}
                  className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-[#01203C] hover:bg-[#032F52] text-white transition-colors cursor-pointer"
                >
                  + Favoritar mais no Feed
                </button>
              </div>
            </div>
          </div>

          {licitacoesFavoritadas.length === 0 ? (
            /* Estado Vazio Amigável Conforme Instrução do Usuário */
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl mx-auto flex items-center justify-center border border-rose-100 shadow-2xs">
                <Heart size={32} className="stroke-[1.75]" />
              </div>

              <div className="max-w-md mx-auto">
                <h3 
                  className="text-lg font-black text-[#01203C] tracking-tight"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  Nenhuma licitação favoritada ainda
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  Para acompanhar aqui quando vai ser cada disputa, vá até o <strong>Feed de Oportunidades</strong> e clique no ícone de <strong>coração (❤️)</strong> ao lado das licitações do seu interesse.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/feed')}
                  className="px-5 py-3 bg-[#FB8B03] hover:bg-[#D97602] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Heart size={16} className="fill-white" />
                  <span>Ir para o Feed e Favoritar Oportunidades</span>
                </button>
              </div>
            </div>
          ) : (
            /* Lista Exclusiva das Licitações Favoritadas */
            <div className="space-y-3">
              {licitacoesFavoritadas.map((op) => {
                const dataAberturaObj = new Date(op.dataAbertura);
                const dataEncerramentoObj = new Date(op.dataEncerramento);

                return (
                  <div 
                    key={op.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#01203C]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <BrasaoPrefeitura municipio={op.municipio} size="md" />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-[#01203C] text-white px-2 py-0.5 rounded-md">
                            {op.modalidade.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-[#01203C]">
                            {op.municipio.nome}/{op.municipio.uf}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            • {op.distanciaKm} km de você
                          </span>
                        </div>

                        <h3 className="font-bold text-xs sm:text-sm text-[#01203C] line-clamp-2 max-w-xl">
                          {op.objetoResumido}
                        </h3>

                        {/* Informações Claras de Quando vai ser */}
                        <div className="flex items-center gap-3 mt-2.5 flex-wrap text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            <Calendar size={13} className="text-[#FB8B03]" />
                            <span>Abertura: <strong>{dataAberturaObj.toLocaleDateString('pt-BR')} às {dataAberturaObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                          </div>

                          <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/60 font-semibold">
                            <Clock size={13} />
                            <span>Prazo Propostas: até {dataEncerramentoObj.toLocaleDateString('pt-BR')} às {dataEncerramentoObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Botão de Desfavoritar diretamente aqui */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFav(op.id, e)}
                        className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-500 transition-all cursor-pointer active:scale-95 shadow-2xs"
                        title="Remover das licitações favoritadas"
                      >
                        <Heart size={16} className="fill-rose-500" />
                      </button>

                      <button
                        onClick={() => navigate(`/edital/${op.id}`)}
                        className="px-4 py-2 bg-[#FB8B03] hover:bg-[#D97602] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>Ver Edital</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
