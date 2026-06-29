export const UNFILED_LIBRARY_ID = 'unfiled-library';
export const UNFILED_LIBRARY_NAME = '未归类材料';
export const UNFILED_LIBRARY_SORT_ORDER = 999999;
export const PUBLIC_LIBRARY_ID = 'public-library';
export const PUBLIC_LIBRARY_NAME = '公共资源';
export const PUBLIC_LIBRARY_SORT_ORDER = 100;

export function isPublicLibraryKind(kind: string): boolean {
  return kind !== 'user';
}
