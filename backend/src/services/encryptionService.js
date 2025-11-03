const crypto = require('crypto');
const { config } = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

class EncryptionService {
  constructor() {
    this.key = Buffer.from(config.encryption.key, 'base64');
    if (this.key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes for AES-256');
    }
  }

  encrypt(text) {
    if (!text || text === '') return null;
    
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const salt = crypto.randomBytes(SALT_LENGTH);
      
      const key = crypto.pbkdf2Sync(this.key, salt, 100000, 32, 'sha512');
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(String(text), 'utf8'),
        cipher.final()
      ]);
      
      const tag = cipher.getAuthTag();
      
      return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decrypt(encryptedData) {
    if (!encryptedData || encryptedData === '') return null;
    
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      
      const salt = buffer.subarray(0, SALT_LENGTH);
      const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
      const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION);
      const encrypted = buffer.subarray(ENCRYPTED_POSITION);
      
      const key = crypto.pbkdf2Sync(this.key, salt, 100000, 32, 'sha512');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  encryptObject(obj, fieldsToEncrypt) {
    if (!obj || !fieldsToEncrypt || fieldsToEncrypt.length === 0) {
      return obj;
    }

    const encrypted = { ...obj };
    fieldsToEncrypt.forEach(field => {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    });
    return encrypted;
  }

  decryptObject(obj, fieldsToDecrypt) {
    if (!obj || !fieldsToDecrypt || fieldsToDecrypt.length === 0) {
      return obj;
    }

    const decrypted = { ...obj };
    fieldsToDecrypt.forEach(field => {
      if (decrypted[field] !== undefined && decrypted[field] !== null) {
        try {
          decrypted[field] = this.decrypt(decrypted[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error.message);
        }
      }
    });
    return decrypted;
  }
}

module.exports = new EncryptionService();