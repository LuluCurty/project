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

// svelte 
const svelteRoutes = require('./routes/svelteRoutes');

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

const publicFrontendPath = path.join(__dirname, 'public');

//app.get('/', (req, res) => res.json({ status: 'backend is working'}));
app.use(svelteRoutes);
app.use(express.static(publicFrontendPath));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/supplies', suppliesRoutes);
app.use('/api/ann', announcementRoutes);
app.use('/api/suplist', suppliesListsRoutes);
app.use('/api/client', clientsRoutes);

app.use((req, res) => {
    const reqPath = path.join(publicFrontendPath, req.path);
    if (fs.existsSync(reqPath)){
        return res.sendFile(reqPath);
    }
    return res.status(404).send('404 - Pagina não encontrada');
})


const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log(`Server is listening on ${port}`));