const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { HabitService } = require('./services/habitService');
const { SqliteStorage } = require('./storage/sqliteStorage');
const { AuthService } = require('./auth/authService');
const { createAuthRouter } = require('./auth/authRouter');
const { createAccountRouter } = require('./auth/accountRouter');
const {
  createApiRouter,
  parseJsonText,
  errorResponse,
  toErrorResponse,
} = require('./api/router');
const { version } = require('../package.json');

const DEFAULT_DATABASE_FILE = path.join(__dirname, '..', 'data', 'habitflow.db');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendError(res, { status, payload }) {
  return sendJson(res, status, payload);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.destroy();
        reject(new Error('Payload muito grande'));
      }
    });
    req.on('end', () => {
      try {
        resolve(parseJsonText(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function createAppServer({ databaseFile, jwtSecret }) {
  const resolvedDatabaseFile = databaseFile || DEFAULT_DATABASE_FILE;
  const storage = new SqliteStorage(resolvedDatabaseFile);
  const authService = new AuthService(storage, jwtSecret);
  const handleAuthRequest = createAuthRouter(authService);
  const handleAccountRequest = createAccountRouter(storage);
  const handleApiRequest = createApiRouter({
    habitServiceFor: (userId) => new HabitService(storage.forUser(userId)),
    version,
  });
  const publicDir = path.join(__dirname, 'public');

  const requestListener = async (req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        });
        return res.end();
      }

      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;

      if (pathname.startsWith('/api/auth/')) {
        const { status, payload } = await handleAuthRequest({
          method: req.method,
          pathname,
          readBody: () => parseJsonBody(req),
        });
        return sendJson(res, status, payload);
      }

      if (pathname === '/api/account') {
        const { status, payload } = await handleAccountRequest({
          method: req.method,
          readBody: () => parseJsonBody(req),
          userId: authService.authenticate(req.headers.authorization),
        });
        return sendJson(res, status, payload);
      }

      if (pathname.startsWith('/api/')) {
        const { status, payload, headers, body } = await handleApiRequest({
          method: req.method,
          pathname,
          searchParams: parsedUrl.searchParams,
          readBody: () => parseJsonBody(req),
          userId: authService.authenticate(req.headers.authorization),
        });
        if (body !== undefined) {
          res.writeHead(status, headers);
          return res.end(body);
        }
        return sendJson(res, status, payload);
      }

      const requestedFile = pathname === '/' ? 'index.html' : pathname.slice(1);
      const safeFilePath = path.normalize(path.join(publicDir, requestedFile));

      if (!safeFilePath.startsWith(publicDir)) {
        return sendError(res, errorResponse(403, 'FORBIDDEN', 'Acesso negado.'));
      }

      if (fs.existsSync(safeFilePath) && fs.statSync(safeFilePath).isFile()) {
        const ext = path.extname(safeFilePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        return fs.createReadStream(safeFilePath).pipe(res);
      }

      return sendError(res, errorResponse(404, 'NOT_FOUND', 'Recurso não encontrado.'));
    } catch (error) {
      return sendError(res, toErrorResponse(error));
    }
  };

  const server = http.createServer(requestListener);
  server.requestListener = requestListener;
  server.databaseFile = resolvedDatabaseFile;
  return server;
}

module.exports = { createAppServer };
