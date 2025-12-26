import e from 'express';
const router = e.Router();
import pool from '../../../db.js';
import { authenticateToken } from '../../../middleware/auth.js';
import { authorize } from '../../../middleware/roleBasedAccessControl.js';

router.use(authenticateToken);


// GET '/api/supplieslist?page=1&limit=25&search=algumacoisa //estado completo 
// `/api/supplieslist?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, em estado funcional

router.get('/', authorize('supplies_lists', 'read'), async (req, res) => {
    try {

        const page = parseInt(req.query.page, 10) || 1; 
        const limit = parseInt(req.query.limit) || 20; 
        const search = req.query.search ? `%${req.query.search}%` : `%`;

        const offset = (page - 1) * limit;

        const { rows } = await pool.query(`
            SELECT
                sl.id,
                sl.list_name,
                sl.list_status,
                sl.priority,
                sl.client_id,
                sl.created_by,
                c.client_first_name,
                c.client_last_name,
                u.first_name AS creator_first_name,
                u.last_name AS creator_last_name
            FROM supplies_lists sl
            LEFT JOIN client c ON sl.client_id = c.id
            LEFT JOIN users u ON sl.created_by = u.user_id
            WHERE sl.list_name ILIKE $1
            ORDER BY sl.creation_date DESC 
            LIMIT $2 OFFSET $3
            ;`, [search, limit, offset]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                lists: [],
                ok: false,
                page,
                limit,
                totalItems: 0,
                totalPages: 0
            });
        }

        // calcular quantidade de paginas e de items
        const countQueryResult = await pool.query(`
            SELECT COUNT(*) 
            FROM supplies_lists 
            WHERE 
                list_name ILIKE $1
            `, [search]
        );
        const totalItems = parseInt(countQueryResult.rows[0].count, 10);

        res.json({
            lists: rows,
            ok: true,
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
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
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try{
        const { listName, clientId, priority, description, listItems } = req.body;
        const user_id = req.user.user_id;


        if (!listName || !clientId || !listItems || listItems.length === 0) {
            return res.status(400).json({ error: 'Erro, preencha todos os campos para prosseguir'});
        }

        console.log('t')

        await client.query('BEGIN');

        // criar a lista, propriamente dita

        const { rows: [newList] }  = await client.query(`
            INSERT INTO supplies_lists (
                list_name,
                client_id,
                created_by,
                priority,
                description
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            ;`, [listName, clientId, user_id, priority || 'medium', description]
        );

        // inserrir os items a lista
        const listId = newList.id;

        for (const item of listItems) {
            await client.query(`
                INSERT INTO supplies_list_items (
                list_id,
                supply_id,
                supplier_id,
                quantity,
                price
                ) VALUES ($1, $2, $3, $4, $5)
                `,[listId, item.supply_id, item.supplier_id, item.quantity, item.price]
            );
        }
        console.log('t')

        await client.query('COMMIT');

        res.status(201).json({
            ok: true,
            listId,
            message: 'Lista criada com sucesso'
        })
        console.log('t')

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({message: 'Internal server error'});
    } finally {
        client.release();
    }

});
// PUT /api/suplist/:id
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


router.put('/:id/status', async (req, res) => {
    try{
        const id = parseInt(req.params.id, 10);
        const { status } = req.body;

        if(!Number.isInteger(id)) { return res.status(40).json({ error: 'ID invalido'})};

        if(!['pending', 'approved', 'denied'].includes(status)) { return res.status(400).json({ error: 'Status invalido'})};

        const { rowCount } = await pool.query(`
            UPDATE supplies_lists
            SET 
                list_status = $1,
                updated_at = NOW()
            WHERE id = $2
            ;`, [status, id]
        );

        if (rowCount === 0 ) { return res.status(404).json({ error: 'Lista nao encontrada'})};

        res.status(200).json({
            ok: true,
            message: 'Status atualizado'
        })

    } catch (error) {
        console.error('Erro no endpoint /:id/status \n' + error);
        res.status(500).json({message: 'Internal server error'});
    }
});

// DELETE /api/suplist/:id
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
// DELETE /api/suplist/batch-delete
router.delete('/batch-delete', async (req, res) => {
    try{
        const { ids } = req.body;
        console.log('ELE CHEGA COM OS IDS!');
        console.log(ids);

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Ids invalidos '});
        }

        const { rowCount } = await pool.query(`
            DELETE FROM supplies_lists 
            WHERE id = ANY($1)
            ;`, [ids]
        );


        res.status(200).json({
            ok: true,
            message: `${rowCount} removidos com sucesso`,
            deletedCount: rowCount
        })

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error'});
    }
});

router.post('/import', authorize('supplies_lists', 'create'), async (req, res) => {
    res.send('hello world');
});

router.get('/export', authorize('supplies_lists', 'read'), async (req, res) => {
    res.send('hello world');
});


export default router;