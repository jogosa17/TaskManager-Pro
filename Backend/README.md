# 🚀 TaskManager Pro - Backend

API REST para gestión de tareas en empresas de reformas y construcción.

## 📋 Características

- ✅ **Autenticación JWT** con roles (DIOS, ENCARGADO, TRABAJADOR)
- ✅ **Gestión de usuarios** con credenciales automáticas
- ✅ **CRUD completo** de tareas, presupuestos y fotos
- ✅ **Sistema de permisos** por rol
- ✅ **Subida de imágenes** (base64 por ahora, Cloudinary próximamente)
- ✅ **Validaciones** con Zod
- ✅ **MySQL** con conexión optimizada

## 🛠️ Instalación

### 1. Base de Datos MySQL

```sql
-- Crear base de datos
CREATE DATABASE taskmanager;

-- Importar el esquema
mysql -u gptemp365 -p taskmanager < src/database/schema.sql
```

### 2. Configuración

```bash
# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tus credenciales
DB_HOST=localhost
DB_PORT=3306
DB_USER=gptemp365
DB_PASSWORD=tu_password
DB_NAME=taskmanager
JWT_SECRET=secreto_muy_seguro
```

### 3. Dependencias

```bash
npm install
```

### 4. Ejecutar

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📡 Endpoints

### 🔐 Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/refresh` - Refrescar token

### 👥 Usuarios
- `GET /api/users` - Listar usuarios (solo DIOS)
- `POST /api/users` - Crear usuario (solo DIOS)
- `GET /api/users/:id` - Ver usuario
- `PUT /api/users/:id` - Actualizar usuario (solo DIOS)
- `DELETE /api/users/:id` - Eliminar usuario (solo DIOS)

### 📋 Tareas
- `GET /api/tasks` - Listar tareas (con filtros por rol)
- `POST /api/tasks` - Crear tarea (DIOS o ENCARGADO)
- `GET /api/tasks/:id` - Ver tarea
- `PUT /api/tasks/:id` - Actualizar tarea
- `DELETE /api/tasks/:id` - Eliminar tarea (DIOS o ENCARGADO)

### 💰 Presupuestos
- `GET /api/budgets` - Listar presupuestos (solo DIOS)
- `POST /api/budgets` - Crear presupuesto (solo DIOS)
- `GET /api/budgets/:id` - Ver presupuesto con items
- `PUT /api/budgets/:id` - Actualizar presupuesto (solo DIOS)
- `DELETE /api/budgets/:id` - Eliminar presupuesto (solo DIOS)
- `POST /api/budgets/:id/items` - Añadir item a presupuesto

### 📸 Fotos
- `GET /api/photos` - Listar fotos (con filtros)
- `POST /api/photos` - Subir foto
- `GET /api/photos/:id` - Ver foto
- `DELETE /api/photos/:id` - Eliminar foto
- `GET /api/photos/task/:taskId` - Fotos de una tarea
- `GET /api/photos/budget/:budgetId` - Fotos de un presupuesto

## 🔐 Roles y Permisos

### DIOS
- ✅ Todo el acceso total
- ✅ Gestión de usuarios
- ✅ Crear/eliminar presupuestos
- ✅ Ver todas las tareas y fotos

### ENCARGADO
- ✅ Crear tareas para trabajadores
- ✅ Ver tareas asignadas a sus trabajadores
- ✅ Subir fotos a tareas
- ❌ No puede gestionar usuarios ni presupuestos

### TRABAJADOR
- ✅ Ver sus tareas asignadas
- ✅ Marcar tareas como en progreso/finalizadas
- ✅ Subir fotos a sus tareas
- ❌ No puede crear tareas ni ver otras tareas

## 🧪 Ejemplos de Uso

### Login (DIOS)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "A1234", "password": "1234"}'
```

### Crear Trabajador
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_JWT" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@empresa.com",
    "dni": "87654321B",
    "role": "TRABAJADOR"
  }'
```

### Crear Tarea
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_JWT" \
  -d '{
    "title": "Instalar cocina",
    "description": "Montar cocina completa con encimera",
    "priority": "ALTA",
    "due_date": "2024-12-31",
    "assigned_to": 2,
    "project_name": "Reforma piso central",
    "location": "Calle Mayor 23, Madrid"
  }'
```

## 🗄️ Estructura de Datos

### Usuarios
- **username**: LetraDNI + 4 números (autogenerado)
- **password**: 4 números del DNI (autogenerado)
- **role**: DIOS | ENCARGADO | TRABAJADOR

### Tareas
- **status**: PENDIENTE | EN_PROGRESO | FINALIZADA
- **priority**: BAJA | MEDIA | ALTA | URGENTE

### Presupuestos
- **status**: BORRADOR | ENVIADO | ACEPTADO | RECHAZADO
- **IVA/IRPF**: Configurables

## 🚀 Próximamente

- 📱 Notificaciones Push con Expo
- ☁️ Integración Cloudinary para fotos
- 📊 Dashboard analítico
- 🔄 Sincronización offline
- 📄 Exportación PDF de presupuestos

## 📝 Notas

- Las contraseñas son 4 números del DNI (sin encriptar por requerimiento)
- Los usernames son de solo lectura y se generan automáticamente
- La base de datos usa usuario `gptemp365` como configurado
- Las fotos se guardan como base64 temporalmente
