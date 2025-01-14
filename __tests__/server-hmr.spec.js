const changedData = {};

jest.mock('../lib/trigger.js', () => {
  return changedData;
});
const applyServerHMR = require('../lib/server-hmr');
const plugin = require('../lib/plugin');

function whenNativeHMRTriggeredWith(changedFiles) {
  changedData.changedFiles = changedFiles;

  const acceptCallback = mockModule.hot.accept.mock.calls[0][1];
  return acceptCallback();
}

describe('server-hmr', () => {
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
      options: { ns: ['name-space', 'nested/name-space'] },
    };
    jest.spyOn(plugin, 'addListener');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('with native HMR', () => {
    beforeEach(() => {
      global.mockModule = {
        hot: {
          accept: jest.fn(),
        },
      };

      applyServerHMR(i18nMock);
    });

    it('should accept hmr', () => {
      expect(global.mockModule.hot.accept).toHaveBeenCalledWith(
        './trigger.js',
        expect.any(Function)
      );
    });

    it('should reload resources on updated lang, ns', () => {
      const update = { lang: 'en', ns: 'name-space' };
      whenNativeHMRTriggeredWith([`${update.lang}/${update.ns}`]);

      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        [update.lang],
        [update.ns],
        expect.any(Function)
      );
    });

    it('should reload resources when nested namespace is updated', () => {
      const update = { lang: 'en', ns: 'nested/name-space' };
      whenNativeHMRTriggeredWith([`${update.lang}/${update.ns}`]);

      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        [update.lang],
        [update.ns],
        expect.any(Function)
      );
    });

    it('should reload resources when changed file based on back slashes (windows)', () => {
      const update = { lang: 'en', ns: 'nested/name-space' };
      whenNativeHMRTriggeredWith([`${update.lang}\\${update.ns.replace('/', '\\')}`]);

      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        [update.lang],
        [update.ns],
        expect.any(Function)
      );
    });

    it('should ignore changes of none loaded namespace', async () => {
      jest.spyOn(global.console, 'log');
      i18nMock.options = { backend: {}, ns: ['name-space'] };
      i18nMock.language = 'en';

      await whenNativeHMRTriggeredWith(['en/none-loaded-ns']);

      expect(global.console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Got an update with')
      );
      expect(i18nMock.reloadResources).not.toHaveBeenCalled();
    });

    it('should distinguish containing namespaces names', async () => {
      jest.spyOn(global.console, 'log');
      i18nMock.options = { backend: {}, ns: ['name-space'] };
      i18nMock.language = 'en';

      await whenNativeHMRTriggeredWith(['en/none-loaded-name-space']);

      expect(global.console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Got an update with')
      );
      expect(i18nMock.reloadResources).not.toHaveBeenCalled();
    });

    it('should notify on successful change', async () => {
      jest.spyOn(global.console, 'log');

      whenNativeHMRTriggeredWith(['en/name-space']);

      expect(global.console.log).toHaveBeenCalledWith(
        expect.stringContaining('Server reloaded locale')
      );
    });

    it('should notify when reload fails', async () => {
      reloadError = 'reload failed';

      jest.spyOn(global.console, 'log');

      whenNativeHMRTriggeredWith(['en/name-space']);

      expect(global.console.log).toHaveBeenCalledWith(expect.stringContaining(reloadError));
    });

    it('should support change of multiple files', () => {
      whenNativeHMRTriggeredWith([`en/name-space`, 'de/name-space']);

      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        ['en', 'de'],
        ['name-space'],
        expect.any(Function)
      );
    });
  });

  describe('without native HMR', () => {
    beforeEach(() => {
      global.mockModule = {};
      applyServerHMR(i18nMock);
    });

    it('should register a listener on webpack plugin', () => {
      expect(plugin.addListener).toHaveBeenCalled();
    });

    it('should reload resources on updated lang, ns', () => {
      const update = { lang: 'en', ns: 'name-space' };
      plugin.callbacks[0]({ changedFiles: [`${update.lang}/${update.ns}`] });

      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        [update.lang],
        [update.ns],
        expect.any(Function)
      );
    });

    it('should reload resources when nested namespace is updated', () => {
      const update = { lang: 'en', ns: 'nested/name-space' };
      plugin.callbacks[0]({ changedFiles: [`${update.lang}/${update.ns}`] });

      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        [update.lang],
        [update.ns],
        expect.any(Function)
      );
    });

    it('should reload resources when changed file based on back slashes (windows)', () => {
      const update = { lang: 'en', ns: 'nested/name-space' };
      plugin.callbacks[0]({ changedFiles: [`${update.lang}\\${update.ns.replace('/', '\\')}`] });

      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        [update.lang],
        [update.ns],
        expect.any(Function)
      );
    });

    it('should ignore changes of none loaded namespace', async () => {
      jest.spyOn(global.console, 'log');
      i18nMock.options = { backend: {}, ns: ['name-space'] };
      i18nMock.language = 'en';

      plugin.callbacks[0]({ changedFiles: ['en/none-loaded-ns'] });

      expect(global.console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Got an update with')
      );
      expect(i18nMock.reloadResources).not.toHaveBeenCalled();
    });

    it('should notify on successful change', async () => {
      jest.spyOn(global.console, 'log');

      await plugin.callbacks[0]({ changedFiles: ['en/name-space'] });

      expect(global.console.log).toHaveBeenCalledWith(
        expect.stringContaining('Server reloaded locale')
      );
    });

    it('should notify when reload fails', async () => {
      reloadError = 'reload failed';

      jest.spyOn(global.console, 'log');

      await plugin.callbacks[0]({ changedFiles: ['en/name-space'] });

      expect(global.console.log).toHaveBeenCalledWith(expect.stringContaining(reloadError));
    });

    it('should support change of multiple files', () => {
      plugin.callbacks[0]({ changedFiles: [`en/name-space`, 'de/name-space'] });

      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        ['en', 'de'],
        ['name-space'],
        expect.any(Function)
      );
    });
  });
});
