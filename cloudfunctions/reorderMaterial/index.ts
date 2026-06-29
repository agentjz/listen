import { ReorderMaterialRequest, ReorderMaterialResponse } from '../../miniprogram/types/api';
import { Material, SourceLibrary } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';
import { isPublicLibraryKind } from '../_shared/libraries';

export async function main(event: ReorderMaterialRequest): Promise<ReturnType<typeof ok<ReorderMaterialResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.materialId || (event.direction !== 'up' && event.direction !== 'down')) {
      return fail('INVALID_REQUEST', '材料和排序方向不能为空');
    }

    const db = getDatabase();
    const openid = getOpenid();
    const current = (await db.collection<Material>(COLLECTIONS.materials).where({ id: event.materialId, ownerOpenid: openid, status: 'ready' }).get()).data[0];
    if (!current) {
      return fail('NOT_FOUND', '材料不存在');
    }

    const library = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: current.libraryId }).get()).data[0];
    if (isPublicLibraryKind(library?.kind ?? 'general')) {
      return fail('FORBIDDEN', '公共资源不能排序');
    }

    const siblingsResult = await db.collection<Material>(COLLECTIONS.materials).where({
      libraryId: current.libraryId,
      ownerOpenid: openid,
      status: 'ready'
    }).get();
    const siblings = [...siblingsResult.data].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.createdAt - right.createdAt;
    });
    const currentIndex = siblings.findIndex((material) => material.id === event.materialId);
    const targetIndex = event.direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return ok({ materials: siblings });
    }

    const target = siblings[targetIndex];
    const now = Date.now();
    const currentSortOrder = current.sortOrder;
    current.sortOrder = target.sortOrder;
    current.updatedAt = now;
    target.sortOrder = currentSortOrder;
    target.updatedAt = now;

    await Promise.all([
      db.collection<Material>(COLLECTIONS.materials).where({ id: current.id }).update({ data: { sortOrder: current.sortOrder, updatedAt: now } }),
      db.collection<Material>(COLLECTIONS.materials).where({ id: target.id }).update({ data: { sortOrder: target.sortOrder, updatedAt: now } })
    ]);

    const materials = siblings.sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.createdAt - right.createdAt;
    });

    return ok({ materials });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
