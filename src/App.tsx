import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';


// Páginas nuevas (usa el código que te pasé antes)
import PresupuestoIT from './pages/PresupuestoIT';
import OrdenPage from './pages/Orden';

// Opcional: tu navbar si ya lo tenés
import Navbar from './components/Navbar';

function App() {
  return (
    <BrowserRouter>
      {/** Si no tenés Navbar, podés quitar esta línea */}
      <Navbar />

      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/presupuesto-it" replace />} />
          <Route path="/presupuesto-it" element={<PresupuestoIT />} />
          <Route path="/orden/:id" element={<OrdenPage />} />
          <Route path="*" element={<Navigate to="/presupuesto-it" replace />} />
          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
