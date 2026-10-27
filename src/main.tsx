import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './styles/print.css';

// Parche defensivo para Node.prototype.removeChild y Node.prototype.insertBefore
// Previene el error 'NotFoundError: Failed to execute removeChild on Node' causado por
// Google Translate o extensiones del navegador (gestores de contraseñas, etc.) que mutan el DOM fuera del ciclo de React.
if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          'Operación removeChild ignorada de forma segura: el nodo hijo no pertenece al padre esperado (posible modificación por traductor o extensión).',
          { parent: this, child }
        );
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          'Operación insertBefore ignorada de forma segura: el nodo de referencia no pertenece al padre esperado.',
          { parent: this, newNode, referenceNode }
        );
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
