(function () {
  const MODULE_FILES = [
    'utils/streakCalculator.js',
    'services/habitService.js',
    'storage/localStorageStorage.js',
    'api/router.js',
    'demo/demoFetch.js',
  ];
  const STORAGE_KEY = 'habitflow:habits';
  const BUILTINS = {
    crypto: { randomUUID: () => window.crypto.randomUUID() },
  };

  const nativeFetch = window.fetch.bind(window);
  const sources = {};
  const cache = {};

  function resolve(fromId, request) {
    const parts = fromId.split('/').slice(0, -1);
    for (const segment of request.split('/')) {
      if (segment === '..') {
        parts.pop();
      } else if (segment !== '.') {
        parts.push(segment);
      }
    }
    return `${parts.join('/')}.js`;
  }

  function load(id) {
    if (cache[id]) {
      return cache[id].exports;
    }
    if (!(id in sources)) {
      throw new Error(`Módulo não incluído no modo demo: ${id}`);
    }
    const module = { exports: {} };
    cache[id] = module;
    const factory = new Function('module', 'exports', 'require', sources[id]);
    factory(module, module.exports, (request) => BUILTINS[request] || load(resolve(id, request)));
    return module.exports;
  }

  const ready = Promise.all([
    nativeFetch('lib/package.json').then((response) => response.json()),
    ...MODULE_FILES.map((file) =>
      nativeFetch(`lib/${file}`)
        .then((response) => response.text())
        .then((text) => {
          sources[file] = text;
        })
    ),
  ]).then(([{ version }]) => {
    const { HabitService } = load('services/habitService.js');
    const { LocalStorageStorage } = load('storage/localStorageStorage.js');
    const { createApiRouter } = load('api/router.js');
    const { createDemoFetch } = load('demo/demoFetch.js');

    const habitService = new HabitService(
      new LocalStorageStorage(window.localStorage, STORAGE_KEY)
    );
    return createDemoFetch(createApiRouter({ habitService, version }), nativeFetch);
  });

  window.fetch = (input, init) => ready.then((demoFetch) => demoFetch(input, init));
})();
