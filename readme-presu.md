# 📋 Guía y Análisis del Proyecto: Sontech Gestor (Presupuestos & Órdenes de Trabajo)

> **Documento de Contexto y Referencia Técnica para Desarrolladores**  
> *Creado para retomar, comprender y evolucionar el proyecto rápidamente sin perder contexto operativo ni arquitectónico.*

---

## 📌 1. Visión General del Proyecto

**Sontech Gestor** (`presupuesto-sontech`) es una aplicación web SPA diseñada a medida para el laboratorio técnico y comercial de **Sontech** (reparación de celulares, notebooks, PCs, venta de insumos y servicios IT).

### Propósito Principal:
1. **Cotizar y Presupuestar**: Crear presupuestos formales para clientes, detallando productos, servicios y reparaciones con números de serie/IMEI, tiempos de garantía y descuentos.
2. **Generar Documentación PDF**: Exportación instantánea de presupuestos oficiales e informes de servicio técnico con membrete, logo y datos configurables de la empresa.
3. **Flujo Comercial a Técnico (OT)**: Convertir presupuestos aceptados en **Órdenes de Trabajo (`OT-YYYY-####`)** de forma transaccional.
4. **Gestión de Taller y Servicio Técnico**: Registro del diagnóstico técnico, trabajos realizados (horas/mano de obra), repuestos utilizados y notas de entrega para el cliente.
5. **Control Financiero**: Registro de cobros (efectivo, transferencias, tarjetas), cálculo automático de saldos deudores, estados de pago y sincronización de importes con el presupuesto original.
6. **Métricas de Rendimiento (Dashboard)**: Monitoreo en tiempo real de volumen de facturación, saldos por cobrar, tasa de conversión y estado de reparaciones.

---

## 🛠️ 2. Stack Tecnológico

| Capa / Módulo | Tecnología | Versión | Rol en el Proyecto |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.1.1` | Interfaz reactiva y componentes |
| **Lenguaje** | TypeScript | `~5.8.3` | Tipado estático en todo el dominio |
| **Build Tool & Bundler** | Vite | `^7.1.7` | Servidor de desarrollo ultrarrápido y empaquetado |
| **Enrutamiento** | React Router DOM | `^7.9.2` | Enrutamiento cliente SPA con rutas protegidas |
| **Formularios & Validación** | React Hook Form + Zod | `^7.63.0` / `^4.1.11` | Formularios de alto rendimiento y esquemas fuertemente validados |
| **Backend / Base de Datos** | Firebase Firestore | `^12.3.0` | Base de datos NoSQL documental con transacciones atómicas |
| **Autenticación** | Firebase Auth | `^12.3.0` | Gestión de sesiones seguras por email/contraseña |
| **Almacenamiento** | Firebase Storage | `^12.3.0` | Preparado para assets y archivos adjuntos |
| **Generación de PDFs** | jsPDF + jsPDF-AutoTable | `^3.0.3` / `^5.0.2` | Renderizado programático en memoria de PDFs vectoriales |
| **Estilos & UI** | Bootstrap 5 + Custom CSS | `^5.3.8` | Sistema de diseño profesional con variables CSS (`src/index.css`) |
| **Feedback al Usuario** | React Hot Toast | `^2.6.0` | Notificaciones flotantes no invasivas |
| **Hosting & Deploy** | Netlify | - | Despliegue continuo con configuración en `netlify.toml` |

---

## 📂 3. Estructura del Proyecto

```text
presupuesto-workorder-sontech/
├── .env / .env.example          # Configuración y credenciales públicas de Firebase
├── index.html                   # HTML base con precargas de tipografías (Inter, Plus Jakarta Sans, JetBrains Mono)
├── netlify.toml                 # Configuración de build y redirección SPA para Netlify
├── package.json                 # Dependencias y scripts del proyecto
├── tsconfig.json                # Configuración de TypeScript
├── vite.config.ts               # Configuración de Vite
└── src/
    ├── main.tsx                 # Entrada principal React DOM
    ├── App.tsx                  # Enrutador principal y envoltura de AuthProvider
    ├── index.css                # Sistema de diseño completo (paleta, tokens, temas, botones, cards)
    ├── App.css                  # Estilos secundarios
    │
    ├── assets/                  # Logos e isotipos de Sontech (.png, .ico, .svg)
    │   ├── logotipo-sontech.png
    │   ├── logo-sontech-circle.png
    │   └── ...
    │
    ├── components/              # Componentes de UI reutilizables
    │   ├── ErrorBoundary.tsx    # Atrapador global de errores de render y mitigación de fallos de DOM
    │   ├── Navbar.tsx           # Barra superior con menús desplegables React y drawer móvil
    │   ├── ProtectedRoute.tsx   # Guardián de rutas autenticadas (redirige a /login)
    │   └── ItemsTableIT.tsx     # Tabla interactiva dinámica para añadir/eliminar ítems de presupuesto
    │
    ├── context/                 # Estado global de la aplicación
    │   └── AuthContext.tsx      # Proveedor de autenticación y cierre automático por inactividad (30 min)
    │
    ├── lib/                     # Librerías de soporte y utilidades puras
    │   ├── firebase.ts          # Inicialización del SDK de Firebase (db, auth, storage)
    │   ├── calc.ts              # Cálculos matemáticos: subtotales, descuentos, bonificaciones, total
    │   ├── pdf.ts               # Lógica de dibujo de PDFs comerciales y de informes técnicos
    │   ├── print.ts             # Utilidad de impresión en iframe silencioso
    │   ├── utils.ts             # Funciones auxiliares y sanitización de datos Firestore
    │   └── whatsapp.ts          # Generación de enlaces y mensajes automáticos para WhatsApp
    │
    ├── pages/                   # Páginas / Vistas completas de la aplicación
    │   ├── Login.tsx            # Inicio de sesión (Glassmorphism, ver/ocultar clave, recuperar contraseña)
    │   ├── Dashboard.tsx        # Métricas comerciales, financieras y operativas de taller
    │   ├── Home.tsx             # Pantalla exclusiva de Órdenes de Trabajo (OT) (/gestion, /ordenes)
    │   ├── Presupuestos.tsx     # Pantalla exclusiva de listado y gestión de Presupuestos (/presupuestos)
    │   ├── PresupuestoIT.tsx    # Creación, edición, visualización y exportación de presupuestos
    │   ├── Orden.tsx            # Ficha editable completa de Orden de Trabajo (cliente, equipo, ítems, pagos)
    │   ├── TrackingPublico.tsx  # Portal público de seguimiento de OT para clientes (/seguimiento/:codigo)
    │   ├── Clientes.tsx         # Directorio CRM de clientes y cuentas corrientes
    │   ├── Proveedores.tsx      # Directorio de proveedores de repuestos e insumos
    │   ├── Productos.tsx        # Catálogo e inventario de productos y repuestos
    │   ├── Ventas.tsx           # Punto de Venta (POS) y facturación rápida de mostrador
    │   ├── Equipos.tsx          # Base de datos de equipos / activos (CMDB) e historial por serie/IMEI
    │   ├── ConsumiblesScrap.tsx # Control de consumibles de taller y desguace (scrap)
    │   ├── BaseConocimiento.tsx # Wiki técnica interna (soluciones, pinouts, procedimientos)
    │   ├── VisitasTecnicas.tsx  # Agenda y registro de visitas técnicas a domicilio / empresas
    │   ├── BeneficiosPromo.tsx  # Módulo nativo de beneficios promocionales y sincronización con OT
    │   ├── Abonos.tsx           # Gestión de abonos mensuales y mantenimiento preventivo IT
    │   └── Settings.tsx         # Configuración del negocio (nombre, dirección, teléfono, logo)
    │
    ├── services/                # Capa de comunicación con Firebase Firestore
    │   ├── flujo.ts             # Transacciones críticas: aceptar presupuesto, registrar/borrar pago, sincronizar
    │   ├── presupuestos.ts      # CRUD y numeración anual de presupuestos
    │   ├── ordenes.ts           # Consulta, actualización y seguimiento de órdenes de trabajo
    │   ├── clientes.ts          # CRUD de clientes
    │   ├── proveedores.ts       # CRUD de proveedores
    │   ├── productos.ts         # CRUD de catálogo y control de stock
    │   ├── ventas.ts            # Registro de ventas directas y descuento de inventario
    │   ├── equipos.ts           # CRUD de equipos (CMDB)
    │   ├── scrap.ts             # Gestión de consumibles y scrap
    │   ├── kb.ts                # CRUD de artículos de base de conocimiento
    │   ├── beneficios.ts        # CRUD y aplicación de beneficios promocionales
    │   ├── abonos.ts            # CRUD de abonos recurrentes y visitas técnicas
    │   └── settings.ts          # Lectura y guardado de datos corporativos
    │
    ├── styles/                  # Hojas de estilo específicas
    │   └── print.css            # Estilos para impresión en papel / ocultamiento de elementos UI
    │
    └── types/                   # Definiciones de tipos TypeScript
        ├── common.ts            # Monedas, métodos de pago, estados generales
        ├── presupuesto.ts       # Esquema de Presupuesto, Ítem, Aceptación y Garantía
        ├── orden.ts             # Esquema de Orden de Trabajo, Equipo, Trabajos y Repuestos
        ├── pago.ts              # Esquema de registro de Pagos
        ├── cliente.ts           # Esquema de Cliente
        ├── proveedor.ts         # Esquema de Proveedor
        ├── producto.ts          # Esquema de Producto / Repuesto
        ├── venta.ts             # Esquema de Venta POS
        ├── equipo.ts            # Esquema de Equipo (CMDB)
        ├── scrap.ts             # Esquema de Consumibles y Scrap
        ├── kb.ts                # Esquema de Base de Conocimiento
        ├── beneficio.ts         # Esquema de Beneficio Promocional
        └── abono.ts             # Esquema de Abono y Visita Técnica
```

---

## 🗄️ 4. Modelo de Datos en Firebase Firestore

La base de datos está organizada en 5 colecciones principales:

### 1. `counters` (Contadores Secuenciales)
Garantiza códigos incrementales y legibles por año para documentos comerciales:
- **`counters/presupuestos-{YYYY}`**: `{ seq: number }` $\rightarrow$ Genera códigos como `P-2026-0001`.
- **`counters/ordenes-{YYYY}`**: `{ seq: number }` $\rightarrow$ Genera códigos como `OT-2026-0001`.

### 2. `presupuestos`
Almacena las cotizaciones enviadas a clientes:
- `id`: string (ID autogenerado por Firestore).
- `codigo`: string (Ej: `"P-2026-0012"`).
- `numero`: number (secuencia del año).
- `anio`: number.
- `cliente`: string.
- `fecha`: string (ISO).
- `moneda`: `"ARS"` | `"USD"`.
- `status`: `"borrador"` | `"enviado"` | `"aceptado"` | `"rechazado"` | `"anulado"`.
- `ordenId` *(opcional)*: string (vinculación a la OT generada).
- `aceptacion` *(opcional)*: `{ nombre, dni, metodo, firmaDataUrl, aceptadoAt }`.
- `items`: Lista de ítems:
  - `id`: string.
  - `tipo`: `"Producto"` | `"Servicio"` | `"Reparación"`.
  - `descripcion`: string.
  - `cantidad`: number.
  - `precioUnitario`: number (o calculado con `horas` $\times$ `tarifaHora`).
  - `descuentoPct`: number.
  - `marca`, `modelo`, `imeiSerie`, `estado`: strings opcionales.
  - `garantiaValor`: number, `garantiaUnidad`: `"dias"` | `"meses"` | `"anios"`.
- `total`: number.
- `createdAt`: number (timestamp).
- `updatedAt`: number.

### 3. `ordenes`
Almacena el ciclo de vida técnico y económico de una reparación o trabajo:
- `id`: string.
- `presupuestoId`: string (referencia al presupuesto origen).
- `codigo`: string (Ej: `"OT-2026-0005"`).
- `numero`: number, `anio`: number.
- `cliente`: string.
- `equipo`: `{ tipo, marca, modelo, imeiSerie, pass, accesorios }`.
- `diagnostico`: string (informe técnico interno/externo).
- `notasEntrega`: string (recomendaciones finales para el cliente).
- `status`: `"pendiente"` | `"en_progreso"` | `"esperando_repuestos"` | `"pausado"` | `"completado"` | `"entregado"`.
- `payStatus`: `"impago"` | `"parcial"` | `"pagado"` | `"reembolsado"`.
- `itemsPresupuesto`: Snapshot histórico de los ítems cotizados.
- `trabajos`: Array de tareas realizadas en taller (`id`, `descripcion`, `horas`, `precio`, `tecnico`).
- `repuestos`: Array de piezas y materiales utilizados (`id`, `descripcion`, `cantidad`, `costo`, `precio`).
- `totalEstimado`: number (total heredado del presupuesto inicial).
- `totalFinal`: number (total estimado + trabajos extra + repuestos extra).
- `pagado`: number (acumulado cobrado hasta el momento).
- `saldo`: number (pendiente de cobro: `totalFinal - pagado`).
- `createdAt`, `updatedAt`, `completedAt`: timestamps.

### 4. `pagos`
Registro individual de transacciones de cobro:
- `id`: string.
- `ordenId`: string.
- `presupuestoId` *(opcional)*: string.
- `monto`: number.
- `moneda`: `"ARS"` | `"USD"`.
- `metodo`: `"Efectivo"` | `"Transferencia"` | `"Débito"` | `"Crédito"` | `"MercadoPago"` | `"Otro"`.
- `referenciaExterna`: string (nro. comprobante / ID MercadoPago).
- `createdAt`: number.

### 5. `settings` (Documento Único: `settings/business`)
Datos de la empresa utilizados en los encabezados y pies de los PDFs:
- `name`: Nombre comercial (ej: `"Sontech Informática"`).
- `address`: Dirección del local.
- `phone`: Teléfono / WhatsApp.
- `email`: Correo electrónico.
- `logoUrl`: Enlace opcional a un logo alojado.
- `footerText`: Leyenda legal o mensaje de agradecimiento al pie del documento.

---

## 🔄 5. Ciclo de Vida Operativo (Workflow)

```
[ NUEVO PRESUPUESTO ]
        │
        ▼
   (Borrador)  ───> Generación de PDF / Envío a Cliente
        │
        ├─────────────────────────────────────────────────┐
        │ [Aceptar Presupuesto]                           │
        ▼                                                 ▼
[ ORDEN DE TRABAJO ]                              [ ANULAR ]
 (Código OT-YYYY-####)
        │
        ├─> Ingreso a Taller: Diagnóstico & Revisión de Equipo
        ├─> Registro de Extras: Tareas adicionales y repuestos usados
        │     └─> Sincronización automática de nuevo saldo con el Presupuesto
        ├─> Cobranza: Registro de pagos parciales o totales
        │     └─> Actualización atómica de saldo y estado de pago
        ▼
[ FINALIZACIÓN & ENTREGA ]
  - Emisión de Informe de Servicio Técnico en PDF
  - Cambio de estado a 'completado' / 'entregado'
```

### Reglas Clave de Individualización (Presupuesto vs. Orden de Trabajo):
1. **Pantallas Independientes**:
   - **Presupuestos (`/presupuestos`)**: Gestión exclusiva de cotizaciones comerciales (`Presupuestos.tsx` y `PresupuestoIT.tsx`).
   - **Órdenes de Trabajo (`/gestion` o `/ordenes`)**: Gestión exclusiva de órdenes de taller (`Home.tsx` y `Orden.tsx`), con opción de crear una **Nueva Orden de Trabajo directa** sin requerir un presupuesto previo.
2. **Edición Independiente**:
   - Al aceptar un presupuesto se puede generar una OT inicial copiando los datos base, pero a partir de ese momento **Presupuesto y Orden de Trabajo son documentos independientes**: modificar clientes, equipos, ítems base, mano de obra o repuestos en la OT actualiza únicamente la Orden de Trabajo sin alterar ni sobrescribir el presupuesto original.

---

## 🔒 6. Autenticación y Seguridad

- **Mecanismo**: Firebase Authentication basado en Email/Contraseña (`src/pages/Login.tsx`).
- **Mejoras en Login (`Login.tsx`)**:
  - Limpieza automática de espacios en el correo (`email.trim()`) y soporte de `autoComplete`.
  - Botón para **ver/ocultar contraseña** (`bi-eye` / `bi-eye-slash`) para evitar errores de tipeo al ingresar desde otros dispositivos.
  - Recuperación de clave integrada (`sendPasswordResetEmail`) mediante el botón **"¿Olvidaste tu contraseña?"**.
- **Protección de Rutas**: `ProtectedRoute.tsx` envuelve todas las rutas internas (`/`, `/gestion`, `/ordenes`, `/presupuestos`, `/presupuesto-it`, `/orden/:id`, `/clientes`, `/proveedores`, `/productos`, `/ventas`, `/equipos`, `/scrap`, `/kb`, `/visitas`, `/beneficios-promo`, `/abonos`, `/settings`). Solo `/login` y `/seguimiento/:codigo` son públicas.
- **Cierre de Sesión por Inactividad (`AuthContext.tsx`)**:
  - Tiempo máximo de inactividad: **30 minutos** (`INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000`).
  - Monitorea eventos de interacción (`mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll`, `click`), cambios de visibilidad de pestaña (`visibilitychange`) y sincronización entre pestañas mediante `localStorage` (`sontech_last_activity`).
  - Si el equipo entra en suspensión o se cierra el navegador y se reabre pasados los 30 minutos de inactividad, cierra la sesión automáticamente (`signOut(auth)`), notifica `"🔒 Sesión cerrada por inactividad"` y redirige a `/login`.
- **Cierre de Sesión Manual**: Accesible desde la barra superior (`Navbar.tsx`), limpia `sontech_last_activity` y ejecuta `signOut(auth)`.

---

## 💻 7. Guía de Puesta en Marcha y Desarrollo Local

### Prerrequisitos
- Node.js versión 18 o superior (recomendado Node 20 LTS o 22 LTS).
- Cuenta/proyecto activo en Firebase con Firestore y Auth habilitados.

### Variables de Entorno (`.env`)
Crear un archivo `.env` en la raíz del proyecto basado en `.env.example`:

```env
VITE_FIREBASE_API_KEY="tu_api_key"
VITE_FIREBASE_AUTH_DOMAIN="tu_proyecto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="tu_proyecto"
VITE_FIREBASE_STORAGE_BUCKET="tu_proyecto.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="tu_sender_id"
VITE_FIREBASE_APP_ID="tu_app_id"
```

### Comandos de Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo en local (puerto por defecto 5173)
npm run dev

# 3. Compilar para producción (TypeScript check + Vite build)
npm run build

# 4. Previsualizar la compilación de producción localmente
npm run preview

# 5. Ejecutar linter
npm run lint
```

> [!TIP]
> **Nota para Windows (PowerShell):**  
> Si PowerShell bloquea scripts con el mensaje *"la ejecución de scripts está deshabilitada en este sistema"*, puedes:
> 1. Ejecutar el comando a través del CMD: `cmd.exe /c "npm run dev"`
> 2. O habilitar temporalmente la ejecución para tu sesión de PowerShell:  
>    `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

---

## ⚠️ 8. Buenas Prácticas y Puntos Críticos de Atención

1. **Evitar `undefined` en Firestore**:
   - Firestore rechaza objetos con propiedades que tengan valor `undefined` (lanza error `Function DocumentReference.set() called with invalid data`).
   - Por esta razón, se desarrollaron las utilidades `pruneDeep` (en `flujo.ts`) y `pruneUndefined` (en `presupuestos.ts` / `utils.ts`).
   - **Regla**: Todo nuevo servicio que guarde o actualice documentos con campos opcionales debe pasar los datos por estas funciones sanitizadoras antes de invocar Firebase.

2. **Transacciones Atómicas (`runTransaction`)**:
   - Tanto la numeración anual (`counters/...`), como el registro de pagos (`registrarPago`), la eliminación de pagos (`eliminarPago`) y la aceptación de cotizaciones (`aceptarPresupuesto`) se ejecutan dentro de `runTransaction`.
   - **Regla**: Nunca actualizar saldos o contadores secuenciales con `updateDoc` manual sin transacción; de lo contrario, se pueden producir duplicaciones de códigos o descuadres en las cuentas por cobrar.

3. **Generación de PDFs con Logos**:
   - En `src/lib/pdf.ts`, `jsPDF` requiere que las imágenes estén en formato base64 (`data:image/png;base64,...`).
   - Para ello se utiliza la función auxiliar `toDataURL(url)`. Si el logo se actualiza desde una URL remota en `Settings`, dicha URL debe permitir peticiones CORS para poder ser dibujada en el PDF.

---

## 🚀 9. Ideas y Hoja de Ruta para Futuras Mejoras

- [x] **Envío Directo por WhatsApp**: Integrado en `src/lib/whatsapp.ts` para envío rápido de presupuestos, órdenes y avisos de retiro.
- [x] **Gestión de Stock de Repuestos y POS**: Implementado catálogo en `Productos.tsx`, `Ventas.tsx` y `Proveedores.tsx`.
- [x] **Portal Público de Seguimiento**: Implementado en `TrackingPublico.tsx` (`/seguimiento/:codigo`).
- [x] **Módulo de Beneficios Promocionales**: Implementado en `BeneficiosPromo.tsx` con sincronización automática con OT.
- [x] **Seguridad en Login e Inactividad**: Ver/ocultar contraseña, recuperación por email y cierre automático tras 30 minutos de inactividad.
- [x] **Individualización de Presupuestos y Órdenes de Trabajo**: Pantallas separadas (`/presupuestos` y `/gestion`) y edición completa de datos en OT.
- [ ] **Adjuntos en Taller**: Permitir subir fotografías del estado estético del equipo (roturas, rayones previos) al momento de recibirlo, almacenándolas en Firebase Storage e incluyéndolas en la ficha de la orden.
- [ ] **Filtros Avanzados en Dashboard**: Filtros por rango de fechas (mes actual, trimestre) y exportación de reportes contables a Excel/CSV.
- [ ] **Roles de Usuario**: Diferenciación entre rol *Técnico* (solo ve tareas y diagnóstico) y rol *Administrador* (ve saldos, pagos y configuración de empresa).

---

## 📜 10. Historial de Modificaciones (Memoria de Movimientos)

> **Regla de mantenimiento:** Toda modificación, corrección o nueva funcionalidad realizada en el proyecto debe registrarse en esta sección indicando fecha, archivos tocados y detalle del cambio para mantener la trazabilidad completa.

### `2026-10-30` — Optimización Integral Responsiva Móvil y Eliminación de Auto-Zoom en todos los Sectores
- **Archivos modificados/creados:** `index.html`, `src/App.tsx`, `src/index.css`, `src/components/Navbar.tsx`, `src/components/ItemsTableIT.tsx`, `src/pages/Login.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Home.tsx`, `src/pages/Presupuestos.tsx`, `src/pages/PresupuestoIT.tsx`, `src/pages/Orden.tsx`, `src/pages/Clientes.tsx`, `src/pages/Productos.tsx`, `src/pages/Ventas.tsx`, `src/pages/BeneficiosPromo.tsx`, `src/pages/TrackingPublico.tsx`, `src/pages/Settings.tsx`, `src/pages/Proveedores.tsx`, `src/pages/Equipos.tsx`, `src/pages/ConsumiblesScrap.tsx`, `src/pages/BaseConocimiento.tsx`, `src/pages/VisitasTecnicas.tsx`, `src/pages/Abonos.tsx`, `readme-presu.md`
- **Detalle:**
  - **Eliminación del auto-zoom móvil en Login e inputs:** Los campos `.form-control`, `.form-select`, `.form-control-sm` y `.form-select-sm` tenían `font-size: 14px` (`0.875rem`), lo que provocaba que iOS Safari y navegadores móviles hicieran auto-zoom (~1.14x) al tocar el correo/contraseña en Login o cualquier buscador, arrastrando ese zoom al navegar entre rutas SPA. Se fijó `font-size: 16px !important` en todos los inputs/selects/textareas en pantallas `< 992px` y se actualizó `<meta name="viewport">` en `index.html`.
  - **Reseteo de foco/scroll entre rutas y unificación de contenedores (`App.tsx`):** Se incorporó `ViewportRouteReset` para desenfocar el elemento activo (`blur()`) y volver a `(0, 0)` en cada cambio de ruta, además de eliminar los contenedores `.container` duplicados que encogían el área útil en móvil.
  - **Corrección de desbordamiento del menú lateral (`Navbar.tsx`) y CSS global (`index.css`):** El drawer móvil `.nav-menu-drawer` ahora se monta únicamente cuando está abierto (`isOpen`), evitando que un panel `position: fixed` desplazado fuera del viewport ensanche el ancho percibido en celulares. Se aplicó `overflow-x: clip` y `text-size-adjust: 100%` en `html`, `body`, `#root` y `.app-main` (preservando `position: sticky` de la barra superior) y `min-width: 0` en hijos de grillas CSS/Bootstrap.
  - **Vistas nativas en tarjetas móviles (`d-md-none`) para tablas anchas:** Se diseñaron vistas de tarjetas adaptadas al celular en **Clientes**, **Inventario & Stock (`Productos`)**, **Punto de Venta & Historial (`Ventas`)**, **Turnero Promocional (`BeneficiosPromo`)** y **Checklist QA (`Orden`)**, eliminando la necesidad de alejar la pantalla con pellizco (*pinch-out*) para operar tablas de escritorio.
  - **Ajuste de grillas, cabeceras y Portal de Seguimiento:** Se adaptaron cabeceras de documentos e ítems en `PresupuestoIT`, `ItemsTableIT` y `Orden`, la barra de progreso de 5 etapas en `TrackingPublico` (ancho flexible en lugar de `5 x 80px` fijos), las métricas de `Dashboard` y los botones de acción/URLs largas en el resto de los módulos (`Proveedores`, `Equipos`, `ConsumiblesScrap`, `BaseConocimiento`, `VisitasTecnicas`, `Abonos`, `Settings`).

### `2026-10-27` — Corrección de Error 'removeChild' en Login (Conflicto con Traductor Automático y Extensiones)
- **Archivos modificados/creados:** `index.html`, `src/main.tsx`, `src/components/ErrorBoundary.tsx` *(nuevo)*, `src/pages/Login.tsx`, `src/pages/Dashboard.tsx`, `readme-presu.md`
- **Detalle:**
  - **Causa raíz:** En navegadores con traductor automático activado (Google Translate / Microsoft Edge Translator) o con extensiones que manipulan el DOM (gestores de contraseñas, correctores), el navegador inyecta etiquetas `<font>` o modifica nodos de texto directamente. Al autenticarse y transicionar desde el formulario de Login hacia el Dashboard, React intentaba remover nodos del DOM que habían sido alterados externamente, disparando la excepción fatal `Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node` y dejando la pantalla completamente en blanco.
  - **Parche defensivo de reconciliación DOM:** Se implementó en `src/main.tsx` la intercepción segura para `Node.prototype.removeChild` y `Node.prototype.insertBefore`, evitando que mutaciones externas en el árbol de nodos derriben la aplicación React.
  - **Desactivación de auto-traducción indebida:** Se corrigió en `index.html` la etiqueta a `<html lang="es" class="notranslate" translate="no">` junto al meta tag `<meta name="google" content="notranslate" />` y la clase `notranslate` en el contenedor de Login, impidiendo que los motores de traducción intenten traducir una interfaz que ya está en español nativo.
  - **Encapsulación de nodos de texto:** Se envolvieron cadenas de texto condicionales de botones y avisos de carga en elementos `<span>` para garantizar estabilidad ante el reconciliador de React 19.
  - **Error Boundary Global:** Se creó el componente `src/components/ErrorBoundary.tsx` envolviendo la app completa para capturar cualquier fallo imprevisto y ofrecer una vista amigable de recuperación con botón de recarga en lugar de pantalla en blanco.

### `2026-10-16` — Descuento Automático de Stock al Finalizar Orden de Trabajo
- **Archivos modificados:** `src/pages/Orden.tsx`, `src/types/orden.ts`
- **Detalle:**
  - Al cambiar el estado de una Orden de Trabajo a **`completado`** o **`entregado`**, el sistema ahora descuenta automáticamente del inventario (`ajustarStock`) todos los productos/repuestos del catálogo vinculados (tanto los heredados desde el presupuesto en `itemsPresupuesto` como los agregados en la sección de `repuestos` de la orden).
  - Se incorporó la bandera `stockDescontado: boolean` en el documento de la orden para evitar descuentos duplicados en guardados posteriores y reponer el stock automáticamente si la orden vuelve a abrirse a un estado previo.

### `2026-10-16` — Individualización de Presupuestos y Órdenes de Trabajo + Edición Completa de OT
- **Archivos modificados/creados:** `src/pages/Presupuestos.tsx` *(nuevo)*, `src/pages/Home.tsx`, `src/pages/Orden.tsx`, `src/pages/PresupuestoIT.tsx`, `src/App.tsx`, `src/components/Navbar.tsx`, `src/pages/Dashboard.tsx`
- **Detalle:**
  - **Pantallas separadas:** Se creó `src/pages/Presupuestos.tsx` en la ruta `/presupuestos` exclusivamente para gestionar presupuestos comerciales (buscar, filtrar, ver, editar, aceptar o anular), dejando `src/pages/Home.tsx` (`/gestion` y `/ordenes`) exclusivamente para **Órdenes de Trabajo (OT)** con filtros propios de taller y estado de pago, creación directa de OT (`+ Nueva Orden de Trabajo`) y eliminación de órdenes.
  - **Edición completa en Orden de Trabajo (`Orden.tsx`):** Ahora se pueden modificar directamente en la ficha de la OT los datos del **Cliente** (nombre y WhatsApp con autocompletado), los datos del **Equipo en Servicio** (tipo, marca, modelo, N° de serie/IMEI y PIN/clave), el **Importe Base ($)** y los **Ítems Iniciales de la Orden** (con recálculo en vivo de Total Final y Saldo Pendiente).
  - **Independencia de documentos:** Guardar modificaciones en una Orden de Trabajo actualiza únicamente la orden en Firestore sin pisar ni sobreescribir el presupuesto original, y viceversa.

### `2026-10-15` — Cierre de Sesión Automático por Inactividad
- **Archivos modificados:** `src/context/AuthContext.tsx`, `src/pages/Login.tsx`
- **Detalle:**
  - Se incorporó un control de inactividad de **30 minutos** (`INACTIVITY_TIMEOUT_MS`) cuando el usuario está autenticado.
  - Monitoreo de actividad del usuario (`mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll`, `click`) con persistencia en `localStorage` (`sontech_last_activity`) para sincronizar pestañas y detectar expiración incluso si la PC estuvo suspendida o con el navegador cerrado.
  - Al superarse el tiempo de inactividad, se ejecuta `signOut(auth)` automáticamente, se notifica `"🔒 Sesión cerrada por inactividad"` y se redirige a `/login`.

### `2026-10-15` — Mejoras de Usabilidad y Recuperación en Pantalla de Login
- **Archivos modificados:** `src/pages/Login.tsx`
- **Detalle:**
  - Se agregó botón con ícono de ojo (`bi-eye` / `bi-eye-slash`) para mostrar u ocultar la contraseña al escribirla (evitando errores `auth/invalid-credential` al loguearse desde otros equipos).
  - Se incorporó el botón **"¿Olvidaste tu contraseña?"** conectado a `sendPasswordResetEmail` de Firebase Auth para enviar el correo de restablecimiento directamente al usuario.
  - Se añadió sanitización automática del correo (`email.trim()`), atributos `autoComplete` y mensajes de error más claros.

### `2026-10-14` — Validación y Guardado de Presupuestos con Precios Directos o por Horas (`989ca6e`)
- **Archivos modificados:** `src/pages/PresupuestoIT.tsx`, `src/components/ItemsTableIT.tsx`, `src/lib/calc.ts`
- **Detalle:**
  - Corrección en la validación y cálculo de ítems de presupuesto para soportar indistintamente precios unitarios directos o cálculo por `horas * tarifaHora`.

### `2026-10-13` — Módulo Nativo de Beneficio Promocional y Sincronización OT (`09e5e6b`)
- **Archivos modificados:** `src/pages/BeneficiosPromo.tsx`, `src/services/beneficios.ts`, `src/types/beneficio.ts`, `src/pages/Orden.tsx`, `src/App.tsx`, `src/components/Navbar.tsx`
- **Detalle:**
  - Creación del módulo de beneficios promocionales para clientes y su sincronización directa con las Órdenes de Trabajo (OT).

### `2026-10-12` — Mejoras de Navegación y Diseño Responsivo Móvil (`66e3b7b`, `cc14b29`)
- **Archivos modificados:** `src/components/Navbar.tsx`, `src/index.css`
- **Detalle:**
  - Menús desplegables de navegación controlados por estado en React sin conflictos con Bootstrap JS.
  - Drawer lateral móvil de altura completa (`100dvh`) con backdrop difuminado y tablas/pestañas adaptadas a pantallas chicas.

### `2026-10-12` — Evolución a Sistema ERP y Lab Manager (`43748e2`)
- **Archivos modificados/creados:** `src/pages/*`, `src/services/*`, `src/types/*`, `firestore.rules`
- **Detalle:**
  - Expansión integral del sistema desde un generador de presupuestos hacia un ERP y Lab Manager completo: módulos de **Clientes**, **Proveedores**, **Productos/Inventario**, **Ventas (POS)**, **Equipos (CMDB)**, **Consumibles/Scrap**, **Base de Conocimiento (KB)**, **Visitas Técnicas**, **Abonos Mensuales** y **Portal Público de Seguimiento de OT** (`/seguimiento/:codigo`).

