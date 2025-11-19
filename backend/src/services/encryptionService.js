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
    if (!text && text !== 0) return null; // Обработка 0 и пустых значений
    const textToEncrypt = String(text);
    
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const salt = crypto.randomBytes(SALT_LENGTH);
      
      const key = crypto.pbkdf2Sync(this.key, salt, 100000, 32, 'sha512');
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(textToEncrypt, 'utf8'),
        cipher.final()
      ]);
      
      const tag = cipher.getAuthTag();
      
      return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // !!! ВАЖНОЕ ИСПРАВЛЕНИЕ !!!
      // Проверяем, достаточна ли длина данных для содержания метаданных (Salt + IV + Tag)
      // Если длина меньше 96 байт (64+16+16), значит это не зашифрованные нами данные.
      if (buffer.length < ENCRYPTED_POSITION) {
        // Возвращаем данные как есть, предполагая, что это старый незашифрованный текст
        return encryptedData; 
      }
      
      const salt = buffer.subarray(0, SALT_LENGTH);
      const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
      const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION);
      const encrypted = buffer.subarray(ENCRYPTED_POSITION);
      
      // Дополнительная проверка на валидность IV
      if (iv.length !== IV_LENGTH) {
         return encryptedData;
      }

      const key = crypto.pbkdf2Sync(this.key, salt, 100000, 32, 'sha512');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (error) {
      // Если расшифровка не удалась по другой причине, логируем и возвращаем оригинал,
      // чтобы не ронять сервер
      console.warn(`Decryption failed for value, returning original. Error: ${error.message}`);
      return encryptedData;
    }
  }

  // ... остальные методы (encryptObject, decryptObject) остаются без изменений
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
          // Оставляем оригинальное значение, если не удалось расшифровать
        }
      }
    });
    return decrypted;
  }
}

module.exports = new EncryptionService();