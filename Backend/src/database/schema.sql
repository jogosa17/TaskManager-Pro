-- Base de datos para TaskManager Pro - Gestión de Obras y Reformas

CREATE DATABASE IF NOT EXISTS taskmanager;
USE taskmanager;

-- Tabla de Usuarios
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    dni VARCHAR(9) UNIQUE NOT NULL,
    username VARCHAR(10) UNIQUE NOT NULL,  -- LetraDNI + 4 números
    password VARCHAR(10) NOT NULL,         -- 4 números del DNI
    role ENUM('DIOS', 'ENCARGADO', 'TRABAJADOR') NOT NULL DEFAULT 'TRABAJADOR',
    active BOOLEAN DEFAULT TRUE,
    push_token VARCHAR(255),               -- Token para notificaciones push
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Tareas
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('PENDIENTE', 'EN_PROGRESO', 'FINALIZADA') DEFAULT 'PENDIENTE',
    priority ENUM('BAJA', 'MEDIA', 'ALTA', 'URGENTE') DEFAULT 'MEDIA',
    due_date DATE,
    assigned_to INT,
    created_by INT NOT NULL,
    project_name VARCHAR(100),            -- Nombre de la obra/reforma
    location VARCHAR(255),                -- Ubicación de la obra
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabla de Presupuestos
CREATE TABLE budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    client_dni VARCHAR(9),
    project_description TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0,
    iva_rate DECIMAL(5,2) DEFAULT 21.00,
    iva_amount DECIMAL(10,2) DEFAULT 0,
    irpf_rate DECIMAL(5,2) DEFAULT 0.00,
    irpf_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    status ENUM('BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO') DEFAULT 'BORRADOR',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabla de Partidas de Presupuesto
CREATE TABLE budget_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    budget_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- Tabla de Fotos
CREATE TABLE photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    public_id VARCHAR(255),              -- ID de Cloudinary
    task_id INT,
    budget_id INT,
    description TEXT,
    uploaded_by INT NOT NULL,
    file_size INT,                       -- Tamaño en bytes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (budget_id) REFERENCES budgets(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Tabla de Plantillas de Presupuestos
CREATE TABLE budget_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabla de Partidas de Plantillas
CREATE TABLE template_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES budget_templates(id) ON DELETE CASCADE
);

-- Tabla de Configuración de Impuestos
CREATE TABLE tax_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    type ENUM('IVA', 'IRPF') NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración de impuestos por defecto
INSERT INTO tax_config (name, rate, type, is_default) VALUES
('IVA Superreducido 4%', 4.00, 'IVA', FALSE),
('IVA Reducido 10%', 10.00, 'IVA', FALSE),
('IVA General 21%', 21.00, 'IVA', TRUE),
('IRPF 1%', 1.00, 'IRPF', FALSE),
('IRPF 2%', 2.00, 'IRPF', FALSE),
('IRPF 7%', 7.00, 'IRPF', FALSE),
('IRPF 15%', 15.00, 'IRPF', TRUE);

-- Usuario DIOS por defecto (contraseña: 1234)
INSERT INTO users (name, email, dni, username, password, role) VALUES
('Administrador', 'admin@taskmanager.com', '12345678A', 'A1234', '1234', 'DIOS');

-- Índices para mejor rendimiento
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_budgets_created_by ON budgets(created_by);
CREATE INDEX idx_photos_task_id ON photos(task_id);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
