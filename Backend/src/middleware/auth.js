const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }

    next();
  };
};

// Middleware para verificar si es DIOS (rol máximo)
const requireDIOS = requireRole(['DIOS']);

// Middleware para DIOS o ENCARGADO
const requireDIOSOrEncargado = requireRole(['DIOS', 'ENCARGADO']);

module.exports = {
  authenticateToken,
  requireRole,
  requireDIOS,
  requireDIOSOrEncargado
};
