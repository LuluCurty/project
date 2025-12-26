import 'dotenv/config.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';

const bodyParser = express.json;

// rotas
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/api/users/users.js';
import suppliesRoutes from './routes/api/supplies/supplies.js';
import announcementRoutes from './routes/announce.js';
import suppliesListsRoutes from './routes/api/supplies/list.js';
import clientsRoutes from './routes/api/clients/clients.js';
import supplier_route from './routes/api/suppliers/supppliers.js';
import ucmRoutes from './routes/api/ucm/route.js';
// svelte 
import { handler } from  './eletricca-frontend/build/handler.js';

const __filename  = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
// legado
const publicFrontendPath = path.join(__dirname, 'public');
app.use(express.static(publicFrontendPath));
// legado

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/supplies', suppliesRoutes);
app.use('/api/ann', announcementRoutes);
app.use('/api/suplist', suppliesListsRoutes);
app.use('/api/client', clientsRoutes);
app.use('/api/supplier', supplier_route);
app.use('/api/ucm', ucmRoutes);


const svelteBuildPath = path.join(__dirname, 'eletricca-frontend', 'build', 'client');
app.use(express.static(svelteBuildPath));
app.use(handler);

app.use((req, res) => {
    const reqPath = path.join(publicFrontendPath, req.path);
    if (fs.existsSync(reqPath)){
        return res.sendFile(reqPath);
    }
    return res.status(404).send('404 - Pagina não encontrada');
})


const port = process.env.PORT || 3000;

const httpsOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/intranet.eletricca.com.br/privkey.pem'),
	cert: fs.readFileSync('/etc/letsencrypt/live/intranet.eletricca.com.br/fullchain.pem')
}

https.createServer(httpsOptions, app).listen(port, () => {
    console.log('Rodando!');
})
