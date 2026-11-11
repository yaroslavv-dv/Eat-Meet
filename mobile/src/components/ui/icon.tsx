import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';

/** Semantic icon names mapped to SF Symbols (iOS) and Material Symbols (Android/web). */
const ICONS = {
  search: { ios: 'magnifyingglass', android: 'search' },
  filter: { ios: 'line.3.horizontal.decrease', android: 'tune' },
  close: { ios: 'xmark', android: 'close' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  forkKnife: { ios: 'fork.knife', android: 'restaurant' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  clock: { ios: 'clock', android: 'schedule' },
  people: { ios: 'person.2.fill', android: 'groups' },
  group: { ios: 'person.3.fill', android: 'groups' },
  person: { ios: 'person.crop.circle', android: 'account_circle' },
  personAdd: { ios: 'person.badge.plus', android: 'person_add' },
  location: { ios: 'mappin.and.ellipse', android: 'location_on' },
  leaf: { ios: 'leaf.fill', android: 'eco' },
  cart: { ios: 'cart', android: 'shopping_cart' },
  star: { ios: 'star.fill', android: 'star' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  circle: { ios: 'circle', android: 'radio_button_unchecked' },
  flag: { ios: 'flag', android: 'flag' },
  tea: { ios: 'cup.and.saucer.fill', android: 'no_drinks' },
  wine: { ios: 'wineglass', android: 'wine_bar' },
  plus: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  camera: { ios: 'camera', android: 'photo_camera' },
  photo: { ios: 'photo.on.rectangle', android: 'image' },
  addPhoto: { ios: 'photo.badge.plus', android: 'add_photo_alternate' },
  trash: { ios: 'trash', android: 'delete' },
  edit: { ios: 'pencil', android: 'edit' },
  info: { ios: 'info.circle', android: 'info' },
  lock: { ios: 'lock.fill', android: 'lock' },
  euro: { ios: 'eurosign.circle', android: 'euro' },
  swap: { ios: 'arrow.left.arrow.right', android: 'swap_horiz' },
  reset: { ios: 'arrow.counterclockwise', android: 'restart_alt' },
  shield: { ios: 'checkmark.shield', android: 'health_and_safety' },
  receipt: { ios: 'doc.text', android: 'receipt_long' },
  checklist: { ios: 'checklist', android: 'checklist' },
  recycle: { ios: 'arrow.3.trianglepath', android: 'compost' },
  heart: { ios: 'heart.fill', android: 'favorite' },
  chat: { ios: 'bubble.left.and.bubble.right.fill', android: 'chat' },
  home: { ios: 'house.fill', android: 'home' },
  trendDown: { ios: 'chart.line.downtrend.xyaxis', android: 'trending_down' },
  chart: { ios: 'chart.bar.fill', android: 'bar_chart' },
  bulb: { ios: 'lightbulb', android: 'lightbulb' },
  cancel: { ios: 'xmark.circle.fill', android: 'cancel' },
  block: { ios: 'nosign', android: 'block' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward' },
  settings: { ios: 'gearshape', android: 'settings' },
  timer: { ios: 'timer', android: 'timer' },
  flexible: { ios: 'circle.lefthalf.filled', android: 'swap_horiz' },
  sparkleFree: { ios: 'hand.thumbsup.fill', android: 'check_circle' },
  hand: { ios: 'hand.raised.fill', android: 'block' },
  rules: { ios: 'list.bullet', android: 'rule' },
  savings: { ios: 'banknote', android: 'savings' },
  dashboard: { ios: 'square.grid.2x2.fill', android: 'dashboard' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 20, color = colors.ink, weight = 'medium', style }: IconProps) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android }}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={[{ width: size, height: size }, style]}
    />
  );
}
