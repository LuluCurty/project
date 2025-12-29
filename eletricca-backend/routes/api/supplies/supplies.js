import e from 'express';
const router = e.Router();
import pool from '../../../db.js';
import multer from 'multer';
import path, { parse } from 'path';
import fs from 'fs';
import { authorize } from '../../../middleware/roleBasedAccessControl.js';
import { authenticateToken } from '../../../middleware/auth.js';
import { exec } from 'child_process';

router.use(authenticateToken);

// POST /api/supplies/create
router.post('/', async (req, res) => {
    const { supply_name, quantity, details, image_url, supplier_id, price } = req.body;

    if (!supply_name) return res.status(400).json({
        error: 'Nome do material é obrigatório',
        ok: false,
        message: 'Não foi possivel adicionar este material'
    })

    const client = await pool.connect();

    try {
        // inicio do socket 
        await client.query('BEGIN');

        // inserir material na tabela supplies
        const insertSupplyText = `
            INSERT INTO supplies (supply_name, quantity, details, image_url)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const supplyValues = [supply_name, quantity || 0, details || null, image_url || null];

        const supplyResponse = await client.query(insertSupplyText, supplyValues);

        const newSupplyId = supplyResponse.rows[0].id;

        // vamos vincular o material ao preço e fornecerdor

        if (supplier_id) {
            const insertPriceText = `
            INSERT INTO supply_pricing (supply_id, supplier_id, price, is_default)
            VALUES ($1, $2, $3, true)
        `;
            // joga null no campo price para evitar problemas com o frontend
            const priceValue = price === '' || price === undefined ? 0 : price;
            await client.query(insertPriceText, [newSupplyId, supplier_id, priceValue]);
        }


        await client.query('COMMIT');

        res.status(201).json({
            ok: true,
            message: 'Material criado com sucesso',
            supplyId: newSupplyId
        });
    } catch (e) {
        // vantagem do connect
        // se deu erro em algum ponto, volta atras em tudo
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ ok: false, message: 'Internal server error', error: e });
    } finally {
        client.release();
    }
})

router.get('/', authorize('supplies', 'read'), async (req, res) => {
    try {
        // setup
        const { page = 1, limit = 20 } = req.query;
        const search = req.query.search ? `%${req.query.search}%` : `%`;
        const offset = (page - 1) * limit;

        // 1. A Query Principal agora busca dados em 3 tabelas
        // Usamos 's' para supplies, 'sp' para supply_pricing e 'sup' para supplier
        const queryText = `
            SELECT
                s.id,
                s.supply_name,
                s.quantity,
                s.image_url,
                s.details,
                s.creation_date,
                sp.price,
                sup.supplier_name AS supplier
            FROM supplies s
            -- Tras o preço padrão (is_default = true)
            LEFT JOIN supply_pricing sp ON s.id = sp.supply_id AND sp.is_default = true
            -- Traz o nome do fornecedor baseado no id que esta no supply_pricieng
            LEFT JOIN supplier sup ON sp.supplier_id = sup.id
            WHERE
                s.supply_name ILIKE $1
            ORDER BY s.supply_name DESC
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(queryText, [search, limit, offset]);

        if (rows.length === 0 && page === 1) {
            return res.status(404).json({ error: 'Materiais nao encontrados' });
        }
        // total de registros para calcular a quanditade de paginas
        const countQueryResult = await pool.query(`SELECT COUNT(*) FROM supplies WHERE supply_name ILIKE $1;`, [search]);
        const totalItems = parseInt(countQueryResult.rows[0].count, 10);
        res.json({
            supplies: rows,
            page: Number(page),
            limit: Number(limit),
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
        });
    } catch (error) {
        console.error('Erro ao listar materiais' + error);
        res.status(500).json({ error: 'Internl server error: ' });
    }
});

router.post('/pricing/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { supplier_id, price } = req.body;

    try{
        const query = `
            INSERT INTO supply_pricing (supply_id, supplier_id, price, is_default)
            VALUES ($1, $2, $3, false)
            ON CONFLICT (supply_id, supplier_id)
            DO UPDATE SET price = $3, updated_at = NOW()
            RETURNING *;
        `;

        await pool.query(query, [id, supplier_id, price || 0]);
        res.json({ok: true, message: 'Preço/Forncedor atualizado'});

    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error/Erro ao atualizar preço' });
    }
});

router.put('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { supply_name, quantity, details } = req.body;

    try {        
        const result = await pool.query(`
            UPDATE supplies
            SET
                supply_name = COALESCE($1, supply_name),
                quantity = COALESCE($2, quantity),
                details = COALESCE($3, details)
            WHERE id=$4
            ;`, [supply_name, quantity, details, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Material não atualizado' });
        }
        res.json({ ok: true, message: 'Dados Atualizados' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/pricing/:id/default', async (req, res) => {
    const id = parseInt(req.params.id, 10); //supply_id
    const { supplier_id } = req.body;

    const client =  await pool.connect();

    try{
        await client.query('BEGIN');

        await client.query(
            'UPDATE supply_pricing SET is_default = false WHERE supply_id = $1',
            [id]
        );

        await client.query(
            'UPDATE supply_pricing SET is_default = true WHERE supply_id = $1 AND supplier_id = $2',
            [id, supplier_id]
        );
        await client.query('COMMIT');
        res.json({ok: true});
    } catch (e) {
        console.error(e);
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Internal server error/Erro ao definir padrão', ok: false });
    } finally {
        client.release();
    }
});

router.delete('/pricing/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { supplier_id } = req.body;
    try{
        await pool.query(
            `DELETE FROM supply_pricing WHERE supply_id=$1 AND supplier_id=$2`,
            [id, supplier_id]
        );
        res.status(200).json({ ok: true, message: 'Fornecedor removido com sucesso'});
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: 'Internal server error/Erro ao remove fornecedor' });
    }
})
// ARQUIVOS

const upload = multer({ dest: "uploads/" });

router.post('/import', authorize("supplies", "create"), upload.single("file"), async (req, res) => {
    console.log('Rota /import chamada');
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo encontrado" });
        };

        const excelPath = path.resolve(req.file.path);
        const pythonScript = path.resolve("python_scripts/import_to_supplies.py");

        console.log("Arquivo recebido", excelPath);

        // usando child proccess para executar o arquivo python

        exec(`python3 "${pythonScript}" "${excelPath}"`, async (error, stdout, stderr) => {
            console.log('TESTE');

            if (error) {
                console.error('erro ao executar python', error);
                res.status(500).json({ error: "Script python nao executado" });
            };

            console.log(stdout);
            if (stderr) {
                console.log("Aviso:" + stderr);
            };

            const jsonPath = path.resolve("supplies.json");
            if (!fs.existsSync(jsonPath)) {
                return res.status(500).json({ error: "Json nao encontrado" });
            };

            const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
            let insertedIndex = 0;

            for (const item of data) {
                const { supply_name, quantity, image_url, details } = item;

                const exists = await pool.query(`
                    SELECT id FROM supplies WHERE supply_name = $1
                    ;`, [supply_name]
                );

                if (exists.rows.length > 0) {
                    continue;
                };

                await pool.query(`
                    INSERT INTO supplies (supply_name, quantity, image_url, details)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (supply_name) DO NOTHING;`
                    , [supply_name, quantity, image_url, details]
                );

                insertedIndex++;
            };

            fs.unlinkSync(jsonPath);

            res.json({
                message: "Importação concluida com sucesso",
                insertedIndex,
                total: data.length
            });
        });
    } catch (error) {
        console.error("Erro ao importa lista:" + error);
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.get('/search', authorize('supplies', 'read'), async (req, res) => {
    try {
        const q = req.query.q || '';
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        // Verificação simples — impede erro se "q" vier vazio
        if (typeof q !== 'string') {
            return res.status(400).json({ error: 'Parâmetro de busca inválido' });
        }
        const offset = (page - 1) * limit;
        const { rows } = await pool.query(`
            SELECT id, supply_name, quantity, image_url, details, price, supplier
            FROM supplies
            WHERE supply_name ILIKE '%' || $1 || '%'
            ORDER BY supply_name ASC 
            LIMIT $2 OFFSET $3;
            `, [q, limit, offset]
        );

        const countResult = await pool.query(`
            SELECT COUNT(*) 
            FROM supplies
            WHERE supply_name 
            ILIKE '%' || $1 || '%';
            `, [q]
        );
        const totalItems = parseInt(countResult.rows[0].count, 10);

        res.json({
            supplies: rows,
            page: Number(page),
            limit: Number(limit),
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Nao foi possivel buscar o material" });
    }
})

router.get('/:id', authorize('supplies', 'read'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID inválido (deve ser número inteiro)' });
    }
    const client = await pool.connect();

    try {
        const supplyResponse = await client.query(`
            SELECT *
            FROM supplies
            WHERE id=$1;
            ;`,
            [id]
        );

        if (supplyResponse.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Material não encontrado', ok:false});
        }
        const princingResponse = await client.query(`
            SELECT
                sp.supplier_id,
                s.supplier_name,
                sp.price,
                sp.updated_at,
                sp.is_default
            FROM supply_pricing sp
            JOIN supplier s on sp.supplier_id = s.id
            WHERE sp.supply_id = $1
            ORDER BY sp.price ASC
            ;`, [id]
        );

        client.release();

        res.json({
            ...supplyResponse.rows[0],
            pricing: princingResponse.rows
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error get' });
    }
});

router.delete('/:id', authorize('supplies', 'delete'), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rowCount } = await pool.query(`
            DELETE FROM supplies WHERE id=$1
            ;`, [id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Material não encontrado' });
        }

        res.json({ message: 'Material removido com sucesso', ok: true, success: true, deletedId: id })

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export default router;
