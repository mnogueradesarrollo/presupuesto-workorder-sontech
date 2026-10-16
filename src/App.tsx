import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Navbar />
        <main className="container-fluid p-0">
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/seguimiento/:codigo" element={<TrackingPublico />} />

            {/* Dashboard & Gestión Principal */}
            <Route path="/" element={
              <ProtectedRoute>
                <div className="container py-4">
                  <Dashboard />
                </div>
              </ProtectedRoute>
            } />

            <Route path="/gestion" element={
              <ProtectedRoute>
                <div className="container py-4">
                  <Home />
                </div>
              </ProtectedRoute>
            } />

            <Route path="/ordenes" element={
              <ProtectedRoute>
                <div className="container py-4">
                  <Home />
                </div>
              </ProtectedRoute>
            } />

            <Route path="/presupuestos" element={
              <ProtectedRoute>
                <div className="container py-4">
                  <Presupuestos />
                </div>
              </ProtectedRoute>
            } />

            <Route path="/presupuesto-it" element={
              <ProtectedRoute>
                <div className="container py-4">
                  <PresupuestoIT />
                </div>
              </ProtectedRoute>
            } />

            <Route path="/orden/:id" element={
              <ProtectedRoute>
                <div className="container py-4">
                  <OrdenPage />
                </div>
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
                <div className="container py-4">
                  <Settings />
                </div>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
