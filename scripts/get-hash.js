const { randomBytes, scryptSync } = require('crypto');
const salt = randomBytes(16).toString('hex');
const hash = scryptSync('pilot123', salt, 64).toString('hex');
console.log(`${salt}:${hash}`);
