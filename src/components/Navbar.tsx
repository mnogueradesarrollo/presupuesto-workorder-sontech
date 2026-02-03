import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import logoUrl from "../assets/logotipo-sontech.png";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // No mostrar navbar en el login
  if (location.pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <header className="nav-premium px-4 sticky-top py-2" style={{ zIndex: 1000 }}>
      <div className="container-fluid d-flex align-items-center justify-content-between">
        {/* Brand */}
        <Link to="/" className="brand">
          <img src={logoUrl} alt="Logo" width={220} height="auto" style={{ objectFit: 'contain' }} />
        </Link>

        {user && (
          <>
            {/* Hamburger Button */}
            <button
              className="navbar-toggler d-md-none"
              onClick={toggleMenu}
              aria-label="Toggle navigation"
            >
              <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-list'} fs-2`}></i>
            </button>

            {/* Links */}
            <nav className={`links ms-auto d-flex align-items-center gap-2 ${isOpen ? 'show' : ''}`}>
              <NavLink
                to="/"
                end
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `nav-link-premium ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-speedometer2 me-1"></i> Dashboard
              </NavLink>
              <NavLink
                to="/gestion"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `nav-link-premium ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-collection me-1"></i> Gestión
              </NavLink>
              <NavLink
                to="/settings"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `nav-link-premium ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-gear me-1"></i> Ajustes
              </NavLink>
              <NavLink
                to="/presupuesto-it"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `btn btn-primary d-flex align-items-center gap-1 mx-2 ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-plus-lg"></i> Nuevo Presupuesto
              </NavLink>
              <button
                onClick={handleLogout}
                className="btn btn-light d-flex align-items-center gap-1 text-danger border-0 bg-transparent shadow-none"
              >
                <i className="bi bi-box-arrow-right fs-5"></i> <span>Salir</span>
              </button>
            </nav>
          </>
        )}
      </div>
    </header>
  );
}
