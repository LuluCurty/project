const express = require('express');
const router = express.Router();

const pool = require('../db');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/roleBasedAccessControl');

router.use(authenticateToken);

// criar novos materias

router.post('/create', authorize('supplies', 'create'), async (req, res) => {
    try {
        const { details, supply_name, image_url, quantity, price, supplier } = req.body;

        const { rows } = await pool.query(`
            INSERT INTO supplies
            (supply_name, quantity, image_url, details, price, supplier)
            VALUES
            ($1, $2, $3, $4, $5, $6) 
            RETURNING id, supply_name, creation_date
            ;`,
            [supply_name, quantity, image_url, details, price, supplier]
        );

        res.status(201).json({ user: rows[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/', authorize('supplies', 'read'), async (req, res) => {
    try {
        const { page = 1, limit = 25 } = req.query;
        const offset = (page - 1) * limit;
        // query
        const { rows } = await pool.query(`SELECT id, supply_name, quantity, image_url, details, price, supplier, creation_date
            FROM supplies
            ORDER BY supply_name DESC
            LIMIT $1 OFFSET $2;
        `, [limit, offset]);
        if (rows === 0) {
            return res.status(404).json({ error: 'Materiais nao encontrados' });
        }
        // total de registros para calcular a quanditade de paginas
        const countQueryResult = await pool.query(`SELECT COUNT(*) FROM supplies;`);
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
        res.status(500).json({ error: 'Internl server error: s' });
    }
});

router.put('/:id', authorize('supplies', 'update'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { details, supply_name, image_url, quantity, price, supplier } = req.body;

        const { rowCount, rows } = await pool.query(`
            UPDATE supplies
            SET
                supply_name = COALESCE($1, supply_name),
                quantity = COALESCE($2, quantity),
                image_url = COALESCE($3, image_url),
                details = COALESCE($4, details),
                price = COALESCE($5, price),
                supplier = COALESCE($6, supplier)
            WHERE id=$7
            ;`, [supply_name, quantity, image_url, details, price, supplier, id]
        );

        if (rowCount === 0) {
            return res.status(500).json({ error: 'Material não atualizado' });
        }
        res.json({ ok: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error put' });
    }
});

router.delete('/:id', authorize('supplies', 'delete'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        console.log(id);

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


// ARQUIVOS

const upload = multer({ dest: "uploads/" });

router.post('/import', authorize("supplies", "create"), upload.single("file"), async (req, res) => {
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


/**
 * BARRA DE PESQUISA
 */

router.get('/search', authorize('supplies', 'read'), async (req, res) => {
    try {
        const q = req.query.q || '';
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
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
    try {
        const id = parseInt(req.params.id, 10);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'ID inválido (deve ser número inteiro)' });
        }

        const { rows } = await pool.query(`
            SELECT id, supply_name, quantity, image_url, details, price, supplier, creation_date
            FROM supplies
            WHERE id=$1;
            ;`,
            [id]
        );
        if (rows === 0) {
            return res.status(404).json({ error: 'Material não encontrado' });
        }
        res.json({ supply: rows[0] });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error get' });
    }
});
/**/

module.exports = router;

