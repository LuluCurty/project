const express = require('express');
const path = require('path');

const router = express.Router();

// RODAR PELO DEV PQ NGM QUER BUILDAR ISSO TODA HORA

const svelteRoutes = [
    "lists", 'dashboard', 'clients', 'suppliers' //adicionar mais, esse é a rota de produção.
];

const svelteFrontendPath = path.join(__dirname, '..', 'eletricca-frontend', 'build');

router.use('/lists', express.static(svelteFrontendPath)); // pasta raiz
router.use('/lists/lists', express.static(svelteFrontendPath)); // subpasta lists


module.exports = router;