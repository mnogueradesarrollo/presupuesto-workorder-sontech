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
            toast.success('¡Bienvenido al sistema!');
            navigate(from, { replace: true });
        } catch (error: any) {
            console.error('Error en el acceso:', error);
            let message = 'Error de autenticación';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = 'Las credenciales no son válidas';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Acceso bloqueado temporalmente por demasiados intentos.';
            }
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center p-0"
            style={{
                background: 'radial-gradient(circle at top left, #1a2a6c, #b21f1f, #fdbb2d)',
                backgroundSize: '400% 400%',
                animation: 'gradientBG 15s ease infinite',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2000,
                overflow: 'hidden',
                margin: 0
            }}>
            <style>
                {`
          @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .glass-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 2rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          .form-control-premium {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white !important;
            border-radius: 1rem;
            padding: 0.75rem 1rem;
            transition: all 0.3s ease;
          }
          .form-control-premium:focus {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.5);
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
          }
          .form-control-premium::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .btn-premium {
            background: linear-gradient(90deg, #ff8a00, #e52e71);
            border: none;
            color: white;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 1rem;
            border-radius: 1rem;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .btn-premium:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(229, 46, 113, 0.3);
            background: linear-gradient(90deg, #ff9a00, #f52e71);
          }
          .btn-premium:active {
            transform: translateY(0);
          }
          .floating-icon {
            animation: float 4s ease-in-out infinite;
          }
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
          }
        `}
            </style>

            <div className="glass-card p-4 p-md-5" style={{ maxWidth: '450px', width: '100%' }}>
                <div className="text-center mb-5 floating-icon">
                    <img
                        src={logoCircle}
                        alt="Sontech Logo"
                        className="img-fluid rounded-circle shadow-lg mb-4"
                        style={{ width: '120px', height: '120px', objectFit: 'cover', border: '4px solid rgba(255, 255, 255, 0.3)' }}
                    />
                    <h1 className="fw-bold text-white mb-1" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Sontech</h1>
                    <div className="badge bg-white text-dark rounded-pill px-3 py-2 fw-bold" style={{ opacity: 0.8 }}>
                        REPARAMOS TU MUNDO
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="form-label text-white small fw-bold opacity-75 ms-2 uppercase">Usuario / Email</label>
                        <div className="input-group">
                            <span className="input-group-text bg-transparent border-0 text-white opacity-50">
                                <i className="bi bi-person-fill"></i>
                            </span>
                            <input
                                type="email"
                                className="form-control form-control-premium"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-5">
                        <label className="form-label text-white small fw-bold opacity-75 ms-2 uppercase">Contraseña</label>
                        <div className="input-group">
                            <span className="input-group-text bg-transparent border-0 text-white opacity-50">
                                <i className="bi bi-lock-fill"></i>
                            </span>
                            <input
                                type="password"
                                className="form-control form-control-premium"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-premium w-100 shadow-lg"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="d-flex align-items-center justify-content-center">
                                <span className="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>
                                Accediendo...
                            </div>
                        ) : (
                            'Ingresar al Panel'
                        )}
                    </button>
                </form>

                <div className="mt-5 text-center text-white opacity-50 small">
                    <p className="mb-0">© 2026 Sontech Gestor v2.0</p>
                    <div className="mt-2">
                        <span className="mx-2">Hardware</span>
                        <span className="mx-2">•</span>
                        <span className="mx-2">Software</span>
                        <span className="mx-2">•</span>
                        <span className="mx-2">Soporte</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
