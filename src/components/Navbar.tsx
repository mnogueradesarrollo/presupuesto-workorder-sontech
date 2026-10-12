import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import logoUrl from "../assets/logotipo-sontech.png";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // No mostrar navbar en el login o en el portal público de seguimiento
  if (location.pathname === '/login' || location.pathname.startsWith('/seguimiento')) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="nav-premium sticky-top shadow-sm">
      <div className="container-fluid px-3 px-md-4 d-flex align-items-center justify-content-between h-100">
        {/* Brand */}
        <Link to="/" className="d-flex align-items-center">
          <img src={logoUrl} alt="Sontech" className="premium-logo" style={{ height: '36px' }} />
        </Link>

        {user && (
          <>
            {/* Hamburger Button Mobile */}
            <button
              className="btn btn-link link-dark d-lg-none p-0 border-0"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Menu"
            >
              <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-list'} fs-1`}></i>
            </button>

            {/* Links / Desktop & Mobile Drawer */}
            <nav className={`nav-menu-drawer ${isOpen ? 'show' : ''}`}>
              <div className="d-lg-none d-flex justify-content-between align-items-center border-bottom pb-2 mb-3 w-100">
                <span className="small text-muted fw-bold text-uppercase">Sontech ERP & Lab</span>
                <button className="btn btn-close btn-sm d-lg-none" onClick={closeMenu}></button>
              </div>

              {/* Dashboard */}
              <NavLink
                to="/"
                end
                onClick={closeMenu}
                className={({ isActive }) => `nav-link-premium ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-speedometer2 me-1"></i> Dashboard
              </NavLink>

              {/* Taller & Laboratorio Dropdown */}
              <div className="dropdown d-inline-block">
                <button
                  className={`nav-link-premium dropdown-toggle border-0 bg-transparent ${
                    location.pathname.startsWith('/gestion') ||
                    location.pathname.startsWith('/equipos') ||
                    location.pathname.startsWith('/orden') ||
                    location.pathname.startsWith('/kb') ||
                    location.pathname.startsWith('/scrap') ||
                    location.pathname.startsWith('/visitas')
                      ? 'active'
                      : ''
                  }`}
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-tools me-1"></i> Taller & Lab
                </button>
                <ul className="dropdown-menu shadow-sm border-0">
                  <li>
                    <NavLink to="/gestion" onClick={closeMenu} className="dropdown-item small py-2">
                      <i className="bi bi-clipboard2-check me-2 text-primary"></i> Órdenes de Trabajo (OT)
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/equipos" onClick={closeMenu} className="dropdown-item small py-2">
                      <i className="bi bi-laptop me-2 text-info"></i> Equipos & CMDB (Seriales)
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/scrap" onClick={closeMenu} className="dropdown-item small py-2">
                      <i className="bi bi-recycle me-2 text-warning"></i> Consumibles & Despiece
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/kb" onClick={closeMenu} className="dropdown-item small py-2">
                      <i className="bi bi-journal-code me-2 text-success"></i> Base de Conocimiento (KB)
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/visitas" onClick={closeMenu} className="dropdown-item small py-2">
                      <i className="bi bi-calendar-event me-2 text-danger"></i> Visitas Técnicas & Domicilio
                    </NavLink>
                  </li>
                </ul>
              </div>

              {/* Comercial & Ventas Dropdown */}
              <div className="dropdown d-inline-block">
                <button
                  className={`nav-link-premium dropdown-toggle border-0 bg-transparent ${
                    location.pathname.startsWith('/ventas') ||
                    location.pathname.startsWith('/clientes') ||
                    location.pathname.startsWith('/abonos')
                      ? 'active'
                      : ''
                  }`}
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-bag-check me-1"></i> Comercial
                </button>
                <ul className="dropdown-menu shadow-sm border-0">
                  <li>
                    <NavLink to="/ventas" onClick={closeMenu} className="dropdown-item small py-2">
                      <i className="bi bi-cart3 me-2 text-success"></i> Punto de Venta (POS)
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/clientes" onClick={closeMenu} className="dropdown-item small py-2">
                      <i className="bi bi-people me-2 text-primary"></i> Directorio Clientes (CRM)
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/abonos" onClick={closeMenu} className="dropdown-item small py-2">
                      <i className="bi bi-file-earmark-lock2 me-2 text-info"></i> Abonos & Soporte Pyme
                    </NavLink>
                  </li>
                </ul>
              </div>

              {/* Inventario & Compras Dropdown */}
              <div className="dropdown d-inline-block">
                <button
                  className={`nav-link-premium dropdown-toggle border-0 bg-transparent ${
                    location.pathname.startsWith('/productos') ||
                    location.pathname.startsWith('/proveedores')
                      ? 'active'
                      : ''
                  }`}
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-boxes me-1"></i> Inventario
                </button>
                <ul className="dropdown-menu shadow-sm border-0">
                  <li>
                    <NavLink to="/productos" onClick={closeMenu} className="dropdown-item small py-2">
                      <i className="bi bi-box-seam me-2 text-warning"></i> Catálogo & Categorías
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/proveedores" onClick={closeMenu} className="dropdown-item small py-2">
                      <i className="bi bi-truck me-2 text-secondary"></i> Directorio Proveedores
                    </NavLink>
                  </li>
                </ul>
              </div>

              {/* Ajustes */}
              <NavLink
                to="/settings"
                onClick={closeMenu}
                className={({ isActive }) => `nav-link-premium ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-gear me-1"></i> Ajustes
              </NavLink>

              {/* Botón Acción Rápida: Nuevo Presupuesto */}
              <NavLink
                to="/presupuesto-it"
                onClick={closeMenu}
                className={({ isActive }) => `btn btn-primary btn-sm d-flex align-items-center gap-1 my-2 my-lg-0 ms-lg-2 ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-plus-lg"></i> <span>Presupuesto</span>
              </NavLink>

              {/* Salir */}
              <div className="mt-auto mt-lg-0 pt-3 pt-lg-0 border-top border-lg-0">
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 border-0 bg-transparent shadow-none"
                >
                  <i className="bi bi-box-arrow-right"></i> <span>Salir</span>
                </button>
              </div>
            </nav>

            {/* Backdrop Mobile */}
            {isOpen && <div className="nav-backdrop d-lg-none" onClick={closeMenu}></div>}
          </>
        )}
      </div>
    </header>
  );
}
