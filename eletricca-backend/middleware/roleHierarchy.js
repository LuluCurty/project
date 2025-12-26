const roleHierarchy = {
    "admin": 3,
    "manager": 2,
    "operator": 1,
    "client": 0
};


/**
 * 
 * @param {Function} getTargetRole you passes a function and it returns the user role and if
 * is allowed to manage it
 */

function canManage(getTargetRole) {
    return async (req, res, next) => {
        try {
            const currentRole = req.user.user_role;
            const targetRole = await getTargetRole(req);

            if (currentRole === 'admin') {
                return next();
            }

            if (roleHierarchy[currentRole] <= roleHierarchy[targetRole]) {
                return res.status(403).json({ error: 'Forbbiden: cannot manage user on this role'});                
            };
            next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error'});
        }
    };
};


function canCreate(req, res, next) {
    /**
     * @param {req, res, next} 
     * @return next()
     */
      try {
        const currentRole = req.user.user_role;
        const { user_role: targetRole} = req.body;



        // only admins can create another admin
        if (targetRole === 'admin' && currentRole !== 'admin'){
            return res.status(403).json({ error: 'Forbidden: cannot create users with this role'});
        }
        // rule 2 ONLY MANAGER AND ADMIN CAN CREATE ANOTHER USER
        if (currentRole !== 'admin' && currentRole !== 'manager'){
            return res.status(403).json({ error: 'Forbidden: cannot create users with this role'});
        }
        // rule 3 NO MANAGER CAN CREATE ANOTHER MANAGER
        if (currentRole === 'manager' && targetRole=== 'manager'){
            return res.status(403).json({ error: 'Forbidden: cannot create users with this role'});
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error'});
    };
};



/**
 * 
 * @param {Function} getTargetRole 
 * @returns a new function that validates the progress of the user flux
 */

function canDelete(getTargetRole) {
    return async (req, res, next) =>{
        try {
            // apenas admin podem deletar admins
            // regra geral de delete: admin > manager > operator > client
            // admin DEL ALL
            // manager DEL OP CL
            // operator & client NONE
            const currentRole = req.user.user_role;
            const targetRole = await getTargetRole(req);

            if (currentRole === 'admin') {
                return next();
            };

            if (targetRole === 'admin' && currentRole !== 'admin') {
                return res.status(403).json({ error: 'Forbidden'});
            };

            if(currentRole === 'operator' || currentRole === 'client'){
                return res.status(403).json({ error: 'Forbidden'});
            };


            if (roleHierarchy[currentRole] <= roleHierarchy[targetRole]) {
                return res.status(403).json( { error:'Forbidden1' });
            } else {
                return next();
            }
            
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Server internal error'});
            
        }
    }
}




export { canManage, roleHierarchy, canCreate, canDelete };