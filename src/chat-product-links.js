// Resolve recommendations against the published catalogue, including older chat replies.
export function chatProductLinks(message, products = [], coins = []) {
  if (typeof message !== 'string') return [];
  const text = message.toLowerCase();
  const links = new Map();
  for (const [items, coin] of [[products, false], [coins, true]]) {
    for (const item of items) {
      const path = coin ? item.sku && `/coins/product/${encodeURIComponent(item.sku)}` : item.slug && `/products/${encodeURIComponent(item.slug)}`;
      if (!path || !item.name) continue;
      const positions = [item.name, item.sku].filter(Boolean).map(value => {
        const token = value.toLowerCase();
        let index = text.indexOf(token);
        while (index !== -1) {
          const before = text[index - 1] || '';
          const after = text[index + token.length] || '';
          if (!/[a-z0-9-]/i.test(before) && !/[a-z0-9-]/i.test(after)) return index;
          index = text.indexOf(token, index + 1);
        }
        return -1;
      }).filter(index => index >= 0);
      if (!positions.length) continue;
      const position = Math.min(...positions);
      const prior = links.get(path);
      if (!prior || position < prior.position) links.set(path, {name: item.name, href: path, position});
    }
  }
  return [...links.values()].sort((a, b) => a.position - b.position).map(({position, ...link}) => link);
}
