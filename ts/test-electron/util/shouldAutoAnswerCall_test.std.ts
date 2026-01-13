// Copyright 2025 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import { assert } from 'chai';
import * as sinon from 'sinon';

import {
  shouldAutoAnswerCall,
  createAutoAnswerTimer,
} from '../../util/shouldAutoAnswerCall.std.js';
import { CallMode } from '../../types/CallDisposition.std.js';

describe('shouldAutoAnswerCall', () => {
  describe('shouldAutoAnswerCall function', () => {
    it('returns true for direct calls when autoAnswerEnabled is true', () => {
      const result = shouldAutoAnswerCall({
        autoAnswerEnabled: true,
        callMode: CallMode.Direct,
      });
      assert.isTrue(result);
    });

    it('returns false for direct calls when autoAnswerEnabled is false', () => {
      const result = shouldAutoAnswerCall({
        autoAnswerEnabled: false,
        callMode: CallMode.Direct,
      });
      assert.isFalse(result);
    });

    it('returns false for direct calls when autoAnswerEnabled is undefined', () => {
      const result = shouldAutoAnswerCall({
        autoAnswerEnabled: undefined,
        callMode: CallMode.Direct,
      });
      assert.isFalse(result);
    });

    it('returns false for group calls even when autoAnswerEnabled is true', () => {
      const result = shouldAutoAnswerCall({
        autoAnswerEnabled: true,
        callMode: CallMode.Group,
      });
      assert.isFalse(result);
    });

    it('returns false for group calls when autoAnswerEnabled is false', () => {
      const result = shouldAutoAnswerCall({
        autoAnswerEnabled: false,
        callMode: CallMode.Group,
      });
      assert.isFalse(result);
    });

    it('returns false for adhoc calls even when autoAnswerEnabled is true', () => {
      const result = shouldAutoAnswerCall({
        autoAnswerEnabled: true,
        callMode: CallMode.Adhoc,
      });
      assert.isFalse(result);
    });
  });

  describe('createAutoAnswerTimer', () => {
    let sandbox: sinon.SinonSandbox;
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      clock = sandbox.useFakeTimers();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('calls onCountdownTick immediately with initial countdown value when started', () => {
      const onCountdownTick = sandbox.stub();
      const onAutoAnswer = sandbox.stub();

      const timer = createAutoAnswerTimer({
        countdownSeconds: 3,
        onCountdownTick,
        onAutoAnswer,
      });

      timer.start();

      assert.isTrue(onCountdownTick.calledOnceWith(3));
      assert.isFalse(onAutoAnswer.called);
    });

    it('calls onCountdownTick each second with decreasing values', async () => {
      const onCountdownTick = sandbox.stub();
      const onAutoAnswer = sandbox.stub();

      const timer = createAutoAnswerTimer({
        countdownSeconds: 3,
        onCountdownTick,
        onAutoAnswer,
      });

      timer.start();

      assert.isTrue(onCountdownTick.calledWith(3));

      await clock.tickAsync(1000);
      assert.isTrue(onCountdownTick.calledWith(2));

      await clock.tickAsync(1000);
      assert.isTrue(onCountdownTick.calledWith(1));
    });

    it('calls onAutoAnswer after countdown completes', async () => {
      const onCountdownTick = sandbox.stub();
      const onAutoAnswer = sandbox.stub();

      const timer = createAutoAnswerTimer({
        countdownSeconds: 3,
        onCountdownTick,
        onAutoAnswer,
      });

      timer.start();

      assert.isFalse(onAutoAnswer.called);

      await clock.tickAsync(3000);

      assert.isTrue(onAutoAnswer.calledOnce);
    });

    it('does not call onAutoAnswer if timer is stopped before countdown completes', async () => {
      const onCountdownTick = sandbox.stub();
      const onAutoAnswer = sandbox.stub();

      const timer = createAutoAnswerTimer({
        countdownSeconds: 3,
        onCountdownTick,
        onAutoAnswer,
      });

      timer.start();

      await clock.tickAsync(1500);
      timer.stop();

      await clock.tickAsync(3000);

      assert.isFalse(onAutoAnswer.called);
    });

    it('resets countdown when started again after being stopped', async () => {
      const onCountdownTick = sandbox.stub();
      const onAutoAnswer = sandbox.stub();

      const timer = createAutoAnswerTimer({
        countdownSeconds: 3,
        onCountdownTick,
        onAutoAnswer,
      });

      timer.start();
      await clock.tickAsync(2000);
      timer.stop();

      onCountdownTick.resetHistory();

      timer.start();
      assert.isTrue(onCountdownTick.calledWith(3));
    });

    it('works with different countdown values', async () => {
      const onCountdownTick = sandbox.stub();
      const onAutoAnswer = sandbox.stub();

      const timer = createAutoAnswerTimer({
        countdownSeconds: 5,
        onCountdownTick,
        onAutoAnswer,
      });

      timer.start();

      await clock.tickAsync(5000);

      assert.isTrue(onAutoAnswer.calledOnce);
      assert.equal(onCountdownTick.callCount, 5);
    });

    it('handles countdown of 1 second', async () => {
      const onCountdownTick = sandbox.stub();
      const onAutoAnswer = sandbox.stub();

      const timer = createAutoAnswerTimer({
        countdownSeconds: 1,
        onCountdownTick,
        onAutoAnswer,
      });

      timer.start();
      assert.isTrue(onCountdownTick.calledWith(1));

      await clock.tickAsync(1000);

      assert.isTrue(onAutoAnswer.calledOnce);
    });
  });
});
