/**
 * Genera credenciales automáticas para trabajadores
 * Usuario: LetraDNI + 4 números aleatorios
 * Contraseña: 4 números aleatorios del DNI
 */
function generateCredentials(dni) {
  // Extraer letra del DNI
  const dniLetter = dni.slice(-1).toUpperCase();
  const dniNumbers = dni.slice(0, -1);
  
  // Generar 4 números aleatorios para el usuario
  const userRandomNumbers = Math.floor(1000 + Math.random() * 9000);
  const username = `${dniLetter}${userRandomNumbers}`;
  
  // Extraer 4 números aleatorios del DNI para la contraseña
  const passwordIndices = [];
  while (passwordIndices.length < 4) {
    const randomIndex = Math.floor(Math.random() * dniNumbers.length);
    if (!passwordIndices.includes(randomIndex)) {
      passwordIndices.push(randomIndex);
    }
  }
  
  const password = passwordIndices.map(index => dniNumbers[index]).join('');
  
  return {
    username,
    password,
    dni: dni.toUpperCase()
  };
}

/**
 * Valida formato de DNI español
 */
function validateDNI(dni) {
  const dniRegex = /^[0-9]{8}[A-Za-z]$/;
  return dniRegex.test(dni);
}

module.exports = {
  generateCredentials,
  validateDNI
};
