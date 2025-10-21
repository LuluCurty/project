const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { generateToken }  = require('../middleware/auth');
const { isLocalIP, normalizeIP} = require('../middleware/ipGuard');

const router = express.Router();
const SALT_ROUNDS = 10;


router.post('/register', async (req, res) => {
    try {
        const { email, password_hashed, tel, first_name, last_name, user_role } = req.body;

        if (user_role && user_role.toLowerCase() === 'admin') {
            return res.status(403).json({ error: 'Not allowed to create admin via public endpoint' });
        };

        const hashed = await bcrypt.hash(password_hashed, SALT_ROUNDS);

        const result = await pool.query(
            `INSERT INTO users (email, password_hashed, telphone, user_role, first_name, last_name) 
            VALUES ('${email}','${hashed}','${tel}','${user_role}','${first_name}','${last_name}') 
            RETURNING user_id, email, user_role, first_name, last_name, creation_date;`
        );
        res.status(201).json({ user: result.rows[0]});
    } catch (error) {
        if(error.code === '23505'){
            return res.status(409).json({error: 'Email already registered'});
        }
        res.status(500).json({ error: 'Internal server error'});
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password_hashed} = req.body;
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const { rows } = await pool.query('SELECT user_id, email, password_hashed, user_role, first_name, last_name FROM users WHERE email=$1', [email]);
        if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials'});
        const user = rows[0]
        const ok = await bcrypt.compare(password_hashed, user.password_hashed);
        if(!ok) return res.status(401).json({ error: 'Invalid credentials'});

        if (user.role === 'admin' && !isLocalIP(ip)){
            return res.status(403).json({ error: 'Admin access only allowed from local network'});
        }
        const token = generateToken(user);
        res.json({ token, user: { user_id: user.user_id, email: user.email, user_role: user.user_role, first_name: user.first_name, last_name: user.last_name}});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
})

module.exports= router;