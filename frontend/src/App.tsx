import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Onboarding } from './pages/Onboarding';
import { FeedOportunidades } from './pages/FeedOportunidades';
import { DetalheEdital } from './pages/DetalheEdital';
import { CofreDigital } from './pages/CofreDigital';
import { CalculadoraMargem } from './pages/CalculadoraMargem';
import { SosIA } from './pages/SosIA';
import { KanbanOportunidades } from './pages/KanbanOportunidades';
import { PesquisaPrecos } from './pages/PesquisaPrecos';
import { BottomNavigation } from './components/mobile/BottomNavigation';
import { Sidebar } from './components/desktop/Sidebar';
import { TopNavbar } from './components/shared/TopNavbar';
import { SOSCopilotoModal } from './components/shared/SOSCopilotoModal';
import { MobileInstallBanner } from './components/mobile/MobileInstallBanner';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      window.scrollTo(0, 0);
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTop = 0;
      }
    } catch {
      // Fallback silencioso
    }
  }, [pathname]);

  return null;
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col md:flex-row md:h-screen md:overflow-hidden">
      {/* Sidebar Desktop Fixa (visível em telas md+) */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Coluna Principal de Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-hidden">
        <TopNavbar />
        
        {/* Banner de instalação PWA discreto no mobile */}
        <div className="md:hidden">
          <MobileInstallBanner />
        </div>

        {/* Área Principal de Conteúdo com rolagem própria e padding de segurança para não sobrepor abas inferiores */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Barra de Navegação Inferior Mobile (visível apenas abaixo de md) */}
      <BottomNavigation />
      <SOSCopilotoModal />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Layout persistente via Outlet — zero recarregamento/piscas ao trocar de aba */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<FeedOportunidades />} />
          <Route path="/kanban" element={<KanbanOportunidades />} />
          <Route path="/pesquisa-precos" element={<PesquisaPrecos />} />
          <Route path="/calculadora" element={<CalculadoraMargem />} />
          <Route path="/cofre" element={<CofreDigital />} />
          <Route path="/sos-ia" element={<SosIA />} />
          <Route path="/edital" element={<DetalheEdital />} />
          <Route path="/edital/*" element={<DetalheEdital />} />
          <Route path="/edital/:id" element={<DetalheEdital />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
