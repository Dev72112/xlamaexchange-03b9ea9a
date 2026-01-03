/**
 * Staggered animation helper for consistent list animations across the app.
 * Use with items that need sequential fade-in effects.
 */

/** Default stagger delay in milliseconds between items */
export const STAGGER_DELAY_MS = 50;

/** Maximum delay to prevent very long waits on large lists */
export const MAX_STAGGER_DELAY_MS = 500;

/**
 * Get inline style object for staggered animation delay
 * @param index - The index of the item in the list
 * @param delayMs - Delay between each item (default: 50ms)
 * @returns CSSProperties object with animationDelay
 */
export function getStaggerStyle(index: number, delayMs = STAGGER_DELAY_MS): React.CSSProperties {
  const delay = Math.min(index * delayMs, MAX_STAGGER_DELAY_MS);
  return { animationDelay: `${delay}ms` };
}

/**
 * Get className string for staggered list item
 * Includes the base animation class
 */
export const STAGGER_ITEM_CLASS = "list-item-stagger opacity-0";

/**
 * Combine stagger animation with content fade-in
 */
export function getStaggeredItemProps(index: number, delayMs = STAGGER_DELAY_MS) {
  return {
    className: STAGGER_ITEM_CLASS,
    style: getStaggerStyle(index, delayMs),
  };
}
