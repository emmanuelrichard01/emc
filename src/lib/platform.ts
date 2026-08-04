/**
 * True on Apple platforms, where the command-palette shortcut is ⌘K rather
 * than Ctrl+K.
 *
 * The nav badge used to read "CMD+K" unconditionally, which is simply wrong
 * for the majority of visitors — and a keyboard hint that names the wrong key
 * is worse than no hint, because someone will try it and conclude the
 * shortcut is broken.
 */
const IS_APPLE_PLATFORM = (() => {
  if (typeof navigator === 'undefined') return false;

  // userAgentData is the non-deprecated source where it exists; navigator
  // .platform remains the only reliable signal in Safari and Firefox.
  const withData = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = withData.userAgentData?.platform || navigator.platform || navigator.userAgent;

  return /mac|iphone|ipad|ipod/i.test(platform);
})();

/** The modifier symbol to print in shortcut hints. */
export const MODIFIER_KEY = IS_APPLE_PLATFORM ? '⌘' : 'Ctrl';
