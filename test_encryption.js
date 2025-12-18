const crypto = require('crypto');

const secret = process.env.ENCRYPTION_SECRET || 'default_secret_please_change';
const key = crypto.createHash('sha256').update(String(secret)).digest();

const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedData = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        return 'Decryption Failed';
    }
};

const myKey = "AIzaSyBfSj77H_63eauDU8fhvyJkhF0Nm2Cn9AA";
const encrypted = encrypt(myKey);

console.log("Original:", myKey);
console.log("Secret Phase:", secret);
console.log("Encrypted (Send this in 'x-encrypted-api-key' header):");
console.log(encrypted);
console.log("Decrypted check:", decrypt(encrypted));
