import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import PresupuestoIT from "./pages/PresupuestoIT";
import OrdenPage from "./pages/Orden";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
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
            <Route path="/login" element={<Login />} />

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
