import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import logoCircle from '../assets/logo-sontech-circle.png';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success('¡Acceso concedido!');
            navigate(from, { replace: true });
        } catch (error: any) {
            console.error('Error de acceso:', error);
            let message = 'Error al entrar';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = 'Credenciales inválidas';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Acceso bloqueado por seguridad. Intenta más tarde.';
            }
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top left, #1a2a6c, #b21f1f, #fdbb2d)',
            backgroundSize: '400% 400%',
            animation: 'gradientBG 15s ease infinite',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999,
            overflowX: 'hidden',
            overflowY: 'auto',
            margin: 0,
            padding: '20px'
        }}>
            <style>
                {`
          @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .glass-card {
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 2.5rem;
            box-shadow: 0 40px 80px -15px rgba(0, 0, 0, 0.6);
            width: 100%;
            max-width: 440px;
            display: flex;
            flex-direction: column;
            align-items: center; /* Alineación horizontal de hijos */
            padding: 3.5rem 2rem;
            text-align: center;
          }
          @media (max-width: 480px) {
            .glass-card {
                padding: 2.5rem 1.5rem;
                border-radius: 2rem;
            }
            h1 { font-size: 2.2rem !important; }
          }
          .form-container {
            width: 100%;
          }
          .form-group-premium {
            width: 100%;
            margin-bottom: 1.5rem;
            text-align: left; /* Etiquetas a la izquierda por usabilidad */
          }
          .form-control-premium {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: white !important;
            border-radius: 1.25rem;
            padding: 1.1rem 1.3rem;
            transition: all 0.3s ease;
            width: 100%;
            display: block;
          }
          .form-control-premium:focus {
            background: rgba(255, 255, 255, 0.18);
            border-color: rgba(255, 255, 255, 0.5);
            box-shadow: 0 0 25px rgba(255, 255, 255, 0.1);
            outline: none;
          }
          .btn-animate {
            background: linear-gradient(90deg, #ff8a00, #e52e71);
            border: none;
            color: white;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            padding: 1.2rem;
            border-radius: 1.25rem;
            width: 100%;
            margin-top: 1rem;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          }
          .btn-animate:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 15px 30px rgba(229, 46, 113, 0.4);
            filter: brightness(1.1);
          }
          .btn-animate:active {
            transform: translateY(0);
          }
          .logo-wrapper {
            margin-bottom: 2rem;
            display: flex;
            justify-content: center;
            width: 100%;
          }
        `}
            </style>

            <div className="glass-card">
                <div className="logo-wrapper">
                    <img
                        src={logoCircle}
                        alt="Sontech"
                        style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            border: '4px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
                            objectFit: 'cover'
                        }}
                    />
                </div>

                <div className="w-100 mb-5">
                    <h1 className="fw-bold text-white mb-2" style={{ fontSize: '2.8rem', letterSpacing: '-1.5px' }}>
                        Sontech
                    </h1>
                    <div className="d-flex justify-content-center">
                        <span className="badge bg-white text-dark rounded-pill px-3 py-2 fw-bold" style={{ opacity: 0.8, fontSize: '0.7rem', letterSpacing: '2px' }}>
                            REPARAMOS TU MUNDO
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="form-container">
                    <div className="form-group-premium">
                        <label className="text-white small fw-bold opacity-75 ms-3 mb-2 d-block text-uppercase" style={{ letterSpacing: '1px' }}>
                            Usuario / Email
                        </label>
                        <input
                            type="email"
                            className="form-control-premium"
                            placeholder="nombre@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group-premium">
                        <label className="text-white small fw-bold opacity-75 ms-3 mb-2 d-block text-uppercase" style={{ letterSpacing: '1px' }}>
                            Contraseña
                        </label>
                        <input
                            type="password"
                            className="form-control-premium"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-animate"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="d-flex align-items-center justify-content-center">
                                <span className="spinner-border spinner-border-sm me-3" role="status"></span>
                                Entrando...
                            </div>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>

                <div className="mt-5 text-white opacity-40 small w-100">
                    <p className="mb-2">© 2026 Sontech Gestor v2.5</p>
                    <div className="d-flex justify-content-center gap-3">
                        <span>Hardware</span>
                        <span>•</span>
                        <span>Software</span>
                        <span>•</span>
                        <span>Soporte</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
