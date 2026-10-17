const Conexion = require('../config/conexion'); // Importa la conexión a PostgreSQL

module.exports = {
    // Crear un nuevo gasto (fecha_hora y status los pone la BD por DEFAULT)
    crear: (data) => Conexion.query(
        `INSERT INTO gasto(nombre_gasto, total, description, cantidad, precio, fk_categoria)
         VALUES($1, $2, $3, $4, $5, $6)`,
        [data.nombre_gasto, data.total, data.description, data.cantidad, data.precio, data.fk_categoria]
    ),

    // Listar todos los gastos activos (status = TRUE), los más recientes primero
    listar: () => Conexion.query(
        `SELECT g.*, c.nombre_categoria
         FROM gasto g
         LEFT JOIN categoria c ON c.pk_categoria = g.fk_categoria
         WHERE g.status = TRUE
         ORDER BY g.fecha_hora DESC, g.pk_gasto DESC`
    ),

    // Obtener un gasto por su ID
    obtenerPorId: (id) => Conexion.query(
        `SELECT g.*, c.nombre_categoria
         FROM gasto g
         LEFT JOIN categoria c ON c.pk_categoria = g.fk_categoria
         WHERE g.pk_gasto = $1 AND g.status = TRUE`,
        [id]
    ),

    // Actualizar datos de un gasto
    actualizar: (id, data) => Conexion.query(
        `UPDATE gasto
         SET nombre_gasto=$1, total=$2, description=$3, cantidad=$4, precio=$5, fk_categoria=$6
         WHERE pk_gasto=$7`,
        [data.nombre_gasto, data.total, data.description, data.cantidad, data.precio, data.fk_categoria, id]
    ),

    // Desactivar gasto (soft delete - cambiar status a FALSE)
    desactivar: (id) => Conexion.query(
        'UPDATE gasto SET status=FALSE WHERE pk_gasto=$1',
        [id]
    ),

    // Eliminar gasto permanentemente (hard delete)
    // NOTA: Fallará si tiene registros asociados por una FK RESTRICT
    desaparecer: (id) => Conexion.query(
        'DELETE FROM gasto WHERE pk_gasto=$1',
        [id]
    )
};