
---

# 🗺️ Roadmap.md

Este roadmap está pensado en fases reales de desarrollo profesional.

```markdown
# 🗺️ Roadmap - TaskManager Pro

---

# 🔵 FASE 1 - Arquitectura Base

## Objetivos
- Crear repositorio monorepo (Turborepo recomendado)
- Configurar Backend base
- Configurar base de datos
- Configurar autenticación JWT

## Tareas
- Setup Node + Express
- Configurar Prisma
- Crear modelo User
- Implementar login
- Middleware de roles

✔ Resultado esperado:
Sistema con login funcional y roles operativos.

---

# 🔵 FASE 2 - Gestión de Tareas

## Objetivos
- CRUD completo de tareas
- Asignación de tareas
- Cambio de estado

## Backend
- CRUD Task
- Endpoint de asignación
- Filtro por usuario

## Frontend Mobile
- Pantalla listado tareas
- Pantalla detalle tarea
- Marcar como completada

## Backoffice
- Panel listado tareas
- Crear tarea
- Asignar trabajador

✔ Resultado esperado:
Flujo completo de gestión de tareas funcional.

---

# 🔵 FASE 3 - Subida de Fotos

## Objetivos
- Subida de imágenes desde Expo
- Almacenamiento en cloud
- Visualización de galería

## Backend
- Endpoint upload
- Integración S3 o Cloudinary
- Relación Photo ↔ Task

## Mobile
- Selector de imágenes (Expo ImagePicker)
- Galería por tarea

✔ Resultado esperado:
Usuarios pueden subir y visualizar fotos.

---

# 🔵 FASE 4 - Presupuestos

## Objetivos
- Sistema completo de presupuestos

## Backend
- CRUD Budget
- CRUD BudgetItem
- Cálculo automático total

## Frontend (DIOS)
- Crear presupuesto
- Añadir partidas dinámicamente
- Exportación a PDF

✔ Resultado esperado:
Generación de presupuestos funcional.

---

# 🔵 FASE 5 - Seguridad y Optimización

- Validaciones con Zod
- Protección avanzada por roles
- Rate limiting
- Logs
- Optimización queries

---

# 🔵 FASE 6 - Producción

- Deploy backend (Railway / Render / VPS)
- Deploy backoffice (Vercel)
- Build Expo (EAS)
- Configuración dominio
- HTTPS

---

# 🔵 FASE 7 - Escalabilidad

- Notificaciones push
- Dashboard analítico
- Multiempresa
- Control horario