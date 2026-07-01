import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clearLocalRepository,
  loadLocalSnapshot,
  saveLocalMaterial
} from '../../miniprogram/services/localRepository';
import { chooseAndReplaceMaterialAudio } from '../../miniprogram/services/upload';

const storage = new Map<string, unknown>();

Object.assign(globalThis, {
  wx: {
    getStorageSync<T>(key: string): T {
      return storage.get(key) as T;
    },
    setStorageSync<T>(key: string, data: T): void {
      storage.set(key, data);
    },
    removeStorageSync(key: string): void {
      storage.delete(key);
    },
    getFileSystemManager() {
      return {
        saveFile(options: {
          tempFilePath: string;
          success?: (result: { savedFilePath: string }) => void;
          fail?: (error: { errMsg: string }) => void;
        }): void {
          options.success?.({ savedFilePath: `saved://${options.tempFilePath}` });
        }
      };
    }
  } as typeof wx
});

test('local upload saves selected audio and binds it to the material', async () => {
  clearLocalRepository();
  const saved = saveLocalMaterial({
    title: 'Audio import',
    content: 'Audio import content.',
    now: Date.UTC(2026, 6, 1)
  });

  const result = await chooseAndReplaceMaterialAudio({
    mode: 'local',
    openid: 'local-user',
    materialId: saved.material.id,
    filePath: 'wxfile://audio.mp3',
    fileName: 'audio.mp3'
  });
  const snapshot = loadLocalSnapshot();
  const material = snapshot.materials.find((candidate) => candidate.id === saved.material.id);
  const audios = snapshot.listeningAudios.filter((audio) => audio.materialId === saved.material.id);

  assert.equal(result.listeningAudio.cloudFileId, 'saved://wxfile://audio.mp3');
  assert.equal(material?.audioCount, 1);
  assert.equal(audios.length, 1);
  assert.equal(audios[0]?.format, 'mp3');
});
