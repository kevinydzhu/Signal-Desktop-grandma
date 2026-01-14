// Copyright 2025 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import { createLogger } from '../logging/log.std.js';
import { itemStorage } from '../textsecure/Storage.preload.js';

const log = createLogger('callAutomation');

let lastAutomatedCallId: string | null = null;

async function runPreCallAutomationImpl(): Promise<void> {
  const scriptPath = itemStorage.get('call-automation-pre-script-path');
  const shouldMaximize = itemStorage.get(
    'call-automation-maximize-on-call',
    false
  );

  // Run script first (before window activation)
  if (scriptPath) {
    log.info('Running pre-call script');
    try {
      const result = await window.IPC.callAutomationRunScript(scriptPath);
      if (!result.success) {
        log.error(`Pre-call script failed: ${result.error}`);
      }
    } catch (error) {
      log.error('Pre-call script error:', error);
    }
  }

  // Then maximize window
  if (shouldMaximize) {
    log.info('Maximizing window for incoming call');
    window.IPC.callAutomationMaximizeWindow();
  }
}

async function runPostCallAutomationImpl(
  conversationId?: string
): Promise<void> {
  if (conversationId && conversationId === lastAutomatedCallId) {
    log.info('Post-call automation already ran for this call, skipping');
    return;
  }
  if (conversationId) {
    lastAutomatedCallId = conversationId;
  }

  const shouldMinimize = itemStorage.get(
    'call-automation-minimize-after-call',
    false
  );
  const scriptPath = itemStorage.get('call-automation-post-script-path');

  // Minimize first
  if (shouldMinimize) {
    log.info('Minimizing to tray after call');
    window.IPC.callAutomationMinimizeToTray();
  }

  // Then run script
  if (scriptPath) {
    log.info('Running post-call script');
    try {
      const result = await window.IPC.callAutomationRunScript(scriptPath);
      if (!result.success) {
        log.error(`Post-call script failed: ${result.error}`);
      }
    } catch (error) {
      log.error('Post-call script error:', error);
    }
  }
}

// Exported object that can be stubbed in tests
export const callAutomationImpl = {
  runPreCallAutomation: runPreCallAutomationImpl,
  runPostCallAutomation: runPostCallAutomationImpl,
};

// Public API - delegates to callAutomationImpl so tests can stub it
export function runPreCallAutomation(): Promise<void> {
  return callAutomationImpl.runPreCallAutomation();
}

export function runPostCallAutomation(conversationId?: string): Promise<void> {
  return callAutomationImpl.runPostCallAutomation(conversationId);
}
