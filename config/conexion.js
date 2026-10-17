
const { Pool } = require('pg');
require('dotenv').config();

class Conexion {
    constructor() {

        // Verificar que las variables de entorno estén definidas
        if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
            throw new Error('Faltan variables de entorno de base de datos. Revisa tu archivo .env');
        }

        const config = {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        };

        if (process.env.DB_SSL === 'true') {
            config.ssl = {
                rejectUnauthorized: false
            };
        }

        this.pool = new Pool(config);
    }

    static conectar() {
        if (!Conexion.instance) {
            Conexion.instance = new Conexion();
        }
        return Conexion.instance.pool;
    }

    static async query(text, params) {
        const pool = Conexion.conectar();
        return pool.query(text, params);
    }
}

module.exports = Conexion;