// create_jwt.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.JWT_SECRET || 'change_me_quick';
const token = jwt.sign({ role: 'admin', user: 'dev' }, secret, { expiresIn: '24h' });
console.log(token);
