export const INK = '#10141F';
const WHITE = '#FFFFFF';

export const BAND_COLORS = [
  { name: 'Yellow', hex: '#F5C518' },
  { name: 'Orange', hex: '#F0802A' },
  { name: 'Red', hex: '#D92D20' },
  { name: 'Pink', hex: '#E84C9A' },
  { name: 'Purple', hex: '#7A3FD1' },
  { name: 'Blue', hex: '#1F5FD6' },
  { name: 'Green', hex: '#147F45' },
  { name: 'Grey', hex: '#7A838F' },
  { name: 'Black', hex: '#17181C' },
];

function luminance(hex) {
  const channel = (start) => {
    const v = parseInt(hex.slice(start, start + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The text colour that reads best on a band colour. */
export function onColor(hex) {
  return contrast(hex, INK) >= contrast(hex, WHITE) ? INK : WHITE;
}
