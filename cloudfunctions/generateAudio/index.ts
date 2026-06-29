import { GenerateAudioRequest, GenerateAudioResponse } from '../../miniprogram/types/api';
import { ListeningAudio, Material, SourceLibrary } from '../../miniprogram/types/domain';
import { TencentTtsProvider } from '../_shared/tts/tencent';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { createId } from '../_shared/id';
import { fail, ok, toApiError } from '../_shared/response';
import { isPublicLibraryKind } from '../_shared/libraries';

export async function main(event: GenerateAudioRequest): Promise<ReturnType<typeof ok<GenerateAudioResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.materialId || !event.text?.trim()) {
      return fail('INVALID_REQUEST', '材料和文本不能为空');
    }

    const db = getDatabase();
    const openid = getOpenid();
    const material = (await db.collection<Material>(COLLECTIONS.materials).where({ id: event.materialId, ownerOpenid: openid, status: 'ready' }).get()).data[0];
    if (!material) {
      return fail('NOT_FOUND', '材料不存在');
    }

    const library = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: material.libraryId }).get()).data[0];
    if (isPublicLibraryKind(library?.kind ?? 'general')) {
      return fail('FORBIDDEN', '公共资源不能生成音频');
    }

    const provider = new TencentTtsProvider();
    const generated = await provider.synthesize({ text: event.text.trim() });
    const now = Date.now();
    const listeningAudio: ListeningAudio = {
      id: createId('audio', now),
      materialId: event.materialId,
      sourceKind: 'tts',
      format: generated.format,
      cloudFileId: generated.cloudFileId,
      durationMs: generated.durationMs,
      createdAt: now,
      updatedAt: now
    };

    await db.collection<ListeningAudio>(COLLECTIONS.listeningAudios).where({ materialId: event.materialId }).remove();
    await db.collection<ListeningAudio>(COLLECTIONS.listeningAudios).add({ data: listeningAudio });
    await db.collection(COLLECTIONS.materials).where({ id: event.materialId, ownerOpenid: openid }).update({ data: { audioCount: 1, updatedAt: now } });

    return ok({ listeningAudio });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
