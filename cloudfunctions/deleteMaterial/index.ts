import { DeleteMaterialRequest, DeleteMaterialResponse } from '../../miniprogram/types/api';
import { Material, SourceLibrary } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';
import { isPublicLibraryKind } from '../_shared/libraries';

export async function main(event: DeleteMaterialRequest): Promise<ReturnType<typeof ok<DeleteMaterialResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.materialId) {
      return fail('INVALID_REQUEST', '材料不能为空');
    }

    const db = getDatabase();
    const openid = getOpenid();
    const material = (await db.collection<Material>(COLLECTIONS.materials).where({ id: event.materialId, ownerOpenid: openid }).get()).data[0];
    if (!material) {
      return fail('NOT_FOUND', '材料不存在');
    }

    const library = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: material.libraryId }).get()).data[0];
    if (isPublicLibraryKind(library?.kind ?? 'general')) {
      return fail('FORBIDDEN', '公共资源不能删除');
    }

    const audios = await db.collection(COLLECTIONS.listeningAudios).where({ materialId: event.materialId }).get();

    await db.collection(COLLECTIONS.materials).where({ id: event.materialId, ownerOpenid: openid }).update({ data: { status: 'archived', updatedAt: Date.now() } });

    return ok({
      materialId: event.materialId,
      deletedAudioCount: audios.data.length
    });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
