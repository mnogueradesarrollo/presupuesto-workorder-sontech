import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import logoCircle from '../assets/logo-sontech-circle.png';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanEmail = email.trim();
        if (!cleanEmail) {
            toast.error('Ingresá un correo válido');
            return;
        }

        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, cleanEmail, password);
            toast.success('¡Acceso concedido!');
            navigate(from, { replace: true });
        } catch (error: any) {
            console.error('Error de acceso:', error);
            let message = 'Error al entrar';
            if (
                error.code === 'auth/user-not-found' ||
                error.code === 'auth/wrong-password' ||
                error.code === 'auth/invalid-credential'
            ) {
                message = 'Correo o contraseña incorrectos. Verificá los datos o recuperá tu contraseña.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'El formato del correo electrónico no es válido.';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Acceso bloqueado temporalmente por intentos fallidos. Intentá más tarde o restablecé tu contraseña.';
            }
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const cleanEmail = email.trim();
        if (!cleanEmail) {
            toast.error('Escribí tu email en el campo de arriba para enviarte el enlace de recuperación.');
            return;
        }

        setResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, cleanEmail);
            toast.success(`Enlace de recuperación enviado a ${cleanEmail}. Revisá tu bandeja de entrada o Spam.`, {
                duration: 6000,
            });
        } catch (error: any) {
            console.error('Error al recuperar contraseña:', error);
            if (error.code === 'auth/invalid-email') {
                toast.error('El formato del correo electrónico no es válido.');
            } else if (error.code === 'auth/too-many-requests') {
                toast.error('Demasiados intentos. Esperá unos minutos antes de volver a solicitarlo.');
            } else {
                toast.error('No se pudo enviar el correo de recuperación. Verificá el email ingresado.');
            }
        } finally {
            setResetLoading(false);
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
                                autoComplete="username"
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-4 text-start">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="x-small fw-bold text-uppercase mb-0 text-white text-opacity-50 ms-1">
                                Contraseña
                            </label>
                            <button
                                type="button"
                                onClick={handleResetPassword}
                                disabled={resetLoading}
                                className="btn btn-link p-0 x-small text-white text-opacity-75 text-decoration-none"
                                style={{ minHeight: 'auto', fontSize: '0.75rem' }}
                            >
                                {resetLoading ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                            </button>
                        </div>
                        <div className="position-relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control glass-input pe-5"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-white text-opacity-75 text-decoration-none px-3"
                                style={{ minHeight: 'auto' }}
                                tabIndex={-1}
                                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                        </div>
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
