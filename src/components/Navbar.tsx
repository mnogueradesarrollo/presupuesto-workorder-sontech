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
    <header className="nav-premium sticky-top shadow-sm">
      <div className="container-lg d-flex align-items-center justify-content-between h-100">
        {/* Brand */}
        <Link to="/" className="d-flex align-items-center">
          <img src={logoUrl} alt="Sontech" className="premium-logo" />
        </Link>

        {user && (
          <>
            {/* Hamburger Button */}
            <button
              className="btn btn-link link-dark d-md-none p-0 border-0"
              onClick={toggleMenu}
              aria-label="Menu"
            >
              <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-list'} fs-1`}></i>
            </button>

            {/* Links */}
            <nav className={`nav-menu-drawer ${isOpen ? 'show' : ''}`}>
              <div className="d-md-none d-flex justify-content-between align-items-center border-bottom pb-2 mb-3 w-100">
                <span className="small text-muted fw-bold text-uppercase">Navegación</span>
                <button className="btn btn-close btn-sm d-md-none" onClick={() => setIsOpen(false)}></button>
              </div>
              <NavLink
                to="/"
                end
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `nav-link-premium ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-speedometer2 me-2"></i> Dashboard
              </NavLink>

              <NavLink
                to="/gestion"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `nav-link-premium ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-collection me-2"></i> Gestión
              </NavLink>

              <NavLink
                to="/settings"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `nav-link-premium ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-gear me-2"></i> Ajustes
              </NavLink>

              <NavLink
                to="/presupuesto-it"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `btn btn-primary d-flex align-items-center gap-2 my-2 my-md-0 ms-md-2 ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-plus-lg"></i> <span>Presupuesto</span>
              </NavLink>

              <div className="mt-auto mt-md-0 pt-3 pt-md-0 border-top border-md-0">
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-danger d-flex align-items-center gap-2 border-0 bg-transparent shadow-none"
                >
                  <i className="bi bi-box-arrow-right"></i> <span>Salir</span>
                </button>
              </div>
            </nav>

            {/* Backdrop for Mobile */}
            {isOpen && <div className="nav-backdrop d-md-none" onClick={() => setIsOpen(false)}></div>}
          </>
        )}
      </div>
    </header>
  );
}
