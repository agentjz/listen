import { UpdateMaterialRequest, UpdateMaterialResponse } from '../../miniprogram/types/api';
import { Material, SourceLibrary } from '../../miniprogram/types/domain';
import { buildDefaultMaterialTitle } from '../../miniprogram/lib/materialTitle';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';
import { isPublicLibraryKind } from '../_shared/libraries';

export async function main(event: UpdateMaterialRequest): Promise<ReturnType<typeof ok<UpdateMaterialResponse>> | ReturnType<typeof fail>> {
  try {
    const content = event.content?.trim();
    if (!event.materialId || !content) {
      return fail('INVALID_REQUEST', '材料和英文内容不能为空');
    }

    const db = getDatabase();
    const openid = getOpenid();
    const existing = (await db.collection<Material>(COLLECTIONS.materials).where({ id: event.materialId, ownerOpenid: openid, status: 'ready' }).get()).data[0];
    if (!existing) {
      return fail('NOT_FOUND', '材料不存在');
    }

    const library = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: existing.libraryId }).get()).data[0];
    if (isPublicLibraryKind(library?.kind ?? 'general')) {
      return fail('FORBIDDEN', '公共资源不能编辑');
    }

    const now = Date.now();
    const material: Material = {
      ...existing,
      title: event.title?.trim() || buildDefaultMaterialTitle(content, now),
      content,
      updatedAt: now
    };

    await db.collection<Material>(COLLECTIONS.materials).where({ id: event.materialId, ownerOpenid: openid }).update({
      data: {
        title: material.title,
        content: material.content,
        updatedAt: material.updatedAt
      }
    });

    return ok({ material });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
