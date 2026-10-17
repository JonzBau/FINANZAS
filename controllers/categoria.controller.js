const categoria = require('../models/categoria.model'); // Importa el modelo de categoría

// Crear una nueva categoría
exports.crear = async (req, res) => {
    try {
        const nombre = (req.body.nombre_categoria || '').trim();
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
        }

        await categoria.crear({ nombre_categoria: nombre });
        res.json({ mensaje: 'Categoría creada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Listar todas las categorías activas
exports.listar = async (req, res) => {
    try {
        const data = await categoria.listar();
        res.json(data.rows); // Devuelve solo las filas
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener una categoría específica por ID
exports.obtenerPorId = async (req, res) => {
    try {
        const data = await categoria.obtenerPorId(req.params.id);
        if (!data.rows[0]) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        res.json(data.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar una categoría existente
exports.actualizar = async (req, res) => {
    try {
        const nombre = (req.body.nombre_categoria || '').trim();
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
        }

        await categoria.actualizar(req.params.id, { nombre_categoria: nombre });
        res.json({ mensaje: 'Categoría actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Desactivar categoría (soft delete)
exports.desactivar = async (req, res) => {
    try {
        await categoria.desactivar(req.params.id);
        res.json({ mensaje: 'Categoría desactivada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar categoría permanentemente (hard delete)
exports.desaparecer = async (req, res) => {
    try {
        await categoria.desaparecer(req.params.id);
        res.json({ mensaje: 'Categoría eliminada permanentemente' });
    } catch (error) {
        // 23503 = violación de llave foránea en PostgreSQL
        if (error.code === '23503') {
            return res.status(409).json({ error: 'No se puede eliminar: la categoría tiene registros asociados' });
        }
        res.status(500).json({ error: error.message });
    }
};