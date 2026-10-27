import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error no controlado:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light p-4">
          <div className="card shadow-sm border-0 text-center p-4 p-md-5" style={{ maxWidth: '520px', borderRadius: '1rem' }}>
            <div className="text-warning mb-3">
              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '3rem' }}></i>
            </div>
            <h3 className="fw-bold mb-2">Ocurrió un inconveniente al cargar la vista</h3>
            <p className="text-muted small mb-4">
              Esto suele ocurrir cuando el traductor automático del navegador o una extensión modifica elementos de la página.
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <button onClick={this.handleReload} className="btn btn-primary px-4 py-2">
                <i className="bi bi-arrow-clockwise me-2"></i>
                Recargar página
              </button>
              <button 
                onClick={() => {
                  window.location.href = '/login';
                }} 
                className="btn btn-outline-secondary px-3 py-2"
              >
                Ir al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
