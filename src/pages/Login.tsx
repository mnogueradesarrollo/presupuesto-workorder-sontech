import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

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
            toast.success('¡Bienvenido!');
            navigate(from, { replace: true });
        } catch (error: any) {
            console.error('Error in login:', error);
            let message = 'Error al iniciar sesión';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = 'Usuario o contraseña incorrectos';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Demasiados intentos. Inténtalo más tarde.';
            }
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3 py-5"
            style={{
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                marginTop: '-56px' // Compensate for potential padding-top from navbar-space which we'll hide
            }}>
            <div className="card shadow-lg border-0" style={{ maxWidth: '400px', width: '100%', borderRadius: '1.5rem', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                            <i className="bi bi-shield-lock-fill fs-3"></i>
                        </div>
                        <h2 className="fw-bold text-dark">Sontech</h2>
                        <p className="text-muted small">Panel de Administración</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label small fw-bold text-secondary">Correo Electrónico</label>
                            <div className="input-group">
                                <span className="input-group-text bg-transparent border-end-0 text-secondary">
                                    <i className="bi bi-envelope"></i>
                                </span>
                                <input
                                    type="email"
                                    className="form-control border-start-0 ps-0"
                                    placeholder="ejemplo@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label small fw-bold text-secondary">Contraseña</label>
                            <div className="input-group">
                                <span className="input-group-text bg-transparent border-end-0 text-secondary">
                                    <i className="bi bi-lock"></i>
                                </span>
                                <input
                                    type="password"
                                    className="form-control border-start-0 ps-0"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-100 py-2 fw-bold shadow-sm"
                            style={{ borderRadius: '0.75rem' }}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Iniciando sesión...
                                </>
                            ) : (
                                'Ingresar'
                            )}
                        </button>
                    </form>

                    <div className="mt-4 text-center">
                        <p className="text-muted small mb-0">© 2026 Sontech Gestor</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
