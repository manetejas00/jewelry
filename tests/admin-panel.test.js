import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('admin panel has overflow scroll, touch momentum, and sleek scrollbars', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');

  // Verify .admin-panel has overflow auto and touch scrolling
  assert.ok(css.includes('.admin-panel{') || css.includes('.admin-panel {'), 'Must have .admin-panel definition');
  assert.match(css, /\.admin-panel[^{]*\{[^}]*overflow:\s*auto/, '.admin-panel must have overflow: auto for smooth scrolling');
  assert.match(css, /\.admin-panel[^{]*\{[^}]*-webkit-overflow-scrolling:\s*touch/, '.admin-panel must have -webkit-overflow-scrolling: touch');

  // Verify scrollbar styling for .admin-panel and .table-wrap
  assert.match(css, /\.admin-panel::-webkit-scrollbar/, 'Custom scrollbar must be configured for admin panel');
  assert.match(css, /\.table-wrap::-webkit-scrollbar/, 'Custom scrollbar must be configured for table-wrap');

  // Verify .admin-sidebar has overflow-y scrolling
  assert.match(css, /\.admin-sidebar[^{]*\{[^}]*overflow-y:\s*auto/, '.admin-sidebar must have overflow-y: auto to scroll on shorter viewports');

  // Verify .admin-panel-scroll or .admin-panel.scrollable utility class
  assert.match(css, /\.admin-panel-scroll|\.admin-panel\.scrollable/, 'Must support scrollable admin panel class');
});

test('multi-angle role badges avoid collision with storefront .hero class', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');
  const mainJsx = fs.readFileSync('src/main.jsx', 'utf8');

  // Verify CSS defines namespaced .role-badge--hero modifier
  assert.match(css, /\.role-badge--hero/, 'CSS must provide .role-badge--hero namespaced class');
  assert.match(css, /\.role-badge--front/, 'CSS must provide .role-badge--front class');
  assert.match(css, /\.role-badge--model/, 'CSS must provide .role-badge--model class');

  // Verify .role-badge does not stretch vertically
  assert.match(css, /\.role-badge[^{]*\{[^}]*white-space:\s*nowrap/, '.role-badge must have white-space: nowrap');

  // Verify main.jsx uses namespaced role-badge-- class instead of bare role name
  assert.ok(mainJsx.includes("role-badge role-badge--'"), 'main.jsx must use role-badge-- prefix to avoid matching global .hero rule');
  assert.ok(!mainJsx.includes("role-badge '+r.key"), 'main.jsx must not output bare role class like "role-badge hero"');

  // Verify angle preview wrap and slot card styles
  assert.match(css, /\.angle-slot-preview-wrap/, 'CSS must provide preview wrap');
  assert.match(css, /\.angle-slot-card/, 'CSS must style angle slot cards');
});
