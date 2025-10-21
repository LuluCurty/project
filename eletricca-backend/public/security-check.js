function parseJWT(token) {
    try {
        const base64url = token.split('.')[1];
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c){
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);

    } catch (error) {
        return null;
    }
}

function isValidToken(token) {
    if (!token) return false;

    const decoded = parseJWT(token);
    if (!decoded || !decoded.exp) return false;

    const currentTime = Math.floor(Date.now()/1000);
    return decoded.exp > currentTime;
}

function checkAuth() {
    const token = localStorage.getItem('token');

    if(!isValidToken(token)){
        localStorage.removeItem('token');
        window.location.href = '/index.html';
        return null;
    }

    return token;   
}

function getAuthHeaders(includeJSON = true) {
    const token = checkAuth();

    const headers ={
        "Authorization": "Bearer " + token
    };

    if (includeJSON) {
        headers["Content-Type"] = "application/json";
    };

    return headers
}



window.addEventListener("DOMContentLoaded", checkAuth);