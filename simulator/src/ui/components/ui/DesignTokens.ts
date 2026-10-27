import * as colors from './tokens/colors';
import * as spacing from './tokens/spacing';
import * as typography from './tokens/typography';
import * as ui from './tokens/ui';

export const DesignTokens = {
  colors,
  spacing,
  sizing: spacing.sizing,
  typography,
  shadows: ui.shadows,
  animations: ui.animations,
  breakpoints: ui.breakpoints,
  zIndex: ui.zIndex,
  card: ui.card,
  modal: ui.modal,
  dropdown: ui.dropdown,
} as const;

export type ColorKey = keyof typeof colors.colors;
export type SpacingKey = keyof typeof spacing.spacing;
export type SizingKey = keyof typeof spacing.sizing;