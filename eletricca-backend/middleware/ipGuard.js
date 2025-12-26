function normalizeIP(ip) {
    if (!ip) return '';
    if(ip.startsWith('::ffff:')) return ip.split('::ffff:')[1];
    return ip;
}

function isLocalIP(ip) {
    normalizeIP(ip);
    if(!ip) return false;
    if(ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
    // IPV4 private ranges
    if(ip.startsWith('10.')) return true;
    if(ip.startsWith('192.168.')) return true;
    if(ip.startsWith('172.')) {
        const parts = ip.split('.');
        if(parts.length >=2 ){
            const second = parseInt(parts[1], 10);
            if(second >= 16 & second <=31) return true;
        }
    }
    return false;
};

function requireLocalAccess(req, res, next){
    const ip = req.ip || req.connection.remoteAddress  || req.headers['x-forwarded-for'];
    if (isLocalIP(ip)) return next();
    return res.status(403).json({error: 'Access denied: admin operations allowed only from local network!'});
};

export {
    isLocalIP,
    requireLocalAccess,
    normalizeIP
};
