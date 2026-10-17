const ahorro = require('../models/ahorro.model'); // Importa el modelo de ahorro

const MAX_DECIMAL = 100000000; // DECIMAL(10,2) admite hasta 99,999,999.99

// Convierte un valor opcional a número: vacío => null, inválido => NaN
function numeroOpcional(valor) {
    if (valor === '' || valor === null || valor === undefined) return null;
    return Number(valor);
}

// Valida y limpia el body; devuelve { error } o { data }
function validar(body) {
    const nombre_ahorro = (body.nombre_ahorro || '').trim();
    const descripcion = (body.descripcion || '').trim();
    const monto = numeroOpcional(body.monto);
    const ahorrado = numeroOpcional(body.ahorrado) ?? 0; // Vacío => 0

    if (!nombre_ahorro) {
        return { error: 'El nombre del ahorro es obligatorio' };
    }
    if (monto === null || isNaN(monto)) {
        return { error: 'El monto debe ser un número válido' };
    }
    if (isNaN(ahorrado)) {
        return { error: 'Lo ahorrado debe ser un número válido' };
    }
    if (monto < 0 || ahorrado < 0) {
        return { error: 'Los montos no pueden ser negativos' };
    }
    if (monto >= MAX_DECIMAL || ahorrado >= MAX_DECIMAL) {
        return { error: 'El monto excede el máximo permitido' };
    }

    return {
        data: {
            nombre_ahorro,
            monto,
            descripcion: descripcion || null, // Vacío => NULL
            ahorrado
        }
    };
}

// Crear un nuevo ahorro
exports.crear = async (req, res) => {
    try {
        const { error, data } = validar(req.body);
        if (error) return res.status(400).json({ error });

        await ahorro.crear(data);
        res.json({ mensaje: 'Ahorro creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Listar todos los ahorros activos
exports.listar = async (req, res) => {
    try {
        const data = await ahorro.listar();
        res.json(data.rows); // Devuelve solo las filas
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener un ahorro específico por ID
exports.obtenerPorId = async (req, res) => {
    try {
        const data = await ahorro.obtenerPorId(req.params.id);
        if (!data.rows[0]) {
            return res.status(404).json({ error: 'Ahorro no encontrado' });
        }
        res.json(data.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar un ahorro existente
exports.actualizar = async (req, res) => {
    try {
        const { error, data } = validar(req.body);
        if (error) return res.status(400).json({ error });

        await ahorro.actualizar(req.params.id, data);
        res.json({ mensaje: 'Ahorro actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Agregar un abono al ahorro
exports.abonar = async (req, res) => {
    try {
        const cantidad = numeroOpcional(req.body.cantidad);

        if (cantidad === null || isNaN(cantidad) || cantidad <= 0) {
            return res.status(400).json({ error: 'El abono debe ser un número mayor a 0' });
        }
        if (cantidad >= MAX_DECIMAL) {
            return res.status(400).json({ error: 'El abono excede el máximo permitido' });
        }

        // Redondeo a 2 decimales para evitar errores de coma flotante
        const data = await ahorro.abonar(req.params.id, Math.round(cantidad * 100) / 100);
        if (!data.rows[0]) {
            return res.status(404).json({ error: 'Ahorro no encontrado' });
        }

        res.json({ mensaje: 'Abono agregado exitosamente', ahorrado: data.rows[0].ahorrado });
    } catch (error) {
        // 22003 = el total ahorrado desbordaría DECIMAL(10,2)
        if (error.code === '22003') {
            return res.status(400).json({ error: 'El total ahorrado excede el máximo permitido' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Desactivar ahorro (soft delete)
exports.desactivar = async (req, res) => {
    try {
        await ahorro.desactivar(req.params.id);
        res.json({ mensaje: 'Ahorro desactivado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar ahorro permanentemente (hard delete)
exports.desaparecer = async (req, res) => {
    try {
        await ahorro.desaparecer(req.params.id);
        res.json({ mensaje: 'Ahorro eliminado permanentemente' });
    } catch (error) {
        // 23503 = violación de llave foránea en PostgreSQL
        if (error.code === '23503') {
            return res.status(409).json({ error: 'No se puede eliminar: el ahorro tiene registros asociados' });
        }
        res.status(500).json({ error: error.message });
    }
};