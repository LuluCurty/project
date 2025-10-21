const express = require('express');

const router = express.Router();

const { authenticateToken } = require('../middleware/auth');

const pool = require('../db');
const { authorize } = require('../middleware/roleBasedAccessControl');

router.use(authenticateToken);

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM announcements LIMIT 1');
        if(result.rows.length === 0) return res.json(null);
        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

router.post('/', async (req, res) => {
    try {
        const { link, message } = req.body;
        
        if(!message) return res.status(408).json({ error: 'Message is empty'});

        const result = await pool.query(`
            INSERT INTO announcements (id, message, link, updated_at) 
            VALUES (1, $1, $2, NOW())
            ON CONFLICT (id) DO UPDATE
            SET message = EXCLUDED.message,
                link = EXCLUDED.link,
                updated_at =  NOW()
            RETURNING *;`, [message, link || null]
        );

        res.json(result.rows[0]);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error'});
    }
})

module.exports = router;

/**
 * router.post
router.put
router.delete
 */
