/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Palette (aligned to the provided UI reference)
// .color1 { #71dbd2 };
// .color2 { #eeffdb };
// .color3 { #ade4b5 };
// .color4 { #d0eaa3 };
// .color5 { #fff18c };
const palette = {
  // Tuned to match the provided mock (slightly greener primary and softer surfaces)
  primary: '#16C7A6',
  surface: '#EAF9E8',
  successSoft: '#BFEBC4',
  successSoft2: '#D6F1AE',
  highlight: '#FFF2A3',
  text: '#0B2B2A',
  textMuted: '#2F5D5A',
  track: '#0E4E4B',
  card: '#F7FFF3',
  tabBarBg: '#DDE8DE',
};

const tintColorLight = palette.primary;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: palette.text,
    background: palette.surface,
    tint: tintColorLight,
    icon: palette.textMuted,
    tabIconDefault: palette.textMuted,
    tabIconSelected: tintColorLight,
    palette,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    palette,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const AppFonts = {
  regular: 'Poppins_400Regular',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
  black: 'Poppins_900Black',
} as const;
