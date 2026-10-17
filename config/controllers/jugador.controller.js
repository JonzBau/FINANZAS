const Jugador = require('../models/jugador.model');


exports.crear = async (req, res) => {
await Jugador.crear(req.body);
res.json({ mensaje: 'Jugador creado' });
};


exports.listar = async (req, res) => {
const data = await Jugador.listar();
res.json(data.rows);
};


exports.actualizar = async (req, res) => {
await Jugador.actualizar(req.params.id, req.body);
res.json({ mensaje: 'Jugador actualizado' });
};


exports.desactivar = async (req, res) => {
await Jugador.desactivar(req.params.id);
res.json({ mensaje: 'Jugador desactivado' });
};