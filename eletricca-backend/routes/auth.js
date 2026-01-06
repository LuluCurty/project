import express from 'express';
import pool from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Client } from 'ssh2';
import { generateToken } from '../middleware/auth.js';
import {authenticateToken} from '../middleware/auth.js';

const router = express.Router();
const SALT_ROUNDS = 10;
const LINUX_CONFIG = {
    host: '10.242.241.245',
    sshPort: 22,
    readyTimeout: 5000
};

function authenticaViaSSH(username, password) {
    return new Promise((resolve) => {
        const connection = new Client();
        connection.on('ready', () => {
            connection.end();
            resolve(true);
        }).on('error', (error) => {
            console.error('SSH Error: ', error);
            resolve(false);
        }).on('close', (hadError) => {
            if (hadError) {
                resolve(false);
            }
        }).connect({
            host: LINUX_CONFIG.host,
            port: LINUX_CONFIG.sshPort,
            username: username,
            password: password,
            tryKeyboard: false,
            algorithms: {
                serverHostKey: [
                    'ssh-rsa', 
                    'ssh-ed25519', 
                    'ssh-dss', 
                    'rsa-sha2-512', 
                    'rsa-sha2-256', 
                    'ecdsa-sha2-nistp521',
                    'ecdsa-sha2-nistp384',
                    'ecdsa-sha2-nistp256'
                ]
            }
        })
    })
};
async function fetchUserPermissions(userId, roleId) {
    const query = `
        SELECT p.slug
        FROM permissions p
        JOIN role_permissions rp ON rp.permissions_id = p.id
        WHERE rp.role_id = $1

        UNION

        SELECT p.slug
        FROM permissions p
        JOIN user_permissions up ON up.permissions_id = p.id
        WHERE up.user_id = $2
    `;

    const { rows } = await pool.query(query, [roleId, userId]);
    return rows.map(r => r.slug);
}

router.post('/login', async (req, res) => {
    try {
        const { email, password_hashed: password, rememberMe} = req.body;

        //  1. primeiro a gente tenta pelo postgreesql para depois tentar 
        const queryUser = `
            SELECT u.*, r.name as roles_name
            FROM users u
            LEFT JOIN roles r on u.role_id = r.id
            WHERE email=$1
        `;

        const { rows } = await pool.query(queryUser, [email]);
        let user = rows[0]
        let authenticated = false;
        let authSource = '';
        // 2. verificamos se ele existe e fazemos a verificação de senha
        if (user) {
            authenticated = await bcrypt.compare(password, user.password_hashed);
            if (authenticated) authSource = 'LOCAL';
        }

        // 3. vericamos se ele existe no ssh
        if (!authenticated) {
            const usernameRemote = email.includes('@') ? email.split('@')[0] : email;
            const isSSHValid = await authenticaViaSSH(usernameRemote, password);
            if (isSSHValid) {
                authenticated = true;
                authSource = 'SSH';

                if (!user) {
                    console.log(`Ùsuario remoto aceito via ${authSource}, criando registro...`);
                    const dummyHash = await bcrypt.hash(Math.random().toString(), SALT_ROUNDS);
                    
                    const defaultRoleId = 4;
                    const newuserQuery = `
                        INSERT INTO users (
                            email, password_hashed, first_name, last_name, role_id, auth_source
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING *, (SELECT name FROM roles WHERE id=$5) as role_name;
                    `;
                    const parts = usernameRemote.split('.');
                    const first_name = parts[0];
                    const last_name =  parts.length > 1 ? parts[1] : '';
            
                    const newRows = await pool.query(newuserQuery, [
                        email,
                        dummyHash, 
                        first_name,
                        last_name,
                        defaultRoleId,
                        'Linux SSH'
                    ]);
                    user = newRows.rows[0];
                }
            }
        }

        if(!authenticated) return res.status(401).json({ error: 'Invalid credentials'});

        const permissions =  await fetchUserPermissions(user.user_id, user.role_id);
        user.permissions = permissions;

        const token = generateToken(user, rememberMe);
        const cookieDuration = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: cookieDuration
        })

        res.json({ 
            user: { user_id: user.user_id, 
                email: user.email, 
                user_role: user.user_role, 
                first_name: user.first_name, 
                last_name: user.last_name
            }
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao logar'});
    }
})

router.post('/logout', async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.json({ message: 'Deslogado',
            ok: true
        });        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao fazer logout'});
    }
})
router.get('/check', authenticateToken ,async (req, res) => {
    try{
        let authenticated = true;
        res.status(200).json({
            ok: true, 
            authenticated
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error'});
    }
})

export default router;