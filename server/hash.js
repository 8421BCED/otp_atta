const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('Password@2525', 10));
