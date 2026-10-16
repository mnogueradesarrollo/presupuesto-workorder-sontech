---
trigger: always_on
description: Registrar todas las modificaciones del proyecto en readme-presu.md para mantener una memoria de movimientos
---

# Regla de Memoria de Movimientos (`readme-presu.md`)

Cada vez que realices una modificación, corrección de errores o agregues una nueva funcionalidad en el proyecto:
1. Actualizá la sección **`## 📜 10. Historial de Modificaciones (Memoria de Movimientos)`** dentro de `readme-presu.md`.
2. Agregá una nueva entrada al principio del historial con:
   - **Fecha y título descriptivo** (ej. `### YYYY-MM-DD — Título del cambio`).
   - **Archivos modificados/creados**.
   - **Detalle** conciso de los cambios realizados.
3. Si el cambio agrega nuevos archivos o altera la arquitectura/seguridad, actualizá también las secciones correspondientes de `readme-presu.md` (como Estructura del Proyecto o Autenticación).
