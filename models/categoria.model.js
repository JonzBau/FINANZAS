const Conexion = require('../config/conexion'); // Importa la conexión a PostgreSQL

module.exports = {
    // Crear una nueva categoría
    crear: (data) => Conexion.query(
        'INSERT INTO categoria(nombre_categoria) VALUES($1)',
        [data.nombre_categoria]
    ),

    // Listar todas las categorías activas (status = TRUE)
    listar: () => Conexion.query(
        'SELECT * FROM categoria WHERE status = TRUE ORDER BY pk_categoria ASC'
    ),

    // Obtener una categoría por su ID
    obtenerPorId: (id) => Conexion.query(
        'SELECT * FROM categoria WHERE pk_categoria = $1 AND status = TRUE',
        [id]
    ),

    // Actualizar datos de una categoría
    actualizar: (id, data) => Conexion.query(
        'UPDATE categoria SET nombre_categoria=$1 WHERE pk_categoria=$2',
        [data.nombre_categoria, id]
    ),

    // Desactivar categoría (soft delete - cambiar status a FALSE)
    desactivar: (id) => Conexion.query(
        'UPDATE categoria SET status=FALSE WHERE pk_categoria=$1',
        [id]
    ),

    // Eliminar categoría permanentemente (hard delete)
    // NOTA: Fallará si tiene registros asociados por una FK RESTRICT
    desaparecer: (id) => Conexion.query(
        'DELETE FROM categoria WHERE pk_categoria=$1',
        [id]
    )
};