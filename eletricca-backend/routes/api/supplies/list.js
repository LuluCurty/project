import e from 'express';
const router = e.Router();
import pool from '../../../db.js';
import { authenticateToken } from '../../../middleware/auth.js';

router.use(authenticateToken);


// GET '/api/supplieslist?page=1&limit=25&search=algumacoisa //estado completo 
// `/api/supplieslist?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, em estado funcional

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const search = req.query.search ? `%${req.query.search}%` : `%`;
        const offset = (page - 1) * limit;
        const queryParams = [limit, offset];
        const countParams = [];

        let queryText = `
            SELECT
                sl.*,
                c.client_first_name, 
                c.client_last_name,
                u.first_name AS creator_first_name,
                u.last_name AS creator_last_name
            FROM supplies_lists sl
            LEFT JOIN client c ON sl.client_id = c.id
            LEFT JOIN users u ON sl.created_by = u.user_id
        `;

        let countText = `
            SELECT COUNT(*)
            FROM supplies_lists sl
            LEFT JOIN client c on sl.client_id = c.id
        `;

        if (search) {
            const searchTerm = `%${search}%`;
            const whereClause = `
                WHERE sl.list_name ILIKE $3
                OR c.client_first_name ILIKE $3
                OR c.client_last_name ILIKE $3
            `;

            queryText += whereClause;
            countText += ` WHERE sl.list_name ILIKE $1
            OR c.client_first_name ILIKE $1
            or c.client_last_name ILIKE $1
            `;
            
            queryParams.push(searchTerm);
            countParams.push(searchTerm);
        }

        queryText += ` ORDER BY sl.creation_date DESC LIMIT $1 OFFSET $2`;

        const [listResponse, countResponse] = await Promise.all([
            pool.query(queryText, queryParams),
            pool.query(countText, countParams)
        ]);

        const totalItems = parseInt(countResponse.rows[0].count);
        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            lists: listResponse.rows,
            ok: true,
            page,
            limit,
            totalItems,
            totalPages
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error', ok:false });
    }
});
// listar item lista especifica por id na chamada da função. Seja para editar, ou visualizar detalhes pagina URLORIGIN/listas/:id. 
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        // buscar os dados DA lista per se
        const listQuery = `
            SELECT 
                sl.*,
                c.client_first_name,
                c.client_last_name,
                c.client_email
            FROM supplies_lists sl
            LEFT JOIN client c ON sl.client_id = c.id
            WHERE sl.id = $1
        `;
        const listResponse = await pool.query(listQuery, [id]);

        if (listResponse.rows.length === 0) {
            return res.status(404).json({
                ok: false, 
                error: 'Lista não encontrada'
            });
        }

        const itemsQuery = `
            SELECT
                sli.*,
                s.supply_name,
                sup.supplier_name
            FROM supplies_list_items sli
            LEFT JOIN supplies s ON sli.supply_id = s.id
            LEFT JOIN supplier sup ON sli.supplier_id = sup.id
            WHERE sli.list_id = $1
        `;
        const itemsResponse = await pool.query(itemsQuery, [id]);

        //montar a resposta
        const listData = listResponse.rows[0];
        listData.items = itemsResponse.rows;

        res.json(listData);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            error: 'Internal server error'
        })
    }
});
// POST /api/suppplies/list
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { list_name, client_id, priority, description, listItems } = req.body;

        if (!list_name || !client_id || !listItems || listItems === 0) {
            return res.status(400).json({ error: 'Incomplete Data', ok: false});
        }
        const user_id = req.user.user_id;
        
        await client.query('BEGIN');

        const insertListText = `
            INSERT INTO supplies_lists
            (list_name, client_id, created_by, priority, description, list_status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING id;
        `;
        const listValues = [list_name, client_id, user_id, priority || 'medium', description];
        
        const listResponse = await client.query(insertListText, listValues);
        const newListId = listResponse.rows[0].id;

        const insertItemTexrt = `
            INSERT INTO supplies_list_items
            (list_id, supply_id, supplier_id, quantity, price)
            VALUES ($1, $2, $3, $4, $5)
        `;

        for (const item of listItems) {
            await client.query(insertItemTexrt, [
                newListId,
                item.supply_id,
                item.supplier_id,
                item.quantity,
                item.price
            ]);
        }

        await client.query('COMMIT');

        return res.status(200).json({
            ok: true,
            message: 'Lista criada com sucesso',
            listId: newListId
        })

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar lista: ', error);
        res.status(500).json({ ok: false, error: 'Internal server Error' })
    } finally {
        client.release();
    }
});
// PUT /api/suplist/:id
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const listId = parseInt(req.params.id);
        const { list_name, client_id, priority, list_status, description, listItems } = req.body;

        if (!list_name || !client_id || !listItems) {
            return res.status(400).json({ok: false, error: 'Dados incompletos'});
        }

        await client.query('BEGIN');

        const updateListQuery = `
            UPDATE supplies_lists
            SET
                list_name = COALESCE($1, list_name),
                client_id = COALESCE($2, client_id),
                priority = COALESCE($3, priority),
                list_status = COALESCE($4, list_status),
                description = COALESCE($5, description),
                updated_at=NOW()
            WHERE id=$6
        `;
        const updateListParams = [ list_name, client_id, priority, list_status, description, listId ];
        await client.query(updateListQuery, updateListParams);
        // 1. Vamos buscar IDS que ja existem no banco para esta lista 
        const currentResponse = await client.query(
            `SELECT id FROM supplies_list_items WHERE list_id=$1`,
            [listId]
        )
        const currentIds = currentResponse.rows.map(r => r.id);
        // 2. Vamos pegar os IDS que vieram do frontend
        const frontendIds = listItems
            .filter(item => item.id)
            .map(item => item.id)
        ;
        // 3. Vamos deletear os ids que estão no banco MAS NAO ESTAO NO PAYLOAD DO FRONTEND
        const idsToDelete = currentIds.filter( id => !frontendIds.includes(id));

        if (idsToDelete.length > 0) {
            // ANY($1) para excluir um array inteiro por vez
            await client.query(
                `DELETE FROM supplies_list_items WHERE id = ANY($1)`,
                [idsToDelete]
            )
        }

        // 4. Vamos adicionar o loop do insert e acabar com isso logo
        for (const item of listItems) {
            if (item.id) {
                // Atualiza items que já exitem, recebido pelo ID do frontend
                await client.query(`
                        UPDATE supplies_list_items
                        SET
                            supply_id = COALESCE($1, supply_id),
                            supplier_id = COALESCE($2, supplier_id),
                            quantity = COALESCE($3, quantity),
                            price = COALESCE($4, price)
                        WHERE id = %5 AND list_id = $6
                    `, [
                        item.supply_id,
                        item.supplier_id,
                        item.quantity,
                        item.price,
                        item.id,
                        listId
                    ]
                )
            } else {
                await client.query(`
                        INSERT INTO supplies_list_items
                        (list_id, supply_id, supplier_id, quantity, price)
                        VALUES ($1, $2, $3, $4, $5) 
                    `, [
                        listId,
                        item.supply_id,
                        item.supplier_id,
                        item.quantity,
                        item.price
                    ]
                );
            }
        }
        
        await client.query('COMMIT');
        res.json({
            ok: true,
            message: 'Lista atualizada com sucesso'
        });
    } catch (error) {
        console.error(error);
        await client.query('ROLLBACK');
        res.status(500).json({
            ok: false,
            error: 'Internal server error'
        })
    } finally {
        client.release();
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
router.delete('/:id', async (req, res) => {
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

router.post('/import', async (req, res) => {
    res.send('hello world');
});

router.get('/export', async (req, res) => {
    res.send('hello world');
});


export default router;