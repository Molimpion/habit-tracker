const crypto = require('crypto');
const { signToken, verifyToken } = require('./jwt');
const { ValidationError, UnauthorizedError } = require('../utils/errors');

const TOKEN_TTL_SECONDS = 24 * 60 * 60;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_CREDENTIALS = 'E-mail ou senha inválidos.';
const KEY_LENGTH = 64;
const UNKNOWN_USER_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function passwordMatches(password, storedHash) {
  const [, saltHex, hashHex] = storedHash.split('$');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH);
  return crypto.timingSafeEqual(expected, actual);
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

class AuthService {
  constructor(storage, secret) {
    this.storage = storage;
    this.secret = secret;
  }

  register(payload) {
    const { name, email, password } = payload || {};
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = normalizeEmail(email);

    if (!trimmedName) {
      throw new ValidationError('O nome é obrigatório.', 'name');
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      throw new ValidationError('Informe um e-mail válido.', 'email');
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
        'password'
      );
    }

    const user = {
      id: `usr-${crypto.randomUUID()}`,
      name: trimmedName,
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    this.storage.createUser(user);
    return this._session(user);
  }

  login(payload) {
    const { email, password } = payload || {};
    const user = this.storage.findUserByEmail(normalizeEmail(email));
    const candidate = typeof password === 'string' ? password : '';
    const matches = passwordMatches(candidate, user ? user.passwordHash : UNKNOWN_USER_HASH);

    if (!user || !matches) {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }
    return this._session(user);
  }

  authenticate(authorizationHeader) {
    if (typeof authorizationHeader !== 'string' || !authorizationHeader.startsWith('Bearer ')) {
      return null;
    }
    const claims = verifyToken(authorizationHeader.slice('Bearer '.length), this.secret);
    return claims && typeof claims.sub === 'string' ? claims.sub : null;
  }

  _session(user) {
    return {
      token: signToken({ sub: user.id }, this.secret, { expiresInSeconds: TOKEN_TTL_SECONDS }),
      user: toPublicUser(user),
    };
  }
}

module.exports = { AuthService };
