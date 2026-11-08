const { errorResponse, toErrorResponse } = require('../api/router');

function createAuthRouter(authService) {
  return async function handleAuthRequest({ method, pathname, readBody }) {
    try {
      if (pathname === '/api/auth/register' && method === 'POST') {
        return { status: 201, payload: authService.register(await readBody()) };
      }
      if (pathname === '/api/auth/login' && method === 'POST') {
        return { status: 200, payload: authService.login(await readBody()) };
      }
      return errorResponse(404, 'NOT_FOUND', 'Endpoint da API não encontrado.');
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

module.exports = { createAuthRouter };
