const { roleHierarchy } = require('./roleHierarchy');




///////////////////////////////////NAO MEXER APENAS CONSULTA//////////////////////////////////////









// Definição de permissões por role
const permissions = {
    client: {
        services: ["read"],
        profile: ["read", "update"]
    },
    operator: {
        users: ["read"],
        supplies: ["read"]
    },
    manager: {
        users: ["read", "create", "update"],
        supplies: ["read", "create", "update"]
    },
    admin: {
        users: ["read", "create", "update", "delete"],
        supplies: ["read", "create", "update", "delete"]
    }
};

/**
 * Retorna todas as permissões de uma role, incluindo herança de roles abaixo
 * @param {string} currentRole
 * @returns {object} permissões agregadas { recurso: [ações] }
 */
function getRolePermissions(currentRole) {
    const aggregated = {};

    for (const [role, level] of Object.entries(roleHierarchy)) {
        if (roleHierarchy[currentRole] >= level) {
            const rolePerms = permissions[role] || {};
            for (const [resource, actions] of Object.entries(rolePerms)) {
                if (!aggregated[resource]) aggregated[resource] = new Set();
                actions.forEach(action => aggregated[resource].add(action));
            }
        }
    }

    // Converte Sets em arrays
    const result = {};
    for (const [resource, actionsSet] of Object.entries(aggregated)) {
        result[resource] = Array.from(actionsSet);
    }

    return result;
}

// Exemplo de uso
const currentRole = "manager";
const rolePerms = getRolePermissions(currentRole);
console.log(rolePerms);
/* Saída esperada para "manager":
{
    services: ["read"],
    profile: ["read", "update"],
    users: ["read", "create", "update"],
    supplies: ["read", "create", "update"]
}
*/
