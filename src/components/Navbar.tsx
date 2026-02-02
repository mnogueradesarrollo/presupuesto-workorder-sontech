import { Link, NavLink, useNavigate } from "react-router-dom";
import logoUrl from "../assets/logotipo-sontech.png";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="nav px-4 bg-white shadow-sm sticky-top">
      <Link to="/" className="brand">
        <img src={logoUrl} alt="Logo" width={200} height={53} style={{ objectFit: 'contain' }} />
      </Link>

      {user && (
        <nav className="links ms-auto d-flex align-items-center gap-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? "link active text-primary fw-bold" : "link text-secondary")}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/gestion"
            className={({ isActive }) => (isActive ? "link active text-primary fw-bold" : "link text-secondary")}
          >
            Gestión
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? "link active text-primary fw-bold" : "link text-secondary")}
          >
            <i className="bi bi-gear fs-5"></i>
          </NavLink>
          <NavLink
            to="/presupuesto-it"
            className={({ isActive }) => (isActive ? "btn btn-primary btn-sm px-3" : "btn btn-outline-primary btn-sm px-3")}
          >
            Nuevo presupuesto
          </NavLink>
          <button
            onClick={handleLogout}
            className="btn btn-light btn-sm ms-2 border"
          >
            <i className="bi bi-box-arrow-right me-1"></i> Cerrar Sesión
          </button>
        </nav>
      )}
    </header>
  );
}
