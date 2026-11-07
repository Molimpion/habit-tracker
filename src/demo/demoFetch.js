const { parseJsonText } = require('../api/router');

function createDemoFetch(handleApiRequest, fallbackFetch) {
  return async function demoFetch(input, init = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url, 'http://demo.local');
    if (!url.pathname.startsWith('/api/')) {
      return fallbackFetch(input, init);
    }

    const { status, payload } = await handleApiRequest({
      method: (init.method || 'GET').toUpperCase(),
      pathname: url.pathname,
      searchParams: url.searchParams,
      readBody: async () => parseJsonText(init.body),
    });

    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  };
}

module.exports = { createDemoFetch };
