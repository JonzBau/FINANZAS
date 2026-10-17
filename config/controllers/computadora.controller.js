const computadora = require('../models/computadora.model'); // Importa el modelo de categoriass

// Crear un nuevo computadora
exports.crear = async (req, res) => {
    try {
        await computadora.crear(req.body); // Inserta los datos del body
        res.json({ mensaje: 'computadora creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message }); // Maneja errores (ej: email duplicado)
    }
};

// Listar todos los computadoras activos
exports.listar = async (req, res) => {
    try {
        const data = await computadora.listar(); // Obtiene todos los computadoras
        res.json(data.rows); // Devuelve solo las filas
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener un computadora específico por ID
exports.obtenerPorId = async (req, res) => {
    try {
        const data = await computadora.obtenerPorId(req.params.id);
        res.json(data.rows[0]); // Devuelve solo el primer registro
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar un computadora existente
exports.actualizar = async (req, res) => {
    try {
        await computadora.actualizar(req.params.id, req.body); // Actualiza con el ID de la URL
        res.json({ mensaje: 'computadora actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Desactivar computadora (soft delete)
exports.desactivar = async (req, res) => {
    try {
        await computadora.desactivar(req.params.id);
        res.json({ mensaje: 'computadora desactivado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar computadora permanentemente (hard delete)
exports.desaparecer = async (req, res) => {
    try {
        await computadora.desaparecer(req.params.id);
        res.json({ mensaje: 'computadora eliminado permanentemente' });
    } catch (error) {
        // Si tiene pedidos asociados, PostgreSQL lanzará error por la FK RESTRICT
        res.status(500).json({ error: 'No se puede eliminar: el computadora tiene pedidos asociados' });
    }
};