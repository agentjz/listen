import { MoveMaterialRequest, MoveMaterialResponse } from '../../miniprogram/types/api';
import { Material, SourceLibrary } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';
import { isPublicLibraryKind } from '../_shared/libraries';

export async function main(event: MoveMaterialRequest): Promise<ReturnType<typeof ok<MoveMaterialResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.materialId || !event.libraryId) {
      return fail('INVALID_REQUEST', '材料和分类不能为空');
    }

    const db = getDatabase();
    const openid = getOpenid();
    const now = Date.now();
    const material = (await db.collection<Material>(COLLECTIONS.materials).where({ id: event.materialId, ownerOpenid: openid, status: 'ready' }).get()).data[0];
    if (!material) {
      return fail('NOT_FOUND', '材料不存在');
    }

    const sourceLibrary = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: material.libraryId }).get()).data[0];
    if (isPublicLibraryKind(sourceLibrary?.kind ?? 'general')) {
      return fail('FORBIDDEN', '公共资源不能移动');
    }

    const targetLibrary = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: event.libraryId }).get()).data[0];
    if (!targetLibrary || (targetLibrary.kind === 'user' && targetLibrary.ownerOpenid !== openid)) {
      return fail('NOT_FOUND', '目标分类不存在');
    }

    if (isPublicLibraryKind(targetLibrary.kind)) {
      return fail('FORBIDDEN', '不能移动到公共资源');
    }

    const updated: Material = {
      ...material,
      libraryId: event.libraryId,
      sortOrder: now,
      updatedAt: now
    };

    await db.collection<Material>(COLLECTIONS.materials).where({ id: event.materialId, ownerOpenid: openid }).update({
      data: {
        libraryId: updated.libraryId,
        sortOrder: updated.sortOrder,
        updatedAt: updated.updatedAt
      }
    });

    return ok({ material: updated });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
