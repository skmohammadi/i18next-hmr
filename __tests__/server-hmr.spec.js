const changedData = {};

jest.mock('../lib/trigger.js', () => {
  return changedData;
});
const applyServerHMR = require('../lib/server-hmr');
const plugin = require('../lib/plugin');

function whenNativeHMRTriggeredWith(lang, ns) {
  changedData.lang = lang;
  changedData.ns = ns;

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
    };
    jest.spyOn(plugin, 'addListener');
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
      whenNativeHMRTriggeredWith(update.lang, update.ns);

      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        [update.lang],
        [update.ns],
        expect.any(Function)
      );
    });

    it('should notify on successful change', async () => {
      spyOn(global.console, 'log').and.callThrough();

      whenNativeHMRTriggeredWith('en', 'name-space');

      expect(global.console.log).toHaveBeenCalledWith(
        expect.stringContaining('Server reloaded locale')
      );
    });

    it('should notify when reload fails', async () => {
      reloadError = 'reload failed';

      spyOn(global.console, 'log').and.callThrough();

      whenNativeHMRTriggeredWith('en', 'name-space');

      expect(global.console.log).toHaveBeenCalledWith(expect.stringContaining(reloadError));
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
      plugin.callbacks[0](update);
      expect(i18nMock.reloadResources).toHaveBeenCalledWith(
        [update.lang],
        [update.ns],
        expect.any(Function)
      );
    });

    it('should notify on successful change', async () => {
      spyOn(global.console, 'log').and.callThrough();

      await plugin.callbacks[0]({ lang: 'en', ns: 'ns' });

      expect(global.console.log).toHaveBeenCalledWith(
        expect.stringContaining('Server reloaded locale')
      );
    });

    it('should notify when reload fails', async () => {
      reloadError = 'reload failed';

      spyOn(global.console, 'log').and.callThrough();

      await plugin.callbacks[0]({ lang: 'en', ns: 'ns' });

      expect(global.console.log).toHaveBeenCalledWith(expect.stringContaining(reloadError));
    });
  });
});
