const { roleHierarchy } = require('../middleware/roleHierarchy');
const permissions = require('../permissions.json');

const systemResources = [
    "profile", "users", "supplies", "services", "supplies_variation"
];

// "create"
// "read" 
// "update"
// "delete"

const granularPermissions = {
    client: {
        users: ["read"],
        profile: ["read", "update"],
        supplies: [],
        services: ["read", "update"],
        supplies_variation: []
    },
    operator: {
        users: ["read", "update"],
        profile: ["read", "update"],
        supplies: ["read"],
        services: ["read", "update"],
        supplies_variation: ["read", "create", "update", "delete"]
    },
    manager: {
        users: ["read", "update", "delete"],
        profile: ["read", "update"],
        supplies: ["read", "create", "update", "delete"],
        services: ["read", "create", "update", "delete"],
        supplies_variation: ["read", "create", "update","delete"]
    },
    admin: {
        users: ["read", "create", "update", "delete"],
        profile: ["read", "update"],
        supplies: ["read", "create", "update", "delete"],
        services: ["read", "create", "update", "delete"],
        supplies_variation: ["read", "create", "update", "delete"]
    }
};


function getRolePermissionDEADFORNOW(currentRole) {
    try {
        const aggregated = {};
        for (const [role, level] of Object.entries(roleHierarchy)) {
            if (roleHierarchy[currentRole] >= level) {
                const rolePerms = granularPermissions[role] || {};
                //console.log(role + ' '+ level);
                for (const [systemResources, actions] of Object.entries(rolePerms)) {
                    if (!aggregated[systemResources]) {
                        aggregated[systemResources] = new Set();
                    };
                    actions.forEach(action => {
                        aggregated[systemResources].add(action);
                    });
                };
            };
        };
        const result = {};
        for(const [systemResources, actionsSet] of Object.entries(aggregated)){
            result[systemResources] = Array.from(actionsSet);
        };
        return result
    } catch (error) {
        console.error(error);        
    }
}

function authorize(systemResource, action) {
    return (req, res, next) => {
        try {
            if (!req.user.user_role || !req.user) {
                return res.status(401).json({ error: 'Not authenticated'});
            }

            const currentRole = req.user.user_role;
            const perms = getRolePermission(currentRole);

            if (!perms[systemResource] || !perms[systemResource].includes(action)) {
                return res.status(403).json({ error: 'Insufficient permissions'});
            }

            next();

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error'});            
        }
    };
};

function getRolePermission(roleName) {
    return permissions[roleName] || {};
}






module.exports = { authorize, getRolePermission };