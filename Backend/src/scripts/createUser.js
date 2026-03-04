const mysql = require('mysql2/promise');
require('dotenv').config();

async function createUser() {
  try {
    // Conectar a la base de datos
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'taskmanager_db'
    });

    console.log('✅ Conectado a la base de datos');

    // Insertar nuevo usuario DIOS
    const [result] = await connection.execute(
      `INSERT INTO users (name, email, dni, username, password, role, active, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      ['Dios Segundo', 'dios2@taskmanager.com', 'D2233', 'D2233', '3434', 'DIOS', 1]
    );

    console.log(`✅ Usuario creado con ID: ${result.insertId}`);
    console.log('📋 Credenciales:');
    console.log('   Usuario: D2233');
    console.log('   Contraseña: 3434');
    console.log('   Rol: DIOS');

    // Cerrar conexión
    await connection.end();
    console.log('✅ Conexión cerrada');

  } catch (error) {
    console.error('❌ Error al crear usuario:', error);
    process.exit(1);
  }
}

createUser();
