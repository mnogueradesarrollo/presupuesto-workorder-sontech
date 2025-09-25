import { Link, NavLink } from 'react-router-dom';
import logoUrl from '../assets/react.svg';

export default function Navbar() {
  return (
    <header className="nav">
      <Link to="/" className="brand">
        <img src={logoUrl} alt="Logo" width={36} height={36} />
        <span>Presupuestos IT</span>
      </Link>

      <nav className="links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'link active' : 'link'}>
          Inicio
        </NavLink>
        <NavLink to="/presupuesto-it" className={({isActive})=> isActive ? 'btn primary' : 'btn'}>
        Nuevo presupuesto
        </NavLink>
      </nav>
    </header>
  );
}