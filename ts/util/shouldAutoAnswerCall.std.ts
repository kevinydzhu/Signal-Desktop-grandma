// Copyright 2025 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import { CallMode } from '../types/CallDisposition.std.js';

export type ShouldAutoAnswerProps = {
  autoAnswerEnabled?: boolean;
  callMode: CallMode;
};

export function shouldAutoAnswerCall({
  autoAnswerEnabled,
  callMode,
}: ShouldAutoAnswerProps): boolean {
  return Boolean(autoAnswerEnabled) && callMode === CallMode.Direct;
}

export type CreateAutoAnswerTimerProps = {
  countdownSeconds: number;
  onCountdownTick: (remainingSeconds: number) => void;
  onAutoAnswer: () => void;
};

export type AutoAnswerTimer = {
  start: () => void;
  stop: () => void;
};

export function createAutoAnswerTimer({
  countdownSeconds,
  onCountdownTick,
  onAutoAnswer,
}: CreateAutoAnswerTimerProps): AutoAnswerTimer {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let remaining = countdownSeconds;

  const start = (): void => {
    remaining = countdownSeconds;
    onCountdownTick(remaining);

    intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (intervalId != null) {
          clearInterval(intervalId);
          intervalId = null;
        }
        onAutoAnswer();
      } else {
        onCountdownTick(remaining);
      }
    }, 1000);
  };

  const stop = (): void => {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { start, stop };
}
