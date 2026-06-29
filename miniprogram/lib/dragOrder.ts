export function moveItemPreview<T>(items: T[], sourceIndex: number, targetIndex: number): T[] {
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex >= items.length || targetIndex >= items.length) {
    return items;
  }

  const movedItems = [...items];
  const [dragging] = movedItems.splice(sourceIndex, 1);
  movedItems.splice(targetIndex, 0, dragging);
  return movedItems;
}

export function getDragTargetIndex(input: {
  startY: number;
  currentY: number;
  itemHeight: number;
  sourceIndex: number;
  itemCount: number;
}): number {
  const offset = input.currentY - input.startY;
  const movedSlots = Math.round(offset / input.itemHeight);
  return Math.max(0, Math.min(input.itemCount - 1, input.sourceIndex + movedSlots));
}
