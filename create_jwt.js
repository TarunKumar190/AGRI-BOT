// create_jwt.js
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'change_me_quick';
const token = jwt.sign({ role: 'admin', user: 'dev' }, secret, { expiresIn: '24h' });
console.log(token);
