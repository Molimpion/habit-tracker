const crypto = require('crypto');

const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

function sign(content, secret) {
  return crypto.createHmac('sha256', secret).update(content).digest('base64url');
}

function signToken(claims, secret, { now = nowInSeconds(), expiresInSeconds }) {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, iat: now, exp: now + expiresInSeconds })
  ).toString('base64url');
  return `${HEADER}.${payload}.${sign(`${HEADER}.${payload}`, secret)}`;
}

function verifyToken(token, secret, { now = nowInSeconds() } = {}) {
  const parts = String(token).split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${payload}`, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
  if (!Number.isInteger(claims.exp) || now >= claims.exp) {
    return null;
  }
  return claims;
}

module.exports = { signToken, verifyToken };
