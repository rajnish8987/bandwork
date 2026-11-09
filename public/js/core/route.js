// Reads the address after the #. Anyone can send a link, so nothing here may throw.

const decode = (part) => {
  if (!part) return part;
  try {
    return decodeURIComponent(part);
  } catch {
    return part; // not valid encoding: kept as plain text, which matches nothing in the app
  }
};

export function parseRoute(hash) {
  const [name = 'today', arg, extra] = hash.replace(/^#\/?/, '').split('/');
  return { name: name || 'today', arg: decode(arg), extra: decode(extra) };
}
