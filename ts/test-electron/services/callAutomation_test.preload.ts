// Copyright 2025 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import * as sinon from 'sinon';

import { itemStorage } from '../../textsecure/Storage.preload.js';

describe('callAutomation', function (this: Mocha.Suite) {
  this.timeout(15000);

  let sandbox: sinon.SinonSandbox;
  let mockIPC: {
    callAutomationMaximizeWindow: sinon.SinonStub;
    callAutomationMinimizeToTray: sinon.SinonStub;
    callAutomationRunScript: sinon.SinonStub;
  };

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    mockIPC = {
      callAutomationMaximizeWindow: sandbox.stub().resolves(),
      callAutomationMinimizeToTray: sandbox.stub().resolves(),
      callAutomationRunScript: sandbox.stub().resolves({ success: true }),
    };

    // Set up window.IPC mocks
    if (!window.IPC) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).IPC = {};
    }
    window.IPC.callAutomationMaximizeWindow =
      mockIPC.callAutomationMaximizeWindow;
    window.IPC.callAutomationMinimizeToTray =
      mockIPC.callAutomationMinimizeToTray;
    window.IPC.callAutomationRunScript = mockIPC.callAutomationRunScript;
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('runPreCallAutomation', () => {
    it('does nothing when no settings are enabled', async () => {
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-pre-script-path') {
          return undefined;
        }
        if (key === 'call-automation-maximize-on-call') {
          return false;
        }
        return undefined;
      });

      const { runPreCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );
      await runPreCallAutomation();

      sinon.assert.notCalled(mockIPC.callAutomationRunScript);
      sinon.assert.notCalled(mockIPC.callAutomationMaximizeWindow);
    });

    it('runs pre-call script when path is set', async () => {
      const scriptPath = '/path/to/script.sh';
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-pre-script-path') {
          return scriptPath;
        }
        if (key === 'call-automation-maximize-on-call') {
          return false;
        }
        return undefined;
      });

      const { runPreCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );
      await runPreCallAutomation();

      sinon.assert.calledOnceWithExactly(
        mockIPC.callAutomationRunScript,
        scriptPath
      );
      sinon.assert.notCalled(mockIPC.callAutomationMaximizeWindow);
    });

    it('maximizes window when setting is enabled', async () => {
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-pre-script-path') {
          return undefined;
        }
        if (key === 'call-automation-maximize-on-call') {
          return true;
        }
        return undefined;
      });

      const { runPreCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );
      await runPreCallAutomation();

      sinon.assert.notCalled(mockIPC.callAutomationRunScript);
      sinon.assert.calledOnce(mockIPC.callAutomationMaximizeWindow);
    });

    it('runs script first, then maximizes window', async () => {
      const scriptPath = '/path/to/script.sh';
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-pre-script-path') {
          return scriptPath;
        }
        if (key === 'call-automation-maximize-on-call') {
          return true;
        }
        return undefined;
      });

      const { runPreCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );
      await runPreCallAutomation();

      sinon.assert.calledOnce(mockIPC.callAutomationRunScript);
      sinon.assert.calledOnce(mockIPC.callAutomationMaximizeWindow);
      sinon.assert.callOrder(
        mockIPC.callAutomationRunScript,
        mockIPC.callAutomationMaximizeWindow
      );
    });

    it('handles script execution errors gracefully', async () => {
      const scriptPath = '/path/to/script.sh';
      mockIPC.callAutomationRunScript.resolves({
        success: false,
        error: 'Script not found',
      });

      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-pre-script-path') {
          return scriptPath;
        }
        if (key === 'call-automation-maximize-on-call') {
          return true;
        }
        return undefined;
      });

      const { runPreCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );

      // Should not throw even with script error
      await runPreCallAutomation();

      sinon.assert.calledOnce(mockIPC.callAutomationRunScript);
      sinon.assert.calledOnce(mockIPC.callAutomationMaximizeWindow);
    });

    it('handles script execution throws gracefully', async () => {
      const scriptPath = '/path/to/script.sh';
      mockIPC.callAutomationRunScript.rejects(new Error('IPC error'));

      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-pre-script-path') {
          return scriptPath;
        }
        if (key === 'call-automation-maximize-on-call') {
          return true;
        }
        return undefined;
      });

      const { runPreCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );

      // Should not throw even with IPC error
      await runPreCallAutomation();

      sinon.assert.calledOnce(mockIPC.callAutomationRunScript);
      sinon.assert.calledOnce(mockIPC.callAutomationMaximizeWindow);
    });

    it('waits for maximize to complete before returning', async () => {
      let maximizeResolved = false;
      let maximizeResolve: (() => void) | undefined;
      const maximizePromise = new Promise<void>(resolve => {
        maximizeResolve = () => {
          maximizeResolved = true;
          resolve();
        };
      });
      mockIPC.callAutomationMaximizeWindow.returns(maximizePromise);

      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-pre-script-path') {
          return undefined;
        }
        if (key === 'call-automation-maximize-on-call') {
          return true;
        }
        return undefined;
      });

      const { runPreCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );

      const automationPromise = runPreCallAutomation();

      // Verify maximize was called but automation hasn't completed yet
      sinon.assert.calledOnce(mockIPC.callAutomationMaximizeWindow);

      // Give microtask queue a chance to run
      await Promise.resolve();

      // Create a flag to track if automation completed
      let automationCompleted = false;
      const trackCompletion = async () => {
        await automationPromise;
        automationCompleted = true;
      };
      const completionPromise = trackCompletion();

      // Verify automation is still waiting
      await Promise.resolve();
      if (automationCompleted && !maximizeResolved) {
        throw new Error(
          'runPreCallAutomation should wait for maximize to complete'
        );
      }

      // Now resolve maximize
      if (maximizeResolve) {
        maximizeResolve();
      }

      // Wait for automation to complete
      await completionPromise;
    });

    it('waits for script to complete before maximize', async () => {
      const scriptPath = '/path/to/script.sh';
      const callOrder: Array<string> = [];

      let scriptResolve: (() => void) | undefined;
      const scriptPromise = new Promise<{ success: boolean }>(resolve => {
        scriptResolve = () => {
          callOrder.push('script-resolved');
          resolve({ success: true });
        };
      });

      mockIPC.callAutomationRunScript.callsFake(() => {
        callOrder.push('script-called');
        return scriptPromise;
      });

      mockIPC.callAutomationMaximizeWindow.callsFake(() => {
        callOrder.push('maximize-called');
        return Promise.resolve();
      });

      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-pre-script-path') {
          return scriptPath;
        }
        if (key === 'call-automation-maximize-on-call') {
          return true;
        }
        return undefined;
      });

      const { runPreCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );

      const automationPromise = runPreCallAutomation();

      // Give microtask queue a chance to run
      await Promise.resolve();
      await Promise.resolve();

      // Script should be called but maximize should not yet
      if (!callOrder.includes('script-called')) {
        throw new Error('Script should have been called');
      }
      if (callOrder.includes('maximize-called')) {
        throw new Error('Maximize should not be called before script resolves');
      }

      // Resolve script
      if (scriptResolve) {
        scriptResolve();
      }

      // Wait for automation to complete
      await automationPromise;

      // Verify order: script-called, script-resolved, maximize-called
      const scriptResolvedIdx = callOrder.indexOf('script-resolved');
      const maximizeCalledIdx = callOrder.indexOf('maximize-called');
      if (scriptResolvedIdx > maximizeCalledIdx) {
        throw new Error('Script should resolve before maximize is called');
      }
    });
  });

  describe('runPostCallAutomation', () => {
    it('does nothing when no settings are enabled', async () => {
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-minimize-after-call') {
          return false;
        }
        if (key === 'call-automation-post-script-path') {
          return undefined;
        }
        return undefined;
      });

      const { runPostCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );
      await runPostCallAutomation('conversation-1');

      sinon.assert.notCalled(mockIPC.callAutomationMinimizeToTray);
      sinon.assert.notCalled(mockIPC.callAutomationRunScript);
    });

    it('minimizes window when setting is enabled', async () => {
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-minimize-after-call') {
          return true;
        }
        if (key === 'call-automation-post-script-path') {
          return undefined;
        }
        return undefined;
      });

      const { runPostCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );
      await runPostCallAutomation('conversation-2');

      sinon.assert.calledOnce(mockIPC.callAutomationMinimizeToTray);
      sinon.assert.notCalled(mockIPC.callAutomationRunScript);
    });

    it('runs post-call script when path is set', async () => {
      const scriptPath = '/path/to/post-script.sh';
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-minimize-after-call') {
          return false;
        }
        if (key === 'call-automation-post-script-path') {
          return scriptPath;
        }
        return undefined;
      });

      const { runPostCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );
      await runPostCallAutomation('conversation-3');

      sinon.assert.notCalled(mockIPC.callAutomationMinimizeToTray);
      sinon.assert.calledOnceWithExactly(
        mockIPC.callAutomationRunScript,
        scriptPath
      );
    });

    it('minimizes first, then runs script', async () => {
      const scriptPath = '/path/to/post-script.sh';
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-minimize-after-call') {
          return true;
        }
        if (key === 'call-automation-post-script-path') {
          return scriptPath;
        }
        return undefined;
      });

      const { runPostCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );
      await runPostCallAutomation('conversation-4');

      sinon.assert.calledOnce(mockIPC.callAutomationMinimizeToTray);
      sinon.assert.calledOnce(mockIPC.callAutomationRunScript);
      sinon.assert.callOrder(
        mockIPC.callAutomationMinimizeToTray,
        mockIPC.callAutomationRunScript
      );
    });

    it('skips automation if called with same conversationId and call instance', async () => {
      const scriptPath = '/path/to/post-script.sh';
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-minimize-after-call') {
          return true;
        }
        if (key === 'call-automation-post-script-path') {
          return scriptPath;
        }
        return undefined;
      });

      const { runPostCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );

      // First call should run
      await runPostCallAutomation('conversation-dedup', 123);
      sinon.assert.calledOnce(mockIPC.callAutomationMinimizeToTray);
      sinon.assert.calledOnce(mockIPC.callAutomationRunScript);

      // Second call with same call instance should be skipped
      await runPostCallAutomation('conversation-dedup', 123);
      sinon.assert.calledOnce(mockIPC.callAutomationMinimizeToTray);
      sinon.assert.calledOnce(mockIPC.callAutomationRunScript);
    });

    it('runs automation again for the same conversation when call instance changes', async () => {
      const scriptPath = '/path/to/post-script.sh';
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-minimize-after-call') {
          return true;
        }
        if (key === 'call-automation-post-script-path') {
          return scriptPath;
        }
        return undefined;
      });

      const { runPostCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );

      await runPostCallAutomation('conversation-dedup', 1);
      await runPostCallAutomation('conversation-dedup', 2);

      sinon.assert.calledTwice(mockIPC.callAutomationMinimizeToTray);
      sinon.assert.calledTwice(mockIPC.callAutomationRunScript);
    });

    it('runs automation for different conversationIds', async () => {
      const scriptPath = '/path/to/post-script.sh';
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-minimize-after-call') {
          return true;
        }
        if (key === 'call-automation-post-script-path') {
          return scriptPath;
        }
        return undefined;
      });

      const { runPostCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );

      // First call
      await runPostCallAutomation('conversation-a');
      sinon.assert.calledOnce(mockIPC.callAutomationMinimizeToTray);

      // Second call with different ID should also run
      await runPostCallAutomation('conversation-b');
      sinon.assert.calledTwice(mockIPC.callAutomationMinimizeToTray);
    });

    it('handles script execution errors gracefully', async () => {
      const scriptPath = '/path/to/post-script.sh';
      mockIPC.callAutomationRunScript.resolves({
        success: false,
        error: 'Script failed',
      });

      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-minimize-after-call') {
          return true;
        }
        if (key === 'call-automation-post-script-path') {
          return scriptPath;
        }
        return undefined;
      });

      const { runPostCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );

      // Should not throw
      await runPostCallAutomation('conversation-error');

      sinon.assert.calledOnce(mockIPC.callAutomationMinimizeToTray);
      sinon.assert.calledOnce(mockIPC.callAutomationRunScript);
    });

    it('runs when conversationId is not provided', async () => {
      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-minimize-after-call') {
          return true;
        }
        if (key === 'call-automation-post-script-path') {
          return undefined;
        }
        return undefined;
      });

      const { runPostCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );

      await runPostCallAutomation();
      sinon.assert.calledOnce(mockIPC.callAutomationMinimizeToTray);

      // Should run again even without conversationId (no dedup without ID)
      await runPostCallAutomation();
      sinon.assert.calledTwice(mockIPC.callAutomationMinimizeToTray);
    });

    it('waits for minimize to complete before running script', async () => {
      const scriptPath = '/path/to/post-script.sh';
      const callOrder: Array<string> = [];

      let minimizeResolve: (() => void) | undefined;
      const minimizePromise = new Promise<void>(resolve => {
        minimizeResolve = () => {
          callOrder.push('minimize-resolved');
          resolve();
        };
      });

      mockIPC.callAutomationMinimizeToTray.callsFake(() => {
        callOrder.push('minimize-called');
        return minimizePromise;
      });

      mockIPC.callAutomationRunScript.callsFake(() => {
        callOrder.push('script-called');
        return Promise.resolve({ success: true });
      });

      sandbox.stub(itemStorage, 'get').callsFake(key => {
        if (key === 'call-automation-minimize-after-call') {
          return true;
        }
        if (key === 'call-automation-post-script-path') {
          return scriptPath;
        }
        return undefined;
      });

      const { runPostCallAutomation } = await import(
        '../../services/callAutomation.preload.js'
      );

      const automationPromise = runPostCallAutomation('test-conv');

      // Give microtask queue a chance to run
      await Promise.resolve();
      await Promise.resolve();

      // Minimize should be called but script should not yet
      if (!callOrder.includes('minimize-called')) {
        throw new Error('Minimize should have been called');
      }
      if (callOrder.includes('script-called')) {
        throw new Error('Script should not be called before minimize resolves');
      }

      // Resolve minimize
      if (minimizeResolve) {
        minimizeResolve();
      }

      // Wait for automation to complete
      await automationPromise;

      // Verify order: minimize-called, minimize-resolved, script-called
      const minimizeResolvedIdx = callOrder.indexOf('minimize-resolved');
      const scriptCalledIdx = callOrder.indexOf('script-called');
      if (minimizeResolvedIdx > scriptCalledIdx) {
        throw new Error('Minimize should resolve before script is called');
      }
    });
  });
});
