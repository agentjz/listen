import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playListeningAudio, restartListeningAudio, seekListeningAudio, toggleListeningAudio } from '../miniprogram/services/audioPlayer';
import { ListeningAudio } from '../miniprogram/types/domain';

interface MockAudioContext {
  src: string;
  playbackRate: number;
  currentTime: number;
  duration: number;
  play(): void;
  pause(): void;
  seek(position: number): void;
  stop(): void;
  destroy(): void;
  onPlay(callback: () => void): void;
  onPause(callback: () => void): void;
  onTimeUpdate(callback: () => void): void;
  onEnded(callback: () => void): void;
  onError(callback: (error: { errMsg: string }) => void): void;
}

function createAudio(id: string): ListeningAudio {
  return {
    id,
    materialId: 'material-1',
    sourceKind: 'upload',
    format: 'mp3',
    cloudFileId: `local-assets/example/${id}.mp3`,
    createdAt: 1,
    updatedAt: 1
  };
}

function createMockContext(events: string[], options: { duration?: number; firePlayImmediately?: boolean } = {}): MockAudioContext {
  let onTimeUpdateCallback: (() => void) | null = null;

  const context: MockAudioContext & { emitTimeUpdate: () => void } = {
    src: '',
    playbackRate: 0,
    currentTime: 0,
    duration: options.duration ?? 0,
    play() {
      events.push(`play:${this.currentTime}`);
    },
    pause() {
      events.push('pause');
    },
    seek(position: number) {
      this.currentTime = position;
      events.push(`seek:${position}`);
    },
    stop() {
      events.push('stop');
    },
    destroy() {
      events.push('destroy');
    },
    onPlay(callback: () => void) {
      if (options.firePlayImmediately) {
        callback();
      }
    },
    onPause() {},
    onTimeUpdate(callback: () => void) {
      onTimeUpdateCallback = callback;
    },
    onEnded() {},
    onError() {},
    emitTimeUpdate() {
      onTimeUpdateCallback?.();
    }
  };

  return context;
}

function installAudioContext(context: MockAudioContext): void {
  Object.assign(globalThis, {
    wx: {
      createInnerAudioContext() {
        return context;
      }
    } as unknown as typeof wx
  });
}

test('playListeningAudio sets source and starts playback', () => {
  const events: string[] = [];
  const context = createMockContext(events, { firePlayImmediately: true });
  installAudioContext(context);

  const debugMessages: string[] = [];
  const result = playListeningAudio(createAudio('audio-1'), {
    onDebug(message) {
      debugMessages.push(message);
    }
  });

  assert.equal(context.src, 'local-assets/example/audio-1.mp3');
  assert.equal(context.playbackRate, 1);
  assert.deepEqual(events, ['play:0']);
  assert.equal(result.src, 'local-assets/example/audio-1.mp3');
  assert.equal(result.format, 'mp3');
  assert.equal(debugMessages.includes('player.event=play'), true);
});

test('toggleListeningAudio pauses and resumes the active audio', () => {
  const events: string[] = [];
  installAudioContext(createMockContext(events));
  const audio = createAudio('audio-toggle');

  assert.equal(toggleListeningAudio(audio).state, 'playing');
  assert.equal(toggleListeningAudio(audio).state, 'paused');
  assert.equal(toggleListeningAudio(audio).state, 'playing');
  assert.deepEqual(events, ['play:0', 'pause', 'play:0']);
});

test('restartListeningAudio plays the active audio from the beginning', () => {
  const firstEvents: string[] = [];
  const secondEvents: string[] = [];
  const firstContext = createMockContext(firstEvents, { duration: 100 });
  const secondContext = createMockContext(secondEvents, { duration: 100 });

  let createdCount = 0;
  Object.assign(globalThis, {
    wx: {
      createInnerAudioContext() {
        createdCount += 1;
        return createdCount === 1 ? firstContext : secondContext;
      }
    } as unknown as typeof wx
  });

  const audio = createAudio('audio-restart');
  playListeningAudio(audio);
  firstContext.currentTime = 35;
  const result = restartListeningAudio(audio);

  assert.equal(secondContext.currentTime, 0);
  assert.equal(result.state, 'playing');
  assert.deepEqual(firstEvents, ['play:0', 'stop', 'destroy']);
  assert.deepEqual(secondEvents, ['play:0']);
});

test('playListeningAudio emits progress on time update', () => {
  const events: string[] = [];
  const context = createMockContext(events, { duration: 120 }) as MockAudioContext & { emitTimeUpdate: () => void };
  installAudioContext(context);
  const progress: Array<{ currentTime: number; duration: number; progressPercent: number }> = [];

  playListeningAudio(createAudio('audio-progress'), {
    onTimeUpdate(state) {
      progress.push(state);
    }
  });
  context.currentTime = 30;
  context.emitTimeUpdate();

  assert.deepEqual(progress, [{ currentTime: 30, duration: 120, progressPercent: 25 }]);
});

test('seekListeningAudio jumps and keeps playback active', () => {
  const events: string[] = [];
  const context = createMockContext(events, { duration: 100 });
  installAudioContext(context);
  const audio = createAudio('audio-seek');

  playListeningAudio(audio);
  const result = seekListeningAudio(audio, 45);

  assert.equal(context.currentTime, 45);
  assert.equal(result.state, 'playing');
  assert.deepEqual(events, ['play:0', 'seek:45', 'play:45']);
});
