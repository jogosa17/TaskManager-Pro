# 🏗️ TaskManager Pro - Gestión de Obras y Reformas

Aplicación Web + Mobile para gestión de tareas en empresas de reformas y construcción.

El sistema permite la gestión centralizada de tareas, presupuestos, usuarios y documentación fotográfica de obras.

---

## 🚀 Stack Tecnológico

### Backend
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Multer / Cloud Storage (para subida de imágenes)

### Backoffice (Web Admin)
- React (Vite o Next.js)
- TailwindCSS
- Axios
- React Query

### Frontend Mobile
- React Native con Expo
- Expo Router
- Secure Store (para JWT)
- Axios
- React Query

---

## 👥 Roles del Sistema

### 🔹 DIOS
- Crear tareas
- Ver todas las tareas
- Marcar tareas como completadas
- Crear presupuestos
- Subir fotos
- Ver fotos
- Gestión de usuarios

### 🔹 ENCARGADO
- Crear tareas
- Ver tareas asignadas
- Marcar tareas como completadas
- Subir fotos
- Ver fotos

### 🔹 TRABAJADOR
- Ver tareas asignadas
- Marcar tareas como completadas
- Subir fotos
- Ver fotos

---

## 🧱 Funcionalidades Principales

### 📋 Gestión de Tareas
- Crear tarea (Backoffice y Encargado)
- Asignar tarea a trabajador
- Estado: Pendiente / En progreso / Finalizada
- Fecha límite
- Prioridad

### 💰 Presupuestos (Solo DIOS)
- Crear presupuesto
- Añadir partidas
- Precio por partida
- Total automático
- Exportar a PDF

### 📸 Gestión de Fotos
- Subida desde app móvil
- Asociación a tarea u obra
- Visualización por todos los usuarios
- Almacenamiento en cloud (S3 o similar)

### 👤 Gestión de Usuarios (Backoffice)
- Crear usuarios
- Asignar roles
- Activar / desactivar usuarios

---

## 🗄️ Modelo de Base de Datos (Resumen)

### User
- id
- name
- email
- password
- role (DIOS | ENCARGADO | TRABAJADOR)
- active
- createdAt

### Task
- id
- title
- description
- status
- priority
- dueDate
- assignedTo (User)
- createdBy (User)
- createdAt

### Budget
- id
- title
- clientName
- total
- createdBy (User)
- createdAt

### BudgetItem
- id
- budgetId
- description
- quantity
- unitPrice
- subtotal

### Photo
- id
- url
- taskId
- uploadedBy
- createdAt

---

## 🔐 Autenticación

- Login con email + password
- JWT access token
- Middleware de autorización por roles
- Protección de rutas en backend y frontend

---

## 📦 Instalación

### Backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev