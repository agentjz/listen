import { DeleteLibraryRequest, DeleteLibraryResponse } from '../../miniprogram/types/api';
import { Material, SourceLibrary } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';
import { UNFILED_LIBRARY_ID, UNFILED_LIBRARY_NAME, UNFILED_LIBRARY_SORT_ORDER } from '../_shared/libraries';

export async function main(event: DeleteLibraryRequest): Promise<ReturnType<typeof ok<DeleteLibraryResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.libraryId) {
      return fail('INVALID_REQUEST', '分类不能为空');
    }

    const db = getDatabase();
    const openid = getOpenid();
    const now = Date.now();
    const library = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: event.libraryId, ownerOpenid: openid }).get()).data[0];
    if (!library) {
      return fail('NOT_FOUND', '分类不存在');
    }

    if (library.id === UNFILED_LIBRARY_ID) {
      return fail('FORBIDDEN', '未归类材料不能删除');
    }

    if (library.kind !== 'user') {
      return fail('FORBIDDEN', '系统分类不能删除');
    }

    const materials = await db.collection<Material>(COLLECTIONS.materials).where({
      libraryId: event.libraryId,
      ownerOpenid: openid,
      status: 'ready'
    }).get();

    await ensureUnfiledLibrary(db, openid, now);

    if (materials.data.length > 0) {
      await db.collection<Material>(COLLECTIONS.materials).where({ libraryId: event.libraryId, ownerOpenid: openid, status: 'ready' }).update({
        data: {
          libraryId: UNFILED_LIBRARY_ID,
          updatedAt: now
        }
      });
    }

    await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: event.libraryId, ownerOpenid: openid }).remove();

    return ok({
      libraryId: event.libraryId,
      movedMaterialCount: materials.data.length
    });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}

async function ensureUnfiledLibrary(
  db: ReturnType<typeof getDatabase>,
  openid: string,
  now: number
): Promise<void> {
  const existing = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: UNFILED_LIBRARY_ID, ownerOpenid: openid }).get()).data[0];
  if (existing) {
    return;
  }

  await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).add({
    data: {
      id: UNFILED_LIBRARY_ID,
      name: UNFILED_LIBRARY_NAME,
      kind: 'user',
      ownerOpenid: openid,
      description: '新建材料和删除分类后的材料会保存在这里',
      sortOrder: UNFILED_LIBRARY_SORT_ORDER,
      createdAt: now,
      updatedAt: now
    }
  });
}
