import { RenameLibraryRequest, RenameLibraryResponse } from '../../miniprogram/types/api';
import { SourceLibrary } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';
import { UNFILED_LIBRARY_ID } from '../_shared/libraries';

export async function main(event: RenameLibraryRequest): Promise<ReturnType<typeof ok<RenameLibraryResponse>> | ReturnType<typeof fail>> {
  try {
    const name = event.name?.trim();
    if (!event.libraryId || !name) {
      return fail('INVALID_REQUEST', '分类和名称不能为空');
    }

    if (event.libraryId === UNFILED_LIBRARY_ID) {
      return fail('FORBIDDEN', '未归类材料不能重命名');
    }

    const db = getDatabase();
    const openid = getOpenid();
    const existing = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: event.libraryId, ownerOpenid: openid }).get()).data[0];
    if (!existing) {
      return fail('NOT_FOUND', '分类不存在');
    }

    if (existing.kind !== 'user') {
      return fail('FORBIDDEN', '系统分类不能重命名');
    }

    const library: SourceLibrary = {
      ...existing,
      name,
      updatedAt: Date.now()
    };

    await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: event.libraryId, ownerOpenid: openid }).update({
      data: {
        name: library.name,
        updatedAt: library.updatedAt
      }
    });

    return ok({ library });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
