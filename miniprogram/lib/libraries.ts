import { SourceLibrary } from '../types/domain';

export const ALL_RESOURCES_VIEW_ID = 'all-resources';
export const ALL_RESOURCES_VIEW_NAME = '全部资源';
export const UNFILED_LIBRARY_ID = 'unfiled-library';
export const UNFILED_LIBRARY_NAME = '未归类材料';
export const UNFILED_LIBRARY_SORT_ORDER = 999999;
export const PUBLIC_LIBRARY_ID = 'public-library';
export const PUBLIC_LIBRARY_NAME = '公共资源';
export const PUBLIC_LIBRARY_SORT_ORDER = 100;

export function isUnfiledLibrary(libraryId: string): boolean {
  return libraryId === UNFILED_LIBRARY_ID;
}

export function isUserLibrary(library: SourceLibrary | undefined): boolean {
  return library?.kind === 'user';
}

export function isPublicLibrary(library: SourceLibrary | undefined): boolean {
  return !!library && library.kind !== 'user';
}

export function sortLibrariesWithUnfiledLast<T extends SourceLibrary>(libraries: T[]): T[] {
  return [...libraries].sort((left, right) => {
    if (left.id === UNFILED_LIBRARY_ID) {
      return 1;
    }

    if (right.id === UNFILED_LIBRARY_ID) {
      return -1;
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt - right.createdAt;
  });
}
