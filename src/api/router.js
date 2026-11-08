const CHECKIN_ROUTE = /^\/api\/habits\/([^/]+)\/checkin$/;
const ITEM_ROUTE = /^\/api\/habits\/([^/]+)$/;

function parseJsonText(raw) {
  if (!raw || raw.trim() === '') {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    const syntaxError = new Error('JSON inválido no corpo da requisição.');
    syntaxError.statusCode = 400;
    syntaxError.code = 'VALIDATION_ERROR';
    throw syntaxError;
  }
}

function errorResponse(status, code, message, fields) {
  const error = fields ? { code, message, fields } : { code, message };
  return { status, payload: { error } };
}

function toErrorResponse(error) {
  if (!error.statusCode || !error.code) {
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno no servidor.');
  }
  return errorResponse(error.statusCode, error.code, error.message, error.fields);
}

function createApiRouter({ habitService, version }) {
  async function route({ method, pathname, searchParams, readBody }) {
    if (pathname === '/api/health' && method === 'GET') {
      return {
        status: 200,
        payload: {
          status: 'ok',
          service: 'HabitFlow API',
          version,
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (pathname === '/api/habits/stats' && method === 'GET') {
      return { status: 200, payload: habitService.getDashboardStats() };
    }

    if (pathname === '/api/habits' && method === 'GET') {
      const filters = {
        category: searchParams.get('category') || undefined,
        status: searchParams.get('status') || undefined,
        search: searchParams.get('search') || undefined,
      };
      return { status: 200, payload: habitService.getAllHabits(filters) };
    }

    if (pathname === '/api/habits' && method === 'POST') {
      const body = await readBody();
      return { status: 201, payload: habitService.createHabit(body) };
    }

    const checkinMatch = pathname.match(CHECKIN_ROUTE);
    if (checkinMatch && method === 'POST') {
      const id = decodeURIComponent(checkinMatch[1]);
      const body = await readBody();
      return { status: 200, payload: habitService.toggleCheckIn(id, body.date) };
    }

    const itemMatch = pathname.match(ITEM_ROUTE);
    if (itemMatch) {
      const id = decodeURIComponent(itemMatch[1]);

      if (method === 'GET') {
        return { status: 200, payload: habitService.getHabitById(id) };
      }

      if (method === 'PUT') {
        const body = await readBody();
        return { status: 200, payload: habitService.updateHabit(id, body) };
      }

      if (method === 'DELETE') {
        const deleted = habitService.deleteHabit(id);
        return {
          status: 200,
          payload: {
            message: 'Hábito removido com sucesso.',
            deletedHabit: deleted,
          },
        };
      }
    }

    return errorResponse(404, 'NOT_FOUND', 'Endpoint da API não encontrado.');
  }

  return async function handleApiRequest(request) {
    try {
      return await route(request);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

module.exports = { createApiRouter, parseJsonText, errorResponse, toErrorResponse };
