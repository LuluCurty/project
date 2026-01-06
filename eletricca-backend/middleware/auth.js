import 'dotenv/config.js';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'dev_secret';

function generateToken(user, rememberMe) {
    const payload = {
        user_id: user.user_id,
        user_role: user.user_role,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role_id: user.role_id,
        role_name: user.role_name || 'Sem Cargo',
        permissions: user.permissions || []
    };
    const expiresIn = rememberMe ? '7d' : '2h';
    return jwt.sign(payload, jwtSecret, {expiresIn:expiresIn || process.env.JWT_EXPIRES_IN || '8h'});
};

function authenticateToken(req, res, next) {
    const token = 
        req.cookies?.token || 
        (req.headers['authorization'] && req.headers['authorization'].split(' ')[1])
    ;
    
    if (!token) return res.status(401).json({ error: 'Missing token'});

    jwt.verify(token, jwtSecret, (err, payload) => {
        if(err) return res.status(401).json({ error: 'Invalid token'});
        req.user = payload;
        next();
    });
}

function requireRole(user_role) {
    return function (req, res, next) {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated'});
        if (req.user.user_role !== user_role) return res.status(403).json({ error: 'Forbidden: insufficient role'});
        next();
    };
}

export {
    generateToken,
    authenticateToken,
    requireRole
}