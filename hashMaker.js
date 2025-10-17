const bcrypt = require('bcrypt')

const senha = "eletrO@8002"
const saltRounds = 10;

bcrypt.hash(senha, saltRounds, function(error, hash) {
    if(error) throw error;
    console.log('Hash gerado: ', hash)
    
})