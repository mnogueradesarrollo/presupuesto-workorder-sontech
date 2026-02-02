import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import PresupuestoIT from "./pages/PresupuestoIT";
import OrdenPage from "./pages/Orden";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "react-hot-toast";
import "./index.css";
import "./styles/print.css";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/gestion" element={<Home />} />
          <Route path="/presupuesto-it" element={<PresupuestoIT />} />
          <Route path="/orden/:id" element={<OrdenPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
