require('dotenv').config();

const express= require('express');
const bodyParser = require('express').json;
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const pool = require("./db");
const fs = require('fs');

// rotas
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/api/users/router');
const suppliesRoutes = require('./routes/api/supplies/supplies');
const announcementRoutes = require('./routes/announce');
const suppliesListsRoutes = require('./routes/api/supplies/list');
const clientsRoutes = require('./routes/api/clients/clients');
const supplier_route = require('./routes/api/suppliers/supppliers');
const ucmRoutes = require('./routes/api/ucm/route');
const { memoryUsage, version, pid, cpuUsage } = require('process');
let requestCount = 0;
let lastRequestCount = 0;
// svelte 

const app = express();

if(process.env.TRUST_PROXY === 'true'){
    app.set('trust proxy', true);
};

app.use(bodyParser());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))
app.use((req, res, next) => {
    requestCount++;
    next();
})

const publicFrontendPath = path.join(__dirname, 'public');

//app.get('/', (req, res) => res.json({ status: 'backend is working'}));
app.use(express.static(publicFrontendPath));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/supplies', suppliesRoutes);
app.use('/api/ann', announcementRoutes);
app.use('/api/suplist', suppliesListsRoutes);
app.use('/api/client', clientsRoutes);
app.use('/api/supplier', supplier_route);
app.use('/api/ucm', ucmRoutes);

app.use((req, res) => {
    const reqPath = path.join(publicFrontendPath, req.path);
    if (fs.existsSync(reqPath)){
        return res.sendFile(reqPath);
    }
    return res.status(404).send('404 - Pagina não encontrada');
})


const port = process.env.PORT || 3000;

let dbStats = {
    total: 0,
    select: 0,
    insert: 0,
    update: 0,
    delete: 0,
    other: 0
};
let lastDbStats = {...dbStats};

const originalQuery = pool.query.bind(pool);
pool.query = function(query, ...args) {
    dbStats.total++;

    const queryStr = typeof query === 'string' ? query: query.text || '';
    const queryType = queryStr.trim().split(' ')[0].toUpperCase();

    switch(queryType) {
        case 'SELECT':
            dbStats.select++;
            break;
        case 'UPDATE':
            dbStats.update++;
            break;
        case 'INSERT':
            dbStats.insert++;
            break;
        case 'DELETE':
            dbStats.delete++;
            break;
        default: 
            dbStats.other++;
    }

    return originalQuery(query, ...args);
}

function displayStats() {

    const memory = memoryUsage();
    const uptime = process.uptime();
    const requestRate = requestCount - lastRequestCount;
    const dbQueryRate = dbStats.total - lastDbStats.total;
    lastRequestCount = requestCount;
    lastDbStats = {...dbStats};

    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    console.clear();
    console.log(`        Port:               ${port}
        PID:                ${pid}
        Uptime:             ${hours}h ${minutes}m ${seconds}s
        Node:               ${version}
        HTTP Requests:
            Total:          ${requestCount}
            Rate:           ${requestRate}/sec
        DB Queries:
            Total:          ${dbStats.total}
            Rate:           ${dbQueryRate}/sec
            Ratio:          ${requestCount > 0 ? (dbStats.total / requestCount).toFixed(2) : '0.00'} queries/request
                SELECT:     ${dbStats.select}
                INSERT:     ${dbStats.insert}
                UPDATE:     ${dbStats.update}
                DELETE:     ${dbStats.delete}
                OTHER:      ${dbStats.other}
        Memory:
            RSS:            ${(memory.rss / 1024 / 1024).toFixed(2)} MB
            Heap Used:      ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB
            Heap Total:     ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB
        CPU:
            User:           ${(cpuUsage().user / 1000).toFixed(2)} ms
            System:         ${(cpuUsage().system / 1000).toFixed(2)} ms
        Last update: ${new Date().toLocaleDateString()}\n`);
}




app.listen(port, ()=> {
    console.log(` Server is listening `);
    //setInterval(displayStats, 1000);
});

