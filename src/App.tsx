import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Presupuestos from "./pages/Presupuestos";
import PresupuestoIT from "./pages/PresupuestoIT";
import OrdenPage from "./pages/Orden";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Clientes from "./pages/Clientes";
import Proveedores from "./pages/Proveedores";
import Productos from "./pages/Productos";
import Ventas from "./pages/Ventas";
import Equipos from "./pages/Equipos";
import Abonos from "./pages/Abonos";
import ConsumiblesScrap from "./pages/ConsumiblesScrap";
import BaseConocimiento from "./pages/BaseConocimiento";
import VisitasTecnicas from "./pages/VisitasTecnicas";
import BeneficiosPromo from "./pages/BeneficiosPromo";
import TrackingPublico from "./pages/TrackingPublico";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";
import "./index.css";
import "./styles/print.css";

function ViewportRouteReset() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ViewportRouteReset />
        <Toaster
          position="top-right"
          containerStyle={{ top: 14, left: 12, right: 12 }}
          toastOptions={{ style: { maxWidth: "calc(100vw - 24px)" } }}
        />
        <Navbar />
        <main className="app-main">
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/seguimiento/:codigo" element={<TrackingPublico />} />

            {/* Dashboard & Gestión Principal */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/gestion" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />

            <Route path="/ordenes" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />

            <Route path="/presupuestos" element={
              <ProtectedRoute>
                <Presupuestos />
              </ProtectedRoute>
            } />

            <Route path="/presupuesto-it" element={
              <ProtectedRoute>
                <PresupuestoIT />
              </ProtectedRoute>
            } />

            <Route path="/orden/:id" element={
              <ProtectedRoute>
                <OrdenPage />
              </ProtectedRoute>
            } />

            {/* Directorios & Comercial */}
            <Route path="/clientes" element={
              <ProtectedRoute>
                <Clientes />
              </ProtectedRoute>
            } />

            <Route path="/proveedores" element={
              <ProtectedRoute>
                <Proveedores />
              </ProtectedRoute>
            } />

            <Route path="/productos" element={
              <ProtectedRoute>
                <Productos />
              </ProtectedRoute>
            } />

            <Route path="/ventas" element={
              <ProtectedRoute>
                <Ventas />
              </ProtectedRoute>
            } />

            {/* Laboratorio & CMDB */}
            <Route path="/equipos" element={
              <ProtectedRoute>
                <Equipos />
              </ProtectedRoute>
            } />

            <Route path="/scrap" element={
              <ProtectedRoute>
                <ConsumiblesScrap />
              </ProtectedRoute>
            } />

            <Route path="/kb" element={
              <ProtectedRoute>
                <BaseConocimiento />
              </ProtectedRoute>
            } />

            <Route path="/visitas" element={
              <ProtectedRoute>
                <VisitasTecnicas />
              </ProtectedRoute>
            } />

            <Route path="/beneficios-promo" element={
              <ProtectedRoute>
                <BeneficiosPromo />
              </ProtectedRoute>
            } />

            <Route path="/abonos" element={
              <ProtectedRoute>
                <Abonos />
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
