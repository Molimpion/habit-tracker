const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { HabitService } = require('./services/habitService');
const { JsonFileStorage } = require('./storage/jsonFileStorage');
const {
  createApiRouter,
  parseJsonText,
  errorResponse,
  toErrorResponse,
} = require('./api/router');
const { version } = require('../package.json');

const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'data', 'habits.json');

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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

function createAppServer(customDataFile) {
  const habitService = new HabitService(
    new JsonFileStorage(customDataFile || DEFAULT_DATA_FILE)
  );
  const handleApiRequest = createApiRouter({ habitService, version });
  const publicDir = path.join(__dirname, 'public');

  const requestListener = async (req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        return res.end();
      }

      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;

      if (pathname.startsWith('/api/')) {
        const { status, payload } = await handleApiRequest({
          method: req.method,
          pathname,
          searchParams: parsedUrl.searchParams,
          readBody: () => parseJsonBody(req),
        });
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
  return server;
}

module.exports = { createAppServer };
