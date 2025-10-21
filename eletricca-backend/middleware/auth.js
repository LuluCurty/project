require('dotenv').config();
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'dev_secret';

function generateToken(user) {
    const payload = {
        user_id: user.user_id,
        user_role: user.user_role,
        email: user.email
    };
    return jwt.sign(payload, jwtSecret, {expiresIn: process.env.JWT_EXPIRES_IN || '8h'});
};

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
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

module.exports = {
    generateToken,
    authenticateToken,
    requireRole
}