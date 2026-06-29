import { SaveMaterialRequest, SaveMaterialResponse } from '../../miniprogram/types/api';
import { Material } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { createId } from '../_shared/id';
import { fail, ok, toApiError } from '../_shared/response';
import { UNFILED_LIBRARY_ID } from '../_shared/libraries';

export async function main(event: SaveMaterialRequest): Promise<ReturnType<typeof ok<SaveMaterialResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.content?.trim()) {
      return fail('INVALID_REQUEST', '英文内容不能为空');
    }

    const db = getDatabase();
    const openid = getOpenid();
    const now = Date.now();
    const materialId = createId('material', now);

    const material: Material = {
      id: materialId,
      libraryId: UNFILED_LIBRARY_ID,
      ownerOpenid: openid,
      title: event.title?.trim() || `Imported ${new Date(now).toISOString().slice(0, 10)}`,
      content: event.content.trim(),
      status: 'ready',
      audioCount: 0,
      sortOrder: now,
      createdAt: now,
      updatedAt: now
    };

    await db.collection<Material>(COLLECTIONS.materials).add({ data: material });

    return ok({ material });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
