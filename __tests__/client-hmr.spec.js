let changedData = {};
jest.mock('../lib/trigger.js', () => {
  return changedData;
});

global.mockModule = {
  hot: {
    accept: jest.fn(),
  },
};

const applyClientHMR = require('../lib/client-hmr');

function whenHotTriggeredWith(changedFiles) {
  changedData.changedFiles = changedFiles;

  const acceptCallback = mockModule.hot.accept.mock.calls[0][1];
  return acceptCallback();
}

describe('client-hmr', () => {
  let i18nMock;
  let reloadError;

  beforeEach(() => {
    reloadError = undefined;

    i18nMock = {
      reloadResources: jest.fn().mockImplementation((_lang, _ns, callbackFn) => {
        if (typeof callbackFn === 'function') {
          callbackFn(reloadError);
        }
        return Promise.resolve();
      }),
      changeLanguage: jest.fn(),
    };

    mockModule.hot.accept.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should warn regarding missing backend options', () => {
    jest.spyOn(global.console, 'warn');
    applyClientHMR(i18nMock);
    expect(global.console.warn).toHaveBeenCalledWith(
      expect.stringContaining('i18next-backend not found'),
      expect.any(String),
      expect.any(String)
    );
  });

  it('should use backend options from global options as cache killer param', () => {
    i18nMock.options = { backend: {}, ns: ['name-space'] };
    i18nMock.language = 'en';

    applyClientHMR(i18nMock);

    whenHotTriggeredWith(['en/name-space']);

    expect(i18nMock.options.backend).toHaveProperty('queryStringParams', { _: expect.any(Number) });
  });

  it('should use backend options from services as cache killer param', () => {
    i18nMock.services = {
      ...i18nMock.services,
      backendConnector: { backend: { options: {} } },
    };
    i18nMock.language = 'en';
    i18nMock.options = { ns: ['name-space'] };

    applyClientHMR(i18nMock);

    whenHotTriggeredWith(['en/name-space']);

    expect(i18nMock.services.backendConnector.backend.options).toHaveProperty('queryStringParams', {
      _: expect.any(Number),
    });
  });

  it('should trigger reload when translation file changed', async () => {
    i18nMock.options = { backend: {}, ns: ['name-space'] };
    i18nMock.language = 'en';

    applyClientHMR(i18nMock);

    await whenHotTriggeredWith(['en/name-space']);

    expect(i18nMock.reloadResources).toHaveBeenCalledWith(
      ['en'],
      ['name-space'],
      expect.any(Function)
    );
    expect(i18nMock.changeLanguage).toHaveBeenCalledWith('en');
  });

  it('should trigger reload when lng-country combination file changed', async () => {
    i18nMock.options = { backend: {}, ns: ['name-space'] };
    i18nMock.language = 'en-US';

    applyClientHMR(i18nMock);

    await whenHotTriggeredWith(['en-US/name-space']);

    expect(i18nMock.reloadResources).toHaveBeenCalledWith(
      ['en-US'],
      ['name-space'],
      expect.any(Function)
    );
    expect(i18nMock.changeLanguage).toHaveBeenCalledWith('en-US');
  });

  it('should trigger reload when translation file changed with nested namespace', async () => {
    i18nMock.options = { backend: {}, ns: ['name-space', 'nested/name-space'] };
    i18nMock.language = 'en';

    applyClientHMR(i18nMock);

    await whenHotTriggeredWith(['en/nested/name-space']);

    expect(i18nMock.reloadResources).toHaveBeenCalledWith(
      ['en'],
      ['nested/name-space'],
      expect.any(Function)
    );
    expect(i18nMock.changeLanguage).toHaveBeenCalledWith('en');
  });

  it('should trigger reload when translation file with backslashes (windows)', async () => {
    i18nMock.options = { backend: {}, ns: ['name-space', 'nested/name-space'] };
    i18nMock.language = 'en';

    applyClientHMR(i18nMock);

    await whenHotTriggeredWith(['en\\nested\\name-space']);

    expect(i18nMock.reloadResources).toHaveBeenCalledWith(
      ['en'],
      ['nested/name-space'],
      expect.any(Function)
    );
    expect(i18nMock.changeLanguage).toHaveBeenCalledWith('en');
  });

  it('should not trigger changeLanguage when current lang is not the one that was edited', async () => {
    i18nMock.options = { backend: {}, ns: ['name-space'] };
    i18nMock.language = 'en';

    applyClientHMR(i18nMock);

    await whenHotTriggeredWith(['otherLang/name-space']);

    expect(i18nMock.reloadResources).toHaveBeenCalledWith(
      ['otherLang'],
      ['name-space'],
      expect.any(Function)
    );
    expect(i18nMock.changeLanguage).not.toHaveBeenCalled();
  });

  it('should notify that reload resource failed', async () => {
    jest.spyOn(global.console, 'error');
    i18nMock.options = { backend: {}, ns: ['name-space'] };
    i18nMock.language = 'en';
    reloadError = 'reload failed';

    applyClientHMR(i18nMock);
    await whenHotTriggeredWith(['en/name-space']);

    expect(i18nMock.changeLanguage).not.toHaveBeenCalled();
    expect(global.console.error).toHaveBeenCalledWith(
      expect.stringContaining(reloadError),
      expect.any(String),
      expect.any(String)
    );
  });

  it('should ignore changes of none loaded namespace', async () => {
    jest.spyOn(global.console, 'log');
    i18nMock.options = { backend: {}, ns: ['name-space'] };
    i18nMock.language = 'en';

    applyClientHMR(i18nMock);

    await whenHotTriggeredWith(['en/none-loaded-ns']);

    expect(global.console.log).not.toHaveBeenCalledWith(
      expect.stringContaining('Got an update with'),
      expect.any(String)
    );
    expect(i18nMock.reloadResources).not.toHaveBeenCalled();
    expect(i18nMock.changeLanguage).not.toHaveBeenCalled();
  });

  it('should distinguish containing namespaces names', async () => {
    jest.spyOn(global.console, 'log');
    i18nMock.options = { backend: {}, ns: ['name-space'] };
    i18nMock.language = 'en';

    applyClientHMR(i18nMock);

    await whenHotTriggeredWith(['en/none-loaded-name-space']);

    expect(global.console.log).not.toHaveBeenCalledWith(
      expect.stringContaining('Got an update with'),
      expect.any(String)
    );
    expect(i18nMock.reloadResources).not.toHaveBeenCalled();
    expect(i18nMock.changeLanguage).not.toHaveBeenCalled();
  });

  describe('multiple files', () => {
    it('should support change of multiple files', async () => {
      i18nMock.options = { backend: {}, ns: ['name-space', 'name-space2'] };
      i18nMock.language = 'en';

      applyClientHMR(i18nMock);

      await whenHotTriggeredWith(['en/name-space', 'en/name-space2', 'de/name-space']);

      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        ['en', 'de'],
        ['name-space', 'name-space2'],
        expect.any(Function)
      );
      expect(i18nMock.changeLanguage).toHaveBeenCalled();
    });

    it('should not trigger `changeLanguage` when modified files are not related to the current language', async () => {
      i18nMock.options = { backend: {}, ns: ['name-space', 'name-space2'] };
      i18nMock.language = 'en';

      applyClientHMR(i18nMock);

      await whenHotTriggeredWith(['de/name-space', 'de/name-space2']);

      expect(i18nMock.changeLanguage).not.toHaveBeenCalled();
    });
  });
});
