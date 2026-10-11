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
    │   ├── Navbar.tsx           # Barra superior con drawer responsivo y enlaces de navegación
    │   ├── ProtectedRoute.tsx   # Guardián de rutas autenticadas (redirige a /login)
    │   ├── ItemsTableIT.tsx     # Tabla interactiva dinámica para añadir/eliminar ítems de presupuesto
    │   └── Container.tsx        # [Archivo vacío - candidato a limpieza]
    │
    ├── context/                 # Estado global de la aplicación
    │   └── AuthContext.tsx      # Proveedor de autenticación (onAuthStateChanged, user, logout)
    │
    ├── lib/                     # Librerías de soporte y utilidades puras
    │   ├── firebase.ts          # Inicialización del SDK de Firebase (db, auth, storage)
    │   ├── calc.ts              # Cálculos matemáticos: subtotales, descuentos, bonificaciones, total
    │   ├── pdf.ts               # Lógica de dibujo de PDFs comerciales y de informes técnicos
    │   └── print.ts             # Utilidad de impresión en iframe silencioso
    │
    ├── pages/                   # Páginas / Vistas completas de la aplicación
    │   ├── Login.tsx            # Formulario de inicio de sesión con estética Glassmorphism
    │   ├── Dashboard.tsx        # Métricas comerciales y estado de órdenes
    │   ├── Home.tsx             # Panel de "Gestión": listado de presupuestos y órdenes con filtros
    │   ├── PresupuestoIT.tsx    # Creación, edición, visualización y exportación de presupuestos
    │   ├── Orden.tsx            # Ficha de Orden de Trabajo (diagnóstico, extras, pagos, cierre)
    │   ├── Settings.tsx         # Configuración del negocio (nombre, dirección, teléfono, logo)
    │   └── PresupuestoNuevo.tsx # [Archivo vacío - candidato a limpieza]
    │
    ├── services/                # Capa de comunicación con Firebase Firestore
    │   ├── flujo.ts             # Transacciones críticas: aceptar presupuesto, registrar/borrar pago, sincronizar
    │   ├── presupuestos.ts      # CRUD y numeración anual de presupuestos
    │   ├── ordenes.ts           # Consulta y paginación de órdenes de trabajo
    │   └── settings.ts          # Lectura y guardado de datos corporativos
    │
    ├── styles/                  # Hojas de estilo específicas
    │   └── print.css            # Estilos para impresión en papel / ocultamiento de elementos UI
    │
    └── types/                   # Definiciones de tipos TypeScript
        ├── common.ts            # Monedas, métodos de pago, estados generales
        ├── presupuesto.ts       # Esquema de Presupuesto, Ítem, Aceptación y Garantía
        ├── orden.ts             # Esquema de Orden de Trabajo, Equipo, Trabajos y Repuestos
        └── pago.ts              # Esquema de registro de Pagos
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

### Reglas Clave de Sincronización:
1. **Presupuesto $\rightarrow$ Orden**: Al aceptar un presupuesto, se copian los datos del cliente, equipo cotizado y se fija el `totalEstimado` y `saldo` inicial.
2. **Orden $\rightarrow$ Presupuesto**: Si en la orden de trabajo se agregan trabajos o repuestos adicionales, la función `onSubmit` en `Orden.tsx` actualiza también el documento del presupuesto original para que la cotización refleje los nuevos costos agregados en taller.
3. **Presupuesto $\rightarrow$ Orden**: Si se edita un presupuesto que ya posee una orden asociada (`currentOrdenId`), se ejecuta `sincronizarOrdenConPresupuesto(...)` recalculando saldos sin perder los extras ya cargados en la orden.

---

## 🔒 6. Autenticación y Seguridad

- **Mecanismo**: Firebase Authentication basado en Email/Contraseña.
- **Protección de Rutas**: `ProtectedRoute.tsx` envuelve todas las rutas principales (`/`, `/gestion`, `/presupuesto-it`, `/orden/:id`, `/settings`). Si no hay sesión activa en `AuthContext`, redirige automáticamente a `/login` preservando la ruta previa en el estado para retornar al autenticar.
- **Cierre de Sesión**: Accesible desde la barra superior (`Navbar.tsx`), ejecuta `signOut(auth)`.

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
   - Por esta razón, se desarrollaron las utilidades `pruneDeep` (en `flujo.ts`) y `pruneUndefined` (en `presupuestos.ts`).
   - **Regla**: Todo nuevo servicio que guarde o actualice documentos con campos opcionales debe pasar los datos por estas funciones sanitizadoras antes de invocar Firebase.

2. **Transacciones Atómicas (`runTransaction`)**:
   - Tanto la numeración anual (`counters/...`), como el registro de pagos (`registrarPago`), la eliminación de pagos (`eliminarPago`) y la aceptación de cotizaciones (`aceptarPresupuesto`) se ejecutan dentro de `runTransaction`.
   - **Regla**: Nunca actualizar saldos o contadores secuenciales con `updateDoc` manual sin transacción; de lo contrario, se pueden producir duplicaciones de códigos o descuadres en las cuentas por cobrar.

3. **Generación de PDFs con Logos**:
   - En `src/lib/pdf.ts`, `jsPDF` requiere que las imágenes estén en formato base64 (`data:image/png;base64,...`).
   - Para ello se utiliza la función auxiliar `toDataURL(url)`. Si el logo se actualiza desde una URL remota en `Settings`, dicha URL debe permitir peticiones CORS para poder ser dibujada en el PDF.

4. **Archivos Huérfanos a Considerar**:
   - `src/pages/PresupuestoNuevo.tsx`: Archivo con 0 bytes (no se utiliza en las rutas).
   - `src/components/Container.tsx`: Archivo con 0 bytes.
   - `src/pdf.ts`: Archivo con 0 bytes en la raíz de `src/` (el código real y activo reside en `src/lib/pdf.ts`).
   - Estos archivos pueden removerse con seguridad si se desea limpiar el árbol de trabajo.

---

## 🚀 9. Ideas y Hoja de Ruta para Futuras Mejoras

- [ ] **Adjuntos en Taller**: Permitir subir fotografías del estado estético del equipo (roturas, rayones previos) al momento de recibirlo, almacenándolas en Firebase Storage e incluyéndolas en la ficha de la orden.
- [ ] **Envío Directo por WhatsApp**: Integrar un botón con la API de `wa.me` para enviar al cliente un mensaje predefinido con el enlace o resumen de su presupuesto o aviso de *"Equipo listo para retirar"*.
- [ ] **Gestión de Stock de Repuestos**: Vincular la lista de repuestos usados a una colección de inventario con alertas de reposición.
- [ ] **Filtros Avanzados en Dashboard**: Filtros por rango de fechas (mes actual, trimestre) y exportación de reportes contables a Excel/CSV.
- [ ] **Roles de Usuario**: Diferenciación entre rol *Técnico* (solo ve tareas y diagnóstico) y rol *Administrador* (ve saldos, pagos y configuración de empresa).
