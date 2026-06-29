import { SaveListeningAudioRequest, SaveListeningAudioResponse } from '../../miniprogram/types/api';
import { ListeningAudio, Material, SourceLibrary } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { createId } from '../_shared/id';
import { fail, ok, toApiError } from '../_shared/response';
import { isPublicLibraryKind } from '../_shared/libraries';

export async function main(event: SaveListeningAudioRequest): Promise<ReturnType<typeof ok<SaveListeningAudioResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.materialId || !event.cloudFileId) {
      return fail('INVALID_REQUEST', '材料和音频文件不能为空');
    }

    const db = getDatabase();
    const openid = getOpenid();
    const material = (await db.collection<Material>(COLLECTIONS.materials).where({ id: event.materialId, ownerOpenid: openid, status: 'ready' }).get()).data[0];
    if (!material) {
      return fail('NOT_FOUND', '材料不存在');
    }

    const library = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: material.libraryId }).get()).data[0];
    if (isPublicLibraryKind(library?.kind ?? 'general')) {
      return fail('FORBIDDEN', '公共资源不能替换音频');
    }

    const now = Date.now();
    const listeningAudio: ListeningAudio = {
      id: createId('audio', now),
      materialId: event.materialId,
      sourceKind: 'upload',
      format: event.format,
      cloudFileId: event.cloudFileId,
      durationMs: event.durationMs,
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
