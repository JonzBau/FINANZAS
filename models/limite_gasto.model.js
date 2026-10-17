const Conexion = require('../config/conexion'); // Importa la conexión a PostgreSQL

// fecha::text devuelve 'YYYY-MM-DD' tal cual, sin conversión de zona horaria
const COLUMNAS = 'pk_limite, fecha::text AS fecha, monto, comentario, status';

module.exports = {
    // Crear un nuevo límite de gasto (status lo pone la BD por DEFAULT)
    crear: (data) => Conexion.query(
        'INSERT INTO limite_gasto(fecha, monto, comentario) VALUES($1, $2, $3)',
        [data.fecha, data.monto, data.comentario]
    ),

    // Listar todos los límites activos (status = TRUE), más recientes primero
    listar: () => Conexion.query(
        `SELECT ${COLUMNAS} FROM limite_gasto WHERE status = TRUE ORDER BY fecha DESC`
    ),

    // Obtener un límite por su ID
    obtenerPorId: (id) => Conexion.query(
        `SELECT ${COLUMNAS} FROM limite_gasto WHERE pk_limite = $1 AND status = TRUE`,
        [id]
    ),

    // Actualizar datos de un límite
    actualizar: (id, data) => Conexion.query(
        'UPDATE limite_gasto SET fecha=$1, monto=$2, comentario=$3 WHERE pk_limite=$4',
        [data.fecha, data.monto, data.comentario, id]
    ),

    // Desactivar límite (soft delete - cambiar status a FALSE)
    desactivar: (id) => Conexion.query(
        'UPDATE limite_gasto SET status=FALSE WHERE pk_limite=$1',
        [id]
    ),

    // Eliminar límite permanentemente (hard delete)
    // NOTA: Fallará si tiene registros asociados por una FK RESTRICT
    desaparecer: (id) => Conexion.query(
        'DELETE FROM limite_gasto WHERE pk_limite=$1',
        [id]
    )
};