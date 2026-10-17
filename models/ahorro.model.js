const Conexion = require('../config/conexion'); // Importa la conexión a PostgreSQL

module.exports = {
    // Crear un nuevo ahorro (fecha_hora y status los pone la BD por DEFAULT)
    crear: (data) => Conexion.query(
        'INSERT INTO ahorro(nombre_ahorro, monto, descripcion, ahorrado) VALUES($1, $2, $3, $4)',
        [data.nombre_ahorro, data.monto, data.descripcion, data.ahorrado]
    ),

    // Listar todos los ahorros activos (status = TRUE)
    listar: () => Conexion.query(
        'SELECT * FROM ahorro WHERE status = TRUE ORDER BY pk_ahorro ASC'
    ),

    // Obtener un ahorro por su ID
    obtenerPorId: (id) => Conexion.query(
        'SELECT * FROM ahorro WHERE pk_ahorro = $1 AND status = TRUE',
        [id]
    ),

    // Actualizar datos de un ahorro
    actualizar: (id, data) => Conexion.query(
        'UPDATE ahorro SET nombre_ahorro=$1, monto=$2, descripcion=$3, ahorrado=$4 WHERE pk_ahorro=$5',
        [data.nombre_ahorro, data.monto, data.descripcion, data.ahorrado, id]
    ),

    // Sumar un abono al monto ahorrado y devolver el nuevo total
    abonar: (id, cantidad) => Conexion.query(
        `UPDATE ahorro SET ahorrado = ahorrado + $1
         WHERE pk_ahorro = $2 AND status = TRUE
         RETURNING ahorrado`,
        [cantidad, id]
    ),

    // Desactivar ahorro (soft delete - cambiar status a FALSE)
    desactivar: (id) => Conexion.query(
        'UPDATE ahorro SET status=FALSE WHERE pk_ahorro=$1',
        [id]
    ),

    // Eliminar ahorro permanentemente (hard delete)
    // NOTA: Fallará si tiene registros asociados por una FK RESTRICT
    desaparecer: (id) => Conexion.query(
        'DELETE FROM ahorro WHERE pk_ahorro=$1',
        [id]
    )
};