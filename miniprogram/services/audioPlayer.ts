import { ListeningAudio } from '../types/domain';

export interface AudioPlayerHooks {
  onDebug?: (message: string) => void;
  onError?: (message: string) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (state: AudioProgressState) => void;
}

export interface PlayListeningAudioResult {
  src: string;
  format: ListeningAudio['format'];
  state: AudioPlaybackState;
}

export type AudioPlaybackState = 'playing' | 'paused' | 'stopped';

export interface AudioProgressState {
  currentTime: number;
  duration: number;
  progressPercent: number;
}

let activeAudioContext: WechatMiniprogram.InnerAudioContext | null = null;
let activeAudioId = '';
let activePlaybackState: AudioPlaybackState = 'stopped';

export function toggleListeningAudio(audio: ListeningAudio, hooks: AudioPlayerHooks = {}): PlayListeningAudioResult {
  if (activeAudioContext && activeAudioId === audio.id && activePlaybackState === 'playing') {
    activeAudioContext.pause();
    activePlaybackState = 'paused';
    debug('player.command=pause', hooks);
    hooks.onPause?.();
    return {
      src: audio.cloudFileId,
      format: audio.format,
      state: activePlaybackState
    };
  }

  if (activeAudioContext && activeAudioId === audio.id && activePlaybackState === 'paused') {
    activeAudioContext.play();
    activePlaybackState = 'playing';
    debug('player.command=resume', hooks);
    hooks.onPlay?.();
    return {
      src: audio.cloudFileId,
      format: audio.format,
      state: activePlaybackState
    };
  }

  return playListeningAudio(audio, hooks);
}

export function playListeningAudio(audio: ListeningAudio, hooks: AudioPlayerHooks = {}): PlayListeningAudioResult {
  stopListeningAudio(hooks);

  const context = wx.createInnerAudioContext();
  activeAudioContext = context;
  activeAudioId = audio.id;
  activePlaybackState = 'playing';
  context.src = audio.cloudFileId;
  context.playbackRate = 1;

  debug(`audio.id=${audio.id}`, hooks);
  debug(`audio.src=${audio.cloudFileId}`, hooks);
  debug(`audio.format=${audio.format}`, hooks);

  context.onPlay(() => {
    activePlaybackState = 'playing';
    debug('player.event=play', hooks);
    hooks.onPlay?.();
  });

  context.onPause(() => {
    activePlaybackState = 'paused';
    debug('player.event=pause', hooks);
    hooks.onPause?.();
  });

  context.onTimeUpdate(() => {
    hooks.onTimeUpdate?.(readProgressState(context));
  });

  context.onEnded(() => {
    activePlaybackState = 'stopped';
    debug('player.event=ended', hooks);
    hooks.onEnded?.();
  });

  context.onError((error) => {
    activePlaybackState = 'stopped';
    const message = error.errMsg || 'unknown audio error';
    console.error('[audioPlayer]', message);
    hooks.onDebug?.(`player.error=${message}`);
    hooks.onError?.(message);
  });

  context.play();
  debug('player.command=play', hooks);

  return {
    src: audio.cloudFileId,
    format: audio.format,
    state: activePlaybackState
  };
}

export function restartListeningAudio(audio: ListeningAudio, hooks: AudioPlayerHooks = {}): PlayListeningAudioResult {
  stopListeningAudio(hooks);
  const result = playListeningAudio(audio, hooks);
  debug('player.command=restart', hooks);
  return result;
}

export function stopListeningAudio(hooks: AudioPlayerHooks = {}): void {
  if (!activeAudioContext) {
    activeAudioId = '';
    activePlaybackState = 'stopped';
    return;
  }

  activeAudioContext.stop();
  activeAudioContext.destroy();
  activeAudioContext = null;
  activeAudioId = '';
  activePlaybackState = 'stopped';
  debug('player.command=stop', hooks);
}

export function seekListeningAudio(audio: ListeningAudio, positionSeconds: number, hooks: AudioPlayerHooks = {}): PlayListeningAudioResult {
  if (!activeAudioContext || activeAudioId !== audio.id) {
    const result = playListeningAudio(audio, hooks);
    activeAudioContext?.seek(Math.max(0, positionSeconds));
    debug(`player.command=seek position=${positionSeconds}`, hooks);
    return result;
  }

  activeAudioContext.seek(Math.max(0, positionSeconds));
  activeAudioContext.play();
  activePlaybackState = 'playing';
  debug(`player.command=seek position=${positionSeconds}`, hooks);
  hooks.onPlay?.();

  return {
    src: audio.cloudFileId,
    format: audio.format,
    state: activePlaybackState
  };
}

function readProgressState(context: WechatMiniprogram.InnerAudioContext): AudioProgressState {
  const currentTime = Number.isFinite(context.currentTime) ? Math.max(0, context.currentTime) : 0;
  const duration = Number.isFinite(context.duration) ? Math.max(0, context.duration) : 0;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100))) : 0;
  return { currentTime, duration, progressPercent };
}

function debug(message: string, hooks: AudioPlayerHooks): void {
  console.info('[audioPlayer]', message);
  hooks.onDebug?.(message);
}
