const gasto = require('../models/gasto.model'); // Importa el modelo de gasto

const MAX_DECIMAL = 100000000; // DECIMAL(10,2) admite hasta 99,999,999.99

// Convierte un valor opcional a número: vacío => null, inválido => NaN
function numeroOpcional(valor) {
    if (valor === '' || valor === null || valor === undefined) return null;
    return Number(valor);
}

// Valida y limpia el body; devuelve { error } o { data }
function validar(body) {
    const nombre_gasto = (body.nombre_gasto || '').trim();
    const description = (body.description || '').trim();
    const total = body.total === '' || body.total == null ? NaN : Number(body.total);
    const cantidad = numeroOpcional(body.cantidad);
    const precio = numeroOpcional(body.precio);
    const fk_categoria = numeroOpcional(body.fk_categoria);

    if (!nombre_gasto) {
        return { error: 'El nombre del gasto es obligatorio' };
    }
    if (isNaN(total)) {
        return { error: 'El total debe ser un número válido' };
    }
    if (cantidad !== null && isNaN(cantidad)) {
        return { error: 'La cantidad debe ser un número válido' };
    }
    if (precio !== null && isNaN(precio)) {
        return { error: 'El precio debe ser un número válido' };
    }
    if (fk_categoria !== null && (!Number.isInteger(fk_categoria) || fk_categoria <= 0)) {
        return { error: 'La categoría no es válida' };
    }

    // Ningún monto puede ser negativo ni exceder DECIMAL(10,2)
    for (const [nombre, valor] of [['total', total], ['cantidad', cantidad], ['precio', precio]]) {
        if (valor !== null && valor < 0) {
            return { error: `El campo ${nombre} no puede ser negativo` };
        }
        if (valor !== null && valor >= MAX_DECIMAL) {
            return { error: `El campo ${nombre} excede el máximo permitido` };
        }
    }

    return {
        data: {
            nombre_gasto,
            total,
            description: description || null, // Vacío => NULL
            cantidad,
            precio,
            fk_categoria
        }
    };
}

// Crear un nuevo gasto
exports.crear = async (req, res) => {
    try {
        const { error, data } = validar(req.body);
        if (error) return res.status(400).json({ error });

        await gasto.crear(data);
        res.json({ mensaje: 'Gasto creado exitosamente' });
    } catch (error) {
        // 23503 = la categoría indicada no existe
        if (error.code === '23503') {
            return res.status(400).json({ error: 'La categoría seleccionada no existe' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Listar todos los gastos activos
exports.listar = async (req, res) => {
    try {
        const data = await gasto.listar();
        res.json(data.rows); // Devuelve solo las filas
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener un gasto específico por ID
exports.obtenerPorId = async (req, res) => {
    try {
        const data = await gasto.obtenerPorId(req.params.id);
        if (!data.rows[0]) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }
        res.json(data.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar un gasto existente
exports.actualizar = async (req, res) => {
    try {
        const { error, data } = validar(req.body);
        if (error) return res.status(400).json({ error });

        await gasto.actualizar(req.params.id, data);
        res.json({ mensaje: 'Gasto actualizado exitosamente' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({ error: 'La categoría seleccionada no existe' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Desactivar gasto (soft delete)
exports.desactivar = async (req, res) => {
    try {
        await gasto.desactivar(req.params.id);
        res.json({ mensaje: 'Gasto desactivado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar gasto permanentemente (hard delete)
exports.desaparecer = async (req, res) => {
    try {
        await gasto.desaparecer(req.params.id);
        res.json({ mensaje: 'Gasto eliminado permanentemente' });
    } catch (error) {
        // 23503 = violación de llave foránea en PostgreSQL
        if (error.code === '23503') {
            return res.status(409).json({ error: 'No se puede eliminar: el gasto tiene registros asociados' });
        }
        res.status(500).json({ error: error.message });
    }
};