const { roleHierarchy } = require('../middleware/roleHierarchy');
const permissions = require('../permissions.json');

const systemResources = [
    "profile", "users", "supplies", "services", "supplies_variation", "supplies_lists", "supplies_test",
    "clients", "supplies_suppliers", "price"
];

// "create"
// "read" 
// "update"
// "delete"

const granularPermissions = {
    client: {
        users: ["read"],
        profile: ["read", "update"],
        services: ["read", "update"],
    },
    operator: {
        users: ["read", "update"],
        profile: ["read", "update"],
        services: ["read", "update"],

        supplies: ["read"],
        supplies_lists: ["read", "create", "update", "delete"],
        supplies_suppliers: ["read"],
    },
    manager: {
        users: ["read", "update", "delete"],
        profile: ["read", "update"],

        services: ["read", "create", "update", "delete"],

        suppliers: ["read", "create", "update", "delete"],
        supplies_lists: ["read", "create", "update","delete"],
        supplies_suppliers: ["read", "create", "update", "delete"]
    },
    admin: {
        users: ["read", "create", "update", "delete"],
        profile: ["read", "update"],
        services: ["read", "create", "update", "delete"],
        
        supplies: ["read", "create", "update", "delete"],
        supplies_lists: ["read", "create", "update", "delete"],
        supplies_suppliers: ["read", "create", "update", "delete"],
    }
};

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