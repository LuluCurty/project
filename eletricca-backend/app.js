require('dotenv').config();

const express= require('express');
const bodyParser = require('express').json;
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const suppliesRoutes = require('./routes/supplies');
const announcementRoutes = require('./routes/announce');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const path = require('path');
const pool = require("./db");

const app = express();

if(process.env.TRUST_PROXY === 'true'){
    app.set('trust proxy', true);
};

// app.use(epress.json);
app.use(bodyParser());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:54445",
    credentials: true
}))

//app.get('/', (req, res) => res.json({ status: 'backend is working'}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/supplies', suppliesRoutes);
app.use('/api/ann', announcementRoutes);


const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log(`Server is listening on ${port}`));