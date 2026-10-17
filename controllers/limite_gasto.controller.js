const limite = require('../models/limite_gasto.model'); // Importa el modelo de límite de gasto

// Valida y limpia el body; devuelve { error } o { data }
function validar(body) {
    const fecha = (body.fecha || '').trim();
    const comentario = (body.comentario || '').trim();
    const monto = Number(body.monto);

    // Formato YYYY-MM-DD y que sea una fecha real (rechaza 2026-02-31)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(new Date(fecha + 'T00:00:00Z')) ||
        new Date(fecha + 'T00:00:00Z').toISOString().slice(0, 10) !== fecha) {
        return { error: 'La fecha no es válida' };
    }
    if (body.monto === '' || body.monto === null || body.monto === undefined || isNaN(monto)) {
        return { error: 'El monto debe ser un número válido' };
    }
    if (monto < 0) {
        return { error: 'El monto no puede ser negativo' };
    }
    // DECIMAL(10,2) admite hasta 99,999,999.99
    if (monto >= 100000000) {
        return { error: 'El monto excede el máximo permitido' };
    }

    return {
        data: {
            fecha,
            monto,
            comentario: comentario || null // Vacío => NULL
        }
    };
}

// Crear un nuevo límite de gasto
exports.crear = async (req, res) => {
    try {
        const { error, data } = validar(req.body);
        if (error) return res.status(400).json({ error });

        await limite.crear(data);
        res.json({ mensaje: 'Límite de gasto creado exitosamente' });
    } catch (error) {
        // 23505 = violación de UNIQUE (ya existe un límite para esa fecha)
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un límite de gasto para esa fecha' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Listar todos los límites activos
exports.listar = async (req, res) => {
    try {
        const data = await limite.listar();
        res.json(data.rows); // Devuelve solo las filas
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener un límite específico por ID
exports.obtenerPorId = async (req, res) => {
    try {
        const data = await limite.obtenerPorId(req.params.id);
        if (!data.rows[0]) {
            return res.status(404).json({ error: 'Límite de gasto no encontrado' });
        }
        res.json(data.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar un límite existente
exports.actualizar = async (req, res) => {
    try {
        const { error, data } = validar(req.body);
        if (error) return res.status(400).json({ error });

        await limite.actualizar(req.params.id, data);
        res.json({ mensaje: 'Límite de gasto actualizado exitosamente' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un límite de gasto para esa fecha' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Desactivar límite (soft delete)
exports.desactivar = async (req, res) => {
    try {
        await limite.desactivar(req.params.id);
        res.json({ mensaje: 'Límite de gasto desactivado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar límite permanentemente (hard delete)
exports.desaparecer = async (req, res) => {
    try {
        await limite.desaparecer(req.params.id);
        res.json({ mensaje: 'Límite de gasto eliminado permanentemente' });
    } catch (error) {
        // 23503 = violación de llave foránea en PostgreSQL
        if (error.code === '23503') {
            return res.status(409).json({ error: 'No se puede eliminar: el límite tiene registros asociados' });
        }
        res.status(500).json({ error: error.message });
    }
};