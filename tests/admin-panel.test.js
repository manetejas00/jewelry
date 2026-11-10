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
