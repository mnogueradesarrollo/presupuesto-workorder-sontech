import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import logoUrl from "../assets/logotipo-sontech.png";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideHeader = headerRef.current && headerRef.current.contains(target);
      const insideDrawer = drawerRef.current && drawerRef.current.contains(target);
      if (!insideHeader && !insideDrawer) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cerrar menús cuando cambia la ruta
  useEffect(() => {
    setIsOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  // No mostrar navbar en el login o en el portal público de seguimiento
  if (location.pathname === '/login' || location.pathname.startsWith('/seguimiento')) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMenu = () => {
    setIsOpen(false);
    setActiveDropdown(null);
  };

  const toggleDropdown = (name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  return (
    <>
      <header className="nav-premium sticky-top shadow-sm" ref={headerRef}>
        <div className="container-fluid px-3 px-md-4 d-flex align-items-center justify-content-between h-100">
          {/* Brand */}
          <Link to="/" className="d-flex align-items-center" onClick={closeMenu}>
            <img src={logoUrl} alt="Sontech" className="premium-logo" style={{ height: '36px' }} />
          </Link>

          {user && (
            <>
              {/* Hamburger Button Mobile (< 992px) */}
              <button
                className="btn btn-link link-dark d-lg-none p-2 border-0 d-flex align-items-center justify-content-center"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Abrir menú de navegación"
                style={{ minHeight: '40px', width: '40px' }}
              >
                <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-list'} fs-2`}></i>
              </button>

              {/* Desktop Navigation (>= 992px) */}
              <nav className="d-none d-lg-flex align-items-center gap-2">
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
                <div className="dropdown position-relative">
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
                    onClick={() => toggleDropdown('taller')}
                    aria-expanded={activeDropdown === 'taller'}
                  >
                    <i className="bi bi-tools me-1"></i> Taller & Lab
                  </button>
                  <ul
                    className={`dropdown-menu shadow border-0 ${activeDropdown === 'taller' ? 'show' : ''}`}
                    style={activeDropdown === 'taller' ? { display: 'block', top: '100%', left: 0, minWidth: '250px' } : undefined}
                  >
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
                <div className="dropdown position-relative">
                  <button
                    className={`nav-link-premium dropdown-toggle border-0 bg-transparent ${
                      location.pathname.startsWith('/ventas') ||
                      location.pathname.startsWith('/clientes') ||
                      location.pathname.startsWith('/abonos')
                        ? 'active'
                        : ''
                    }`}
                    type="button"
                    onClick={() => toggleDropdown('comercial')}
                    aria-expanded={activeDropdown === 'comercial'}
                  >
                    <i className="bi bi-bag-check me-1"></i> Comercial
                  </button>
                  <ul
                    className={`dropdown-menu shadow border-0 ${activeDropdown === 'comercial' ? 'show' : ''}`}
                    style={activeDropdown === 'comercial' ? { display: 'block', top: '100%', left: 0, minWidth: '240px' } : undefined}
                  >
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
                <div className="dropdown position-relative">
                  <button
                    className={`nav-link-premium dropdown-toggle border-0 bg-transparent ${
                      location.pathname.startsWith('/productos') ||
                      location.pathname.startsWith('/proveedores')
                        ? 'active'
                        : ''
                    }`}
                    type="button"
                    onClick={() => toggleDropdown('inventario')}
                    aria-expanded={activeDropdown === 'inventario'}
                  >
                    <i className="bi bi-boxes me-1"></i> Inventario
                  </button>
                  <ul
                    className={`dropdown-menu shadow border-0 ${activeDropdown === 'inventario' ? 'show' : ''}`}
                    style={activeDropdown === 'inventario' ? { display: 'block', top: '100%', left: 0, minWidth: '230px' } : undefined}
                  >
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
                  className={({ isActive }) => `btn btn-primary btn-sm d-flex align-items-center gap-1 ms-2 ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-plus-lg"></i> <span>Presupuesto</span>
                </NavLink>

                {/* Salir */}
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 border-0 bg-transparent shadow-none ms-1"
                >
                  <i className="bi bi-box-arrow-right"></i> <span>Salir</span>
                </button>
              </nav>
            </>
          )}
        </div>
      </header>

      {/* Mobile Drawer & Backdrop (fuera del header para evitar recorte por backdrop-filter) */}
      {user && (
        <div className="d-lg-none">
          {isOpen && <div className="nav-backdrop" onClick={closeMenu}></div>}
          <nav className={`nav-menu-drawer ${isOpen ? 'show' : ''}`} ref={drawerRef}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-2 w-100">
              <div className="d-flex align-items-center gap-2">
                <img src={logoUrl} alt="Sontech" style={{ height: '28px' }} />
                <span className="small text-muted fw-bold text-uppercase">ERP & Lab</span>
              </div>
              <button className="btn btn-light btn-sm p-1 px-2 border" onClick={closeMenu} aria-label="Cerrar menú">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Botón Acción Rápida en Móvil */}
            <NavLink
              to="/presupuesto-it"
              onClick={closeMenu}
              className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 mb-2"
            >
              <i className="bi bi-plus-lg"></i> <span>Nuevo Presupuesto</span>
            </NavLink>

            {/* Dashboard */}
            <NavLink
              to="/"
              end
              onClick={closeMenu}
              className={({ isActive }) => `nav-link-premium w-100 ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-speedometer2 me-2"></i> Dashboard
            </NavLink>

            {/* Acordeón Móvil: Taller & Lab */}
            <div className="w-100">
              <button
                type="button"
                className={`nav-link-premium w-100 justify-content-between border-0 bg-transparent ${
                  activeDropdown === 'taller' ? 'active' : ''
                }`}
                onClick={() => toggleDropdown('taller')}
              >
                <span><i className="bi bi-tools me-2"></i> Taller & Lab</span>
                <i className={`bi bi-chevron-${activeDropdown === 'taller' ? 'up' : 'down'} small`}></i>
              </button>
              {activeDropdown === 'taller' && (
                <div className="mobile-submenu ps-3 py-1 my-1 bg-light rounded-3 d-flex flex-column gap-1">
                  <NavLink to="/gestion" onClick={closeMenu} className="nav-link-premium py-2 small">
                    <i className="bi bi-clipboard2-check me-2 text-primary"></i> Órdenes de Trabajo (OT)
                  </NavLink>
                  <NavLink to="/equipos" onClick={closeMenu} className="nav-link-premium py-2 small">
                    <i className="bi bi-laptop me-2 text-info"></i> Equipos & CMDB (Seriales)
                  </NavLink>
                  <NavLink to="/scrap" onClick={closeMenu} className="nav-link-premium py-2 small">
                    <i className="bi bi-recycle me-2 text-warning"></i> Consumibles & Despiece
                  </NavLink>
                  <NavLink to="/kb" onClick={closeMenu} className="nav-link-premium py-2 small">
                    <i className="bi bi-journal-code me-2 text-success"></i> Base de Conocimiento (KB)
                  </NavLink>
                  <NavLink to="/visitas" onClick={closeMenu} className="nav-link-premium py-2 small">
                    <i className="bi bi-calendar-event me-2 text-danger"></i> Visitas Técnicas & Domicilio
                  </NavLink>
                </div>
              )}
            </div>

            {/* Acordeón Móvil: Comercial */}
            <div className="w-100">
              <button
                type="button"
                className={`nav-link-premium w-100 justify-content-between border-0 bg-transparent ${
                  activeDropdown === 'comercial' ? 'active' : ''
                }`}
                onClick={() => toggleDropdown('comercial')}
              >
                <span><i className="bi bi-bag-check me-2"></i> Comercial</span>
                <i className={`bi bi-chevron-${activeDropdown === 'comercial' ? 'up' : 'down'} small`}></i>
              </button>
              {activeDropdown === 'comercial' && (
                <div className="mobile-submenu ps-3 py-1 my-1 bg-light rounded-3 d-flex flex-column gap-1">
                  <NavLink to="/ventas" onClick={closeMenu} className="nav-link-premium py-2 small">
                    <i className="bi bi-cart3 me-2 text-success"></i> Punto de Venta (POS)
                  </NavLink>
                  <NavLink to="/clientes" onClick={closeMenu} className="nav-link-premium py-2 small">
                    <i className="bi bi-people me-2 text-primary"></i> Directorio Clientes (CRM)
                  </NavLink>
                  <NavLink to="/abonos" onClick={closeMenu} className="nav-link-premium py-2 small">
                    <i className="bi bi-file-earmark-lock2 me-2 text-info"></i> Abonos & Soporte Pyme
                  </NavLink>
                </div>
              )}
            </div>

            {/* Acordeón Móvil: Inventario */}
            <div className="w-100">
              <button
                type="button"
                className={`nav-link-premium w-100 justify-content-between border-0 bg-transparent ${
                  activeDropdown === 'inventario' ? 'active' : ''
                }`}
                onClick={() => toggleDropdown('inventario')}
              >
                <span><i className="bi bi-boxes me-2"></i> Inventario</span>
                <i className={`bi bi-chevron-${activeDropdown === 'inventario' ? 'up' : 'down'} small`}></i>
              </button>
              {activeDropdown === 'inventario' && (
                <div className="mobile-submenu ps-3 py-1 my-1 bg-light rounded-3 d-flex flex-column gap-1">
                  <NavLink to="/productos" onClick={closeMenu} className="nav-link-premium py-2 small">
                    <i className="bi bi-box-seam me-2 text-warning"></i> Catálogo & Categorías
                  </NavLink>
                  <NavLink to="/proveedores" onClick={closeMenu} className="nav-link-premium py-2 small">
                    <i className="bi bi-truck me-2 text-secondary"></i> Directorio Proveedores
                  </NavLink>
                </div>
              )}
            </div>

            {/* Ajustes */}
            <NavLink
              to="/settings"
              onClick={closeMenu}
              className={({ isActive }) => `nav-link-premium w-100 ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-gear me-2"></i> Ajustes
            </NavLink>

            {/* Salir */}
            <div className="mt-auto pt-3 border-top w-100">
              <button
                onClick={handleLogout}
                className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
              >
                <i className="bi bi-box-arrow-right"></i> <span>Cerrar Sesión</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
