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
        <div className="login-wrapper">
            <div className="glass-card shadow-lg">
                <div className="mb-5">
                    <img
                        src={logoCircle}
                        alt="Sontech"
                        className="mb-4 shadow-sm"
                        style={{
                            width: '160px',
                            height: '160px',
                            borderRadius: '50%',
                            border: '4px solid rgba(255, 255, 255, 0.2)',
                            objectFit: 'contain',
                            background: 'white'
                        }}
                    />
                    <h1 className="h3 fw-bold mb-1">Panel de Control</h1>
                    <p className="text-white text-opacity-75 small">Bienvenido, ingresa tus credenciales</p>
                </div>

                <form onSubmit={handleSubmit} className="w-100">
                    <div className="mb-4 text-start">
                        <label className="x-small fw-bold text-uppercase mb-2 d-block text-white text-opacity-50 ms-1">
                            Email / Usuario
                        </label>
                        <div className="position-relative">
                            <input
                                type="email"
                                className="form-control glass-input"
                                placeholder="usuario@sontech.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-5 text-start">
                        <label className="x-small fw-bold text-uppercase mb-2 d-block text-white text-opacity-50 ms-1">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            className="form-control glass-input"
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
                            <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                            <i className="bi bi-shield-lock me-2"></i>
                        )}
                        {loading ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
                    </button>
                </form>

                <div className="mt-5 pt-4 border-top border-white border-opacity-10">
                    <p className="x-small text-white text-opacity-40 mb-0">
                        © 2026 Sontech Gestor • v2.5
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
