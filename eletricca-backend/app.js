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
const usersRoutes = require('./routes/users');
const suppliesRoutes = require('./routes/supplies');
const announcementRoutes = require('./routes/announce');
const suppliesListsRoutes = require('./routes/api/supplies/list');
const clientsRoutes = require('./routes/api/clients/clients');
const supplier_route = require('./routes/api/suppliers/supppliers');
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

app.use((req, res) => {
    const reqPath = path.join(publicFrontendPath, req.path);
    if (fs.existsSync(reqPath)){
        return res.sendFile(reqPath);
    }
    return res.status(404).send('404 - Pagina não encontrada');
})


const port = process.env.PORT || 3000;

function displayStats() {

    const memory = memoryUsage();
    const uptime = process.uptime();
    const requestRate = requestCount - lastRequestCount;
    lastRequestCount = requestCount;

    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);


    console.log(`        Port:               ${port}
        PID:                ${pid}
        Uptime:             ${hours}h ${minutes}m ${seconds}s
        Node:               ${version}
        Requests:
            Total:          ${requestCount}
            Rate:           ${requestRate}/sec
        Memory:
            RSS:            ${(memory.rss / 1024 / 1024).toFixed(2)} MB
            Heap Used:      ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB
            Heap Total:     ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB
            External:       ${(memory.external / 1024 / 1024).toFixed(2)} MB
            ArrayBuffers:   ${(memory.arrayBuffers / 1024 / 1024).toFixed(2)} MB
        CPU:
            User:           ${(cpuUsage().user / 1000).toFixed(2)} ms
            System:         ${(cpuUsage().system / 1000).toFixed(2)} ms
        Last update: ${new Date().toLocaleDateString()}\n`);
}




app.listen(port, ()=> {
    console.log(` Server is listening `);
    displayStats();
});

