import { SyncDataResponse } from '../../miniprogram/types/api';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';
import { ListeningAudio, Material, SourceLibrary } from '../../miniprogram/types/domain';
import { UNFILED_LIBRARY_ID, UNFILED_LIBRARY_NAME, UNFILED_LIBRARY_SORT_ORDER } from '../_shared/libraries';

export async function main(): Promise<ReturnType<typeof ok<SyncDataResponse>> | ReturnType<typeof fail>> {
  try {
    const db = getDatabase();
    const openid = getOpenid();
    await ensureUnfiledLibrary(db, openid);
    const [libraries, userMaterials] = await Promise.all([
      db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).get(),
      db.collection<Material>(COLLECTIONS.materials).where({ ownerOpenid: openid }).get()
    ]);

    const visibleLibraries = libraries.data.filter((library) => library.kind !== 'user' || library.ownerOpenid === openid);
    const publicLibraryIds = visibleLibraries.filter((library) => library.kind !== 'user').map((library) => library.id);
    const publicMaterials = publicLibraryIds.length > 0
      ? (await db.collection<Material>(COLLECTIONS.materials).where({ libraryId: db.command.in(publicLibraryIds), status: 'ready' }).get()).data
      : [];
    const visibleMaterials = mergeMaterials(userMaterials.data, publicMaterials);
    const visibleMaterialIds = new Set(visibleMaterials.map((material) => material.id));
    const visibleAudios = visibleMaterialIds.size > 0
      ? (await db.collection<ListeningAudio>(COLLECTIONS.listeningAudios).where({ materialId: db.command.in([...visibleMaterialIds]) }).get()).data
      : [];

    return ok({
      serverTime: Date.now(),
      libraries: visibleLibraries,
      materials: visibleMaterials,
      listeningAudios: visibleAudios
    });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}

function mergeMaterials(userMaterials: Material[], publicMaterials: Material[]): Material[] {
  const byId = new Map<string, Material>();
  for (const material of userMaterials) {
    byId.set(material.id, material);
  }
  for (const material of publicMaterials) {
    byId.set(material.id, material);
  }
  return [...byId.values()];
}

async function ensureUnfiledLibrary(db: ReturnType<typeof getDatabase>, openid: string): Promise<void> {
  const existing = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: UNFILED_LIBRARY_ID, ownerOpenid: openid }).get()).data[0];
  if (existing) {
    return;
  }

  const now = Date.now();
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
