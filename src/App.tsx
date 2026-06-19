import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProGate } from "@/components/ProGate";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Peladas from "./pages/Peladas";
import NovaPelada from "./pages/NovaPelada";
import PeladaDetail from "./pages/PeladaDetail";
import Jogadores from "./pages/Jogadores";
import JogadorDetail from "./pages/JogadorDetail";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import Perfil from "./pages/Perfil";
import Notificacoes from "./pages/Notificacoes";
import Feed from "./pages/Feed";
import Fuwitter from "./pages/Fuwitter";
import Futgram from "./pages/Futgram";
import Ajuda from "./pages/Ajuda";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import NotFound from "./pages/NotFound";
import PeladaVoting from "./pages/PeladaVoting";
import LegalTerms from "./pages/legal/LegalTerms";
import LegalPrivacy from "./pages/legal/LegalPrivacy";
import LegalCookies from "./pages/legal/LegalCookies";
import PrivacySettings from "./pages/PrivacySettings";
import { CookieBanner } from "./components/legal/CookieBanner";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fuwitter"
              element={
                <ProtectedRoute>
                  <Fuwitter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/futgram"
              element={
                <ProtectedRoute>
                  <Futgram />
                </ProtectedRoute>
              }
            />
            <Route
              path="/peladas"
              element={
                <ProtectedRoute>
                  <Peladas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/peladas/nova"
              element={
                <ProtectedRoute>
                  <NovaPelada />
                </ProtectedRoute>
              }
            />
            <Route
              path="/peladas/:peladaId"
              element={
                <ProtectedRoute>
                  <PeladaDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jogadores"
              element={
                <ProtectedRoute>
                  <Jogadores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jogadores/:jogadorId"
              element={
                <ProtectedRoute>
                  <JogadorDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute>
                  <ProGate>
                    <Financeiro />
                  </ProGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <ProGate>
                    <Relatorios />
                  </ProGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notificacoes"
              element={
                <ProtectedRoute>
                  <Notificacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Perfil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ajuda"
              element={
                <ProtectedRoute>
                  <Ajuda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout-success"
              element={
                <ProtectedRoute>
                  <CheckoutSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout-cancel"
              element={
                <ProtectedRoute>
                  <CheckoutCancel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/peladas/:peladaId/votacao/:occurrenceId"
              element={
                <ProtectedRoute>
                  <PeladaVoting />
                </ProtectedRoute>
              }
            />
            <Route path="/legal/termos" element={<LegalTerms />} />
            <Route path="/legal/privacidade" element={<LegalPrivacy />} />
            <Route path="/legal/cookies" element={<LegalCookies />} />
            <Route
              path="/configuracoes/privacidade"
              element={
                <ProtectedRoute>
                  <PrivacySettings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieBanner />
        </BrowserRouter>

      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
