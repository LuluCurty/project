const express = require('express');
const router = express.Router();

const pool = require('../../../db');

const { authorize } = require('../../../middleware/roleBasedAccessControl');
const { authenticateToken } = require('../../../middleware/auth');

const path = require('path');

router.use(authenticateToken);


/**
 * 
 * CRUD RELACIONADO A TABELA supplies_lists
 * FAVOR USAR APENAS ESTA ROTA PARA MEXER NAQUELA
 */

// listar tudo na pagina URLORIGIN/listas/
router.get('/', authorize('supplies_lists', 'read'), async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, list_name, list_status
            FROM supplies_lists
            ORDER BY list_name DESC
            ;`);

        res.json({
            lists: rows,
            ok: true
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// listar item lista especifica por id na chamada da função. Seja para editar, ou visualizar detalhes pagina URLORIGIN/listas/:id. 
router.get('/:id', authorize('supplies_lists', 'read'), async (req, res) => {
    const id = req.params.id;
    try {
        const { rows } = await pool.query(`
            SELECT id, list_name, list_status
            FROM supplies_lists
            WHERE id=$1
            ;`, [id]);

        res.status(200).json({
            lists: rows[0],
            ok: true
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// criar uma nova lista
router.post('/', authorize('supplies_lists', 'create'), async (req, res) => {
    try {
        const { list_name, list_status } = req.body

        const { rows } = await pool.query(`
            INSERT INTO supplies_lists 
            (list_name, list_status)
            VALUES
            ($1, $2)
            RETURNING id, creation_date, list_name
            ;`,
            [list_name, list_status]
        );

        res.status(200).json({
            lists: rows,
            ok: true
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// atualizar a lista especifica, normalmente usado em conjunto com o get/:id para edição ou exclusão pagina URLORIGIN/listas/:id.
router.put('/:id', authorize('supplies_lists', 'update'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        const { list_name, list_status } = req.body;

        const { rowCount, rows } = await pool.query(`
        UPDATE supplies_lists
        SET 
            list_name= COALESCE ($1, list_name),
            list_status= COALESCE ($2, list_status)
        WHERE id=$3
        `, [list_name, list_status, id]
        );

        if (rowCount === 0) {
            return res.status(400).json({ message: 'Lista não atualizada' })
        };

        res.status(200).json({
            ok: true
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }

});
// exlcuir lista especifica, normalmente usado em conjunto com o get/:id ou put/:id pagina URLORIGIN/listas/:id
router.delete('/:id', authorize('supplies_lists', 'delete'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rowCount } = await pool.query(`
            DELETE FROM supplies_lists WHERE id=$1
            ;`, [id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Material não encontrado' });
        };
        res.json({ message: 'Material removido com sucesso', ok: true, success: true, deletedId: id })

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// futuramente usado para importar lista de materiais para o servidor
// Vai suportar CSV, XLSX, TXT ou PDF (sim, vai suportar PDF TBM)
router.post('/import', authorize('supplies_lists', 'create'), async (req, res) => {
    res.send('hello world');
});

// futuramente usado para exportar lista de materiais para o usuario baixar no computador
// vai suportar CSV, XLSX, TXT ou PDF
// podera ser usado tanto na pagina principal como uma forma
// de baixar varias listas de uma vez só
// ou dentro de um unico arquivo, pedindo apenas uma lista
router.get('/export', authorize('supplies_lists', 'read'), async (req, res) => {
    res.send('hello world');
});


module.exports = router;