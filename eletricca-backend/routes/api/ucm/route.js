import express from 'express';
const router = express.Router();
import axios from 'axios';
import https from 'https';
import crypto from 'crypto';

const UCM = {
    host: '10.242.241.240',
    username: "cdrapi",
    password: "cdrapi123",
    protocol: "https",
    port: 8089
};
const BASE_URL = `${UCM.protocol}://${UCM.host}:${UCM.port}`;

let cachedCookie = null;
let cookieExpiresAt = 0;

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

async function getChallenge() {
    const body = {
        request: {
            action: "challenge",
            user: UCM.username,
        }
    };

    const res = await axios.post(`${BASE_URL}/api`, body, { httpsAgent });
    return res.data?.response?.challenge;
};

async function getValidCookie() {
    const now = Date.now();

    if (cachedCookie && now < cookieExpiresAt) {
        return cachedCookie;
    }

    const challenge = await getChallenge();
    const cookie = await login(challenge);

    cachedCookie = cookie;
    cookieExpiresAt = now + 9 * 60 * 1000;

    return cachedCookie;
}

async function login(challenge) {
    const token = crypto.createHash('md5').update(challenge + UCM.password).digest('hex');

    const body = {
        request: {
            action: "login",
            user: UCM.username,
            token
        }
    };

    const res = await axios.post(`${BASE_URL}/api`, body, { httpsAgent });

    if (res.data.status !== 0 ) {
        throw new Error('Falha no login: ' + JSON.stringify(res.data));
    };

    return res.data.response.cookie;
}

async function getExtensions(cookie) {
    const body = {
        request: {
            action: "listAccount",
            cookie: cookie,
            options: "extension,fullname,addr"
        }
    };

    const res = await axios.post(`${BASE_URL}/api`, body, {
        httpsAgent,
    });

    return res.data;
}

router.get('/', async (req, res) => {
    try{
        const cookie = await getValidCookie();
        const result = await getExtensions(cookie);

        res.json({
            status: "ok",
            data: result
        });

    } catch (e) {
        res.status(500).json({
            status: 'Error',
            message: e.message
        });
    }
});

export default router; 