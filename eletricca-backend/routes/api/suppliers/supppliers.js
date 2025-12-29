import e from 'express';
const router = e.Router();
import pool from '../../../db.js';
import { authenticateToken } from '../../../middleware/auth.js';

router.use(authenticateToken);

// GET /api/suppliers/list
router.get('/list', async (req, res) => {
    try{
        const result =  await pool.query(
            `SELECT id, supplier_name FROM supplier ORDER BY supplier_name ASC;`
        );

        res.json(result.rows);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error/Erro ao buscar fornecedores'});
    }
})

// GET /api/supplier?page=1&limit=20%search=algumacoisa
router.get('/', async (req, res) => {
    try{
        // 1. Parametros da URL
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = ( page -1 )  * limit;
        // 2. Query dinamica, para mudar todo acerca da query
        let queryText = `SELECT * FROM supplier`;
        let countText = `SELECT COUNT(*) FROM supplier`;
        let queryParams = [limit, offset];
        let countParams = [];

        // Tem busca?
        if (search ) {
            const searctTerm = `%${search}%`;
            const whereClause = ` WHERE supplier_name ILIKE $3 OR supplier_email ILIKE $3`;

            queryText += whereClause;
            countText += ` WHERE supplier_name ILIKE $1 OR supplier_email ILIKE $1`;

            queryParams.push(searctTerm); // $3 nessa
            countParams.push(searctTerm); // $1 nessa
        }
        // Ordenação e paginação são separados para granular a ordenação.
        queryText += ` ORDER BY id ASC LIMIT $1 OFFSET $2`;

        // 3. Executar as queries 
        const [suppliersResponse, CountResponse] = await Promise.all([
            pool.query(queryText, queryParams),
            pool.query(countText, countParams)
        ]);

        const totalItems = parseInt(CountResponse.rows[0].count);
        const totalPages = Math.ceil(totalItems / limit);

        // 4. Responder as queries
        res.json({
            suppliers: suppliersResponse.rows,
            page,
            limit,
            totalItems,
            totalPages,
            ok: true
        });
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
        const { 
            supplier_name, 
            supplier_email, 
            supplier_telephone, 
            supplier_address
        } = req.body;

        if (!supplier_email?.trim() || !supplier_name?.trim() || !supplier_telephone?.trim()) {
            return res.status(400).json({
                ok: false,
                error: 'Nome, email e telefone são obrigatórios'
            })
        }

        const { rows } = await pool.query(`
            INSERT INTO supplier
            (supplier_name, supplier_email, supplier_telephone, supplier_address)
            VALUES
            ($1, $2, $3, $4)
            RETURNING id, supplier_name;`, // Retornamos o ID também
            [
                supplier_name, 
                supplier_email, 
                supplier_telephone, 
                supplier_address || null // Se vier vazio, salva null (ou string vazia se preferires)
            ]
        );

        return res.status(201).json({
            ok: true,
            supplier: rows[0],
            message: 'Fornecedor cadastrado com sucesso'
        });

    } catch (error) {
        if (error.code === '23505') {
            // Verifica se foi o email
            if (error.constraint === 'supplier_supplier_email_key') {
                return res.status(409).json({ 
                    ok: false, 
                    error: 'Este email já está cadastrado para outro fornecedor.' 
                });
            }
            return res.status(409).json({ ok: false, error: 'Fornecedor já cadastrado.' });
        }

        // Erro genérico
        return res.status(500).json({ 
            ok: false, 
            error: 'Erro interno ao salvar fornecedor.' 
        });
    }
});

// DELETE /api/supplier/:id
router.delete('/:id', async (req, res) => {
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
    try {
        const id = parseInt(req.params.id, 10);
        
        if (!Number.isInteger(id)) { 
            return res.status(400).json({ error: 'ID inválido (deve ser número inteiro)' });
        }

        const { supplier_name, supplier_email, supplier_telephone, supplier_address } = req.body;
        
        // Query com RETURNING * para devolver o dado atualizado
        const { rowCount, rows } = await pool.query(`
            UPDATE supplier
            SET
                supplier_name = COALESCE($1, supplier_name),
                supplier_email = COALESCE($2, supplier_email),
                supplier_telephone = COALESCE($3, supplier_telephone),
                supplier_address = COALESCE($4, supplier_address)
            WHERE id = $5
            RETURNING *;`, 
            // CORREÇÃO: Adicionei o 'id' ao final do array
            [supplier_name, supplier_email, supplier_telephone, supplier_address, id]
        );

        if (rowCount === 0) { 
            return res.status(404).json({ error: "Fornecedor não encontrado." }); 
        }

        return res.status(200).json({ 
            ok: true, 
            message: 'Fornecedor atualizado com sucesso',
            supplier: rows[0]
        });

    } catch (error) {
        console.error('Erro no UPDATE supplier:', error);

        // Tratamento de Email Duplicado
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Este e-mail já pertence a outro fornecedor.' });
        }

        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

export default router;