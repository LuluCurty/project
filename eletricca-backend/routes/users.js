const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const {requireRole, authenticateToken } = require('../middleware/auth');
const { requireLocalAccess} = require('../middleware/ipGuard');

const { canManage, canCreate, canDelete } = require('../middleware/roleHierarchy');


const { getRolePermission } = require('../middleware/roleBasedAccessControl')

const router = express.Router();
const SALT_ROUNDS =10;

router.use(authenticateToken);


// CRIAR USUARIO
router.post('/create', canCreate, async (req, res) => {
    try {
        const { email, password_hashed, telphone, user_role, first_name, last_name } = req.body;
        const hashed = await bcrypt.hash(password_hashed , SALT_ROUNDS);
        
        const { rows } = await pool.query(
            `INSERT INTO users (email, password_hashed, telphone,user_role,first_name,last_name)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING user_id, email, user_role, first_name, last_name, creation_date;`,
            [email, hashed, telphone || null, user_role || 'client', first_name||null, last_name||null]
        );
        res.status(201).json({ user: rows[0] });
    } catch (error) {
        console.error(error);
        if(error.code === '23505') return res.status(409).json({ error: 'Email already registered'});
        res.status(500).json({ error: 'Internal server error'});
    }
})

// PEGAR LISTA DE USUARIOS protegido
router.get('/', async (req, res) => {
    try {
        const currentId = req.user.user_id;
        const currentRole = req.user.user_role;

        let query;
        let params = [];

        if(currentRole === 'admin'){
            query = `SELECT user_id, email, user_role, first_name, last_name, telphone, creation_date
            FROM users
            ORDER BY creation_date DESC;
            `;
        } else if (currentRole === 'manager'){
            query = `SELECT user_id, email, user_role, first_name, last_name, telphone, creation_date
            FROM users
            WHERE user_role IN ('operator','client')
            ORDER BY creation_date DESC;
            `;
        } else if(currentRole === 'operator'){
            query = `SELECT user_id, email, user_role, first_name, last_name, telphone, creation_date
            FROM users
            WHERE user_role IN ('operator','client')
            ORDER BY creation_date DESC;
            `;
        } else if(currentRole === 'client'){
            query = `SELECT user_id, email, user_role, first_name, last_name, telphone, creation_date
            FROM users
            WHERE user_id=$1;
            `;
            params = [currentId];
        }
        else {
            res.status(403).json({ error: 'Forbidden role'});
        }
        const { rows } = await pool.query(query, params);

        if (rows === 0) {
            return res.status(404).json({ error: 'User not found or insufficient role'});
        }
        res.json({ users: rows});
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error'});
    }
})

router.get('/me', async (req, res) => {
    try {
        const user = req.user;   
        
        const perms = getRolePermission(user.user_role);
        
        const allowedTabs = Object.keys(perms).filter(resource =>
            perms[resource].includes("read")
        );
        const { rows } = await pool.query(`SELECT first_name, last_name FROM users WHERE user_id=$1;`, [user.user_id]);
        
        user['first_name'] = rows[0]['first_name'];
        user['last_name'] = rows[0]['last_name'];        
        res.json({
            user,
            allowed_tabs: allowedTabs
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});   
    }
})

// pega usuario por id protegido
router.get('/:id', async (req, res) => {
    try {
        const currentId = req.user.user_id;
        const currentRole = req.user.user_role;
        const targetId = parseInt(req.params.id, 10);

        let query;
        let params = [];

        // admin ALL
        if (currentRole === 'admin') {
            query = `
                SELECT user_id, email, user_role, first_name, last_name, telphone, creation_date
                FROM users
                WHERE user_id=$1;
            `;
            params = [targetId];
        } else if (currentRole === 'manager') {
            query = `
                SELECT user_id, email, user_role, first_name, last_name, telphone, creation_date
                FROM users
                WHERE user_id=$1 AND user_role IN ('operator','client');
            `;
            params = [targetId];
        } else if (currentRole === 'operator'){
            query = `
                SELECT user_id, email, user_role, first_name, last_name, telphone, creation_date
                FROM users
                WHERE user_id=$1 AND user_role IN ('operator','client');
            `;
            params = [targetId];
        } else if(currentRole === 'client') {
            // ONLY HIMSELF
            if (targetId !== currentId) {
                res.status(403).json({ error: 'Forbidden: Clients can only see themselves'});
            }
            query = `
                SELECT user_id, email, user_role, first_name, last_name, telphone, creation_date
                FROM users
                WHERE user_id=$1;
            `;
            params = [currentId];

        } else{
            res.status(403).json({ error: 'Forbidden: Invalid Role'});
        }

        const { rows } = await pool.query(query, params);
        if (rows === 0) {
            res.status(404).json({ error: 'User not found or insufficient role'});
        }
        res.json( { user: rows[0] });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
})

// atualizar usuarios
router.put('/:id', canManage( async (req) =>{
    // get user role
    const id = parseInt(req.params.id, 10);
    const { rows } = await pool.query(`
        SELECT user_role 
        FROM users 
        WHERE user_id=$1`, [id]);
    if (rows.length === 0) throw new Error("User not found");
    
    return rows[0].user_role;}), 
    async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { email, telphone, user_role, first_name, last_name} = req.body;
        const { rowCount } = await pool.query(
            `UPDATE users SET email=$1, telphone=$2, user_role=$3, first_name=$4, last_name=$5 WHERE user_id=$6;`,
            [email, telphone, user_role, first_name, last_name, id]
        );

        if (rowCount === 0) return res.status(404).json({ error: 'User not found'});
        res.json({ ok: true});
    } catch (error) {
        console.error(error);
        if (error.code === '22P02') {
            return res.status(404).json({ error: 'Função não existe'});
        }
        res.status(500).json({error: 'Internal server error'});
    }
});

// deletar usuarios
router.delete('/:id', canDelete( async(req)=>{
    const id = parseInt(req.params.id, 10);
    const { rows } = await pool.query(`
        SELECT user_role
        FROM users
        WHERE user_id=$1`, [id]);
    if (rows === 0) {
        throw new Error("User not found"); 
    }
    return rows[0].user_role;}),
    async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rowCount } = await pool.query('DELETE FROM users WHERE user_id=$1;', [id]);
        if(rowCount===0) return res.status(404).json({error: 'User not found'});
        res.json({ok:true});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Internal server error'});
    }
})




module.exports =router;









//////////////// COMENTARIOS /////////////////



/*
router.get('/', async (req, res) => {
    try{
        const {rows} = await pool.query('SELECT user_id, email, user_role, first_name, last_name, telphone, creation_date FROM users ORDER BY creation_date DESC;');
        res.json({ users: rows });
    }
    catch (error){
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
}) 
    

router.get('/:id', async (req, res) => {
    try{
        const id = parseInt(req.params.id, 10);
                console.log(`ID DO USER GET /:id:${id}`)

        const { rows } = await pool.query(
            `SELECT user_id, email, user_role, first_name, last_name, telphone, creation_date 
            FROM users 
            WHERE user_id=$1;`,
            [id]
        );
        if (rows.length === 0 ){
            return res.status(404).json({ error: 'User not found'});
        }
        res.json({ user: rows[0]});
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
})

*/