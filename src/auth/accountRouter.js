const { errorResponse, toErrorResponse } = require('../api/router');
const { ValidationError } = require('../utils/errors');

function createAccountRouter(storage) {
  return async function handleAccountRequest({ method, readBody, userId }) {
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Faça login para continuar.');
    }
    try {
      if (method === 'GET') {
        return { status: 200, payload: storage.getAccount(userId) };
      }
      if (method === 'PATCH') {
        const { remindersEnabled } = await readBody();
        if (typeof remindersEnabled !== 'boolean') {
          throw new ValidationError('remindersEnabled deve ser true ou false.', 'remindersEnabled');
        }
        storage.setRemindersEnabled(userId, remindersEnabled);
        return { status: 200, payload: storage.getAccount(userId) };
      }
      return errorResponse(404, 'NOT_FOUND', 'Endpoint da API não encontrado.');
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

module.exports = { createAccountRouter };
