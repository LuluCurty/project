const express = require('express');
const path = require('path');
const router = express.Router();
const { authorize } = require('../../../middleware/roleBasedAccessControl');
const { authenticateToken } = require('../../../middleware/auth');
const { error } = require('console');
const pool = require('../../../db');

router.use(authenticateToken);

// GET /api/supplier?page=1&limit=20%search=algumacoisa
router.get('/', async (req, res) => {
    try{

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

// GET /api/supplier?search=algumacoisa  //missao juntar isso 
router.get('/search', async (req, res) => {
    try{
        const search = req.query.search ? req.query.search : '%';

        if (!search || search.length < 2) { return res.json({}); };

        const { rows } = await pool.query(`
            SELECT
                id,
                supplier_name,
                supplier_email
            FROM supplier
            WHERE
                supplier_name ILIKE $1 OR
                supplier_email ILIKE $1
            ORDER BY supplier_name
            LIMIT 10
            ;`, [`%${search}%`]
        );

        res.status(200).json({ rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

// GET /api/supplier/:id
router.get('/:id', async (req, res) => {
    try{
        const id = parseInt(req.params.id, 10);

        if (!Number.isInteger(id)) { return res.status(400).json({ error: 'ID invalido'}); };

        const { rows } =await pool.query(`
            SELECT 
                id,
                supplier_name,
                supplier_email,
                supplier_telephone,
                supplier_address,
                creation_date
            FROM supplier
            WHERE 
                id=$1
            ;`,[id]
        );

        if (rows === 0) { return res.status(404).json({ error: 'Fornecedor não encontrado'}); };

        res.status(200).json({supplier: rows[0]});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
});
// POST /api/supplier
router.post('/', async (req, res) => {
    try{
        console.log(req.body);
        const { supplierName, supplierEmail, supplierTelephone, supplierAddress} = req.body;
        if (![supplierName, supplierEmail, supplierTelephone].every(v => v && v.trim() !== '')) {
            return res.status(400).json({ error: 'Todos os campos sao obrigatorios'});
        }
        console.log('l');

        const { rows } = await pool.query(`
            INSERT INTO supplier
            (supplier_name, supplier_email, supplier_telephone, supplier_address)
            VALUES
            ($1, $2, $3, $4)
            RETURNING supplier_name
            ;`,[supplierName, supplierEmail, supplierTelephone, supplierAddress]
        );
        return res.status(200).json({
            supplier: rows[0],
            ok: true
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

// DELETE /api/supplier/:id
router.delete('/delete/:id', async (req, res) => {
    try{
        const id = parseInt(req.params.id, 10);

        if (!Number.isInteger(id)) { res.status(400).json({ error: 'ID invalido'}); };

        const { rowCount } = await pool.query(`
            DELETE FROM supplier
            WHERE id=$1
            ;`, [id]
        );

        if (rowCount === 0) { return res.status(404).json({error: 'Fornecedor nao encontrado'});}

        return res.status(200).json({
            ok: true
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
})

// PUT /api/supplier/update/:id
router.put('/update/:id', async (req, res) => {
    try{
        const id = parseInt(req.params.id, 10);
        if(!Number.isInteger(id)) { return res.status(400).json({ error: 'ID não é um numero'});};

        const { supplierName, supplierEmail, supplierTelephone, supplierAddress } = req.body;
        
        console.log('Funciona, só escrever a query');

        const { rowCount } = await pool.query(`
            UPDATE supplier
            SET
                supplier_name = COALESCE($1, supplier_name),
                supplier_email = COALESCE($2, supplier_email),
                supplier_telephone = COALESCE($3, supplier_telephone),
                supplier_address = COALESCE($4, supplier_address)
            WHERE id=$5
            ;`, [supplierName, supplierEmail, supplierTelephone, supplierAddress]
        );
        if (rowCount === 0) { return res.status(400).json({ error: "Nenhum fornecedor modificado"}); }
        return res.status(200).json({ ok: true, rowCount });

    } catch (error){
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

module.exports = router;