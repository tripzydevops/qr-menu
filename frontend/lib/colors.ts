/**
 * Resolves a readable accent color based on the brand color and dark mode state.
 * If the brand color is too dark for dark mode or too light for light mode,
 * it falls back to a readable default (gold for dark mode, dark red for light mode).
 */
export function getReadableAccentColor(brandColor: string | null | undefined, isDark: boolean): string {
  const defaultColor = isDark ? '#DFBA73' : '#5C1D24';
  if (!brandColor) return defaultColor;

  try {
    // Parse hex color
    const hex = brandColor.replace('#', '');
    if (hex.length !== 6) return defaultColor;

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate relative luminance or standard brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    if (isDark) {
      // If brightness is too low (dark color), it will have poor contrast on a dark background.
      if (brightness < 130) {
        return '#DFBA73'; // Fall back to high-contrast premium gold
      }
    } else {
      // If brightness is too high (light color), it will have poor contrast on a light background.
      if (brightness > 200) {
        return '#5C1D24'; // Fall back to readable dark red
      }
    }

    return brandColor;
  } catch (e) {
    return defaultColor;
  }
}

/**
 * Returns a readable text color (white or dark) for a button background color.
 */
export function getContrastTextColor(backgroundColor: string): string {
  try {
    const hex = backgroundColor.replace('#', '');
    if (hex.length !== 6) return '#FFFFFF';

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? '#0A0B0E' : '#FFFFFF';
  } catch (e) {
    return '#FFFFFF';
  }
}
