import { Link, NavLink } from "react-router-dom";
import logoUrl from "../assets/logotipo-sontech.png";

export default function Navbar() {
  return (
    <header className="nav">
      <Link to="/" className="brand">
        <img src={logoUrl} alt="Logo" width={286} height={76} />
      </Link>

      <nav className="links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "link active" : "link")}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/gestion"
          className={({ isActive }) => (isActive ? "link active" : "link")}
        >
          Gestión
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => (isActive ? "link active" : "link")}
        >
          ⚙️
        </NavLink>
        <NavLink
          to="/presupuesto-it"
          className={({ isActive }) => (isActive ? "btn primary" : "btn")}
        >
          Nuevo presupuesto
        </NavLink>
      </nav>
    </header>
  );
}
