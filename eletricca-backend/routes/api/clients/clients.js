const pool = require('../../../db');
const express = require('express');
const router = express.Router();
const path = require('path');
const { authorize } = require('../../../middleware/roleBasedAccessControl');

const { authenticateToken } = require('../../../middleware/auth');


router.use(authenticateToken);


// GET api/client?page=1&limit=25&search=algumacoisa
router.get('/', async (req, res) => {
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search? `%${req.query.search}%` : `%`;
        
        const offset = (page - 1) * limit;

        // sql query
        const {rows} = await pool.query(`
            SELECT id, client_first_name, client_last_name, client_telephone,
                client_email, creation_date
            FROM client
            WHERE client_first_name ILIKE $1 
                OR client_last_name ILIKE $1 
                    OR client_email ILIKE $1
            ORDER BY client_first_name DESC
            LIMIT $2 OFFSET $3
        `, [ search, limit, offset]);

        if (rows === 0) {
            return res.status(404).json({ error: 'Nenhum usuario encontrado'});
        };
        // calcular a quantidade de paginas
        const countQueryResult = await pool.query(`SELECT COUNT(*) FROM client`);
        const totalItems = parseInt(countQueryResult.rows[0].count, 10);       
        res.status(200).json({
            clients: rows,
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            ok: true,
        });        

    } catch(error){
        console.error(error);
        res.status(500).json({ message: 'Internal server error'});
    }
});


router.get('/:id', async (req, res) => {
            return res.send('nao implementado')

});


router.post('/', async (req, res) => {
    try{
        const { clientFirstName, clientLastName, clientTel, clientEmail} = req.body;

        if (![clientFirstName, clientLastName, clientTel, clientEmail].every(v => v && v.trim() !== '')) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        const { rows } = await pool.query(`
            INSERT INTO client
            (client_first_name, client_last_name, client_telephone, client_email) 
            VALUES
            ($1, $2, $3, $4)
            RETURNING client_first_name, creation_date
            ;`, [clientFirstName, clientLastName, clientTel, clientEmail]
        );

        return res.status(201).json({ 
            client: rows[0], 
            ok: true 
        });

    } catch (error){
        console.error(error);
        res.status(500).json({ message: 'Internal server error'});
    }
});


router.put('/:id', async (req, res) => {
            return res.send('nao implementado')

});


router.delete('/:id', async (req, res) => {
            return res.send('nao implementado')

});

module.exports = router;