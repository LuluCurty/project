import pg from 'pg';
// No SvelteKit, é mais seguro usar as variáveis de ambiente privadas do próprio framework
// em vez de 'dotenv' e process.env, mas vou manter compatível com sua lógica atual.
import 'dotenv/config'; 

// Desestruturação segura para garantir que pegamos a classe Pool
const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER || 'eletricca_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'eletricca',
    password: process.env.DB_PASSWORD || 'eletrO@8002',
    port: Number(process.env.DB_PORT) || 5432, // Garante que é número
});

export { pool };