import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('adminRoutes defines dedicated routes for all 15 sidebar menu items', () => {
  const mainJsx = fs.readFileSync('src/main.jsx', 'utf8');

  // Verify adminRoutes is present
  assert.match(mainJsx, /const adminRoutes\s*=\s*\[/, 'main.jsx must define adminRoutes');

  const expectedRoutes = [
    { label: 'Dashboard', path: '/admin/dashboard' },
    { label: 'Categories', path: '/admin/categories' },
    { label: 'Products', path: '/admin/products' },
    { label: 'Chicken Curry Kurtas', path: '/admin/chicken-curry-kurtas' },
    { label: 'Coins', path: '/admin/coins' },
    { label: 'Offers', path: '/admin/offers' },
    { label: 'Reviews', path: '/admin/reviews' },
    { label: 'Gold Rates', path: '/admin/gold-rates' },
    { label: 'Pricing Rules', path: '/admin/pricing-rules' },
    { label: 'Imports', path: '/admin/imports' },
    { label: 'Orders', path: '/admin/orders' },
    { label: 'Customers', path: '/admin/customers' },
    { label: 'Catalogue copy', path: '/admin/catalogue-copy' },
    { label: 'AI Chatbot', path: '/admin/ai-chatbot' },
    { label: 'Settings', path: '/admin/settings' }
  ];

  for (const { label, path } of expectedRoutes) {
    assert.ok(
      mainJsx.includes(`'${path}'`) || mainJsx.includes(`"${path}"`),
      `adminRoutes must contain path ${path} for ${label}`
    );
    assert.ok(
      mainJsx.includes(`'${label}'`) || mainJsx.includes(`"${label}"`),
      `adminRoutes must contain label ${label}`
    );
  }
});

test('matchAdminRoute resolves exact, nested, and default admin routes correctly', () => {
  const mainJsx = fs.readFileSync('src/main.jsx', 'utf8');

  // Verify matchAdminRoute function is defined
  assert.match(mainJsx, /function matchAdminRoute\s*\(/, 'main.jsx must define matchAdminRoute function');

  // Extract matchAdminRoute and adminRoutes to test them directly in node
  const startRoutes = mainJsx.indexOf('const adminRoutes');
  const endMatch = mainJsx.indexOf('function adminStartTab');
  assert.ok(startRoutes > 0 && endMatch > startRoutes, 'Must extract routes code cleanly');

  // Create mock icons so we can evaluate the module logic
  const mockContext = `
    const LayoutDashboard = 'IconDashboard', Layers = 'IconLayers', Gem = 'IconGem',
          Shirt = 'IconShirt', CoinsIcon = 'IconCoins', Tag = 'IconTag',
          Star = 'IconStar', ChartNoAxesCombined = 'IconRates', SlidersHorizontal = 'IconRules',
          Upload = 'IconUpload', Package = 'IconPackage', UserRound = 'IconUser',
          Sparkles = 'IconSparkles', MessageCircle = 'IconChat', Settings = 'IconSettings';
    ${mainJsx.slice(startRoutes, endMatch)}
    return { adminRoutes, matchAdminRoute };
  `;
  const fn = new Function(mockContext);
  const { adminRoutes, matchAdminRoute } = fn();

  assert.equal(adminRoutes.length, 15, 'There must be exactly 15 admin routes');

  // 1. Root /admin defaults to Dashboard
  assert.equal(matchAdminRoute('/admin').key, 'dashboard');
  assert.equal(matchAdminRoute('/admin/').key, 'dashboard');

  // 2. Exact matches
  assert.equal(matchAdminRoute('/admin/dashboard').key, 'dashboard');
  assert.equal(matchAdminRoute('/admin/categories').key, 'categories');
  assert.equal(matchAdminRoute('/admin/products').key, 'products');
  assert.equal(matchAdminRoute('/admin/chicken-curry-kurtas').key, 'kurtas');
  assert.equal(matchAdminRoute('/admin/coins').key, 'coins');
  assert.equal(matchAdminRoute('/admin/offers').key, 'offers');
  assert.equal(matchAdminRoute('/admin/reviews').key, 'reviews');
  assert.equal(matchAdminRoute('/admin/gold-rates').key, 'gold-rates');
  assert.equal(matchAdminRoute('/admin/pricing-rules').key, 'pricing-rules');
  assert.equal(matchAdminRoute('/admin/imports').key, 'imports');
  assert.equal(matchAdminRoute('/admin/orders').key, 'orders');
  assert.equal(matchAdminRoute('/admin/customers').key, 'customers');
  assert.equal(matchAdminRoute('/admin/catalogue-copy').key, 'catalogue-copy');
  assert.equal(matchAdminRoute('/admin/ai-chatbot').key, 'ai-chatbot');
  assert.equal(matchAdminRoute('/admin/settings').key, 'settings');

  // 3. Nested routes keep parent menu active
  assert.equal(matchAdminRoute('/admin/products/123/edit').key, 'products');
  assert.equal(matchAdminRoute('/admin/orders/ORD-98765').key, 'orders');
  assert.equal(matchAdminRoute('/admin/chicken-curry-kurtas/cck-001').key, 'kurtas');
  assert.equal(matchAdminRoute('/admin/categories/5/subcategories').key, 'categories');

  // 4. Aliases
  assert.equal(matchAdminRoute('/admin/kurtas').key, 'kurtas');
  assert.equal(matchAdminRoute('/admin/kurtas/cck-001').key, 'kurtas');
  assert.equal(matchAdminRoute('/admin/chatbot').key, 'ai-chatbot');
});

test('admin sidebar renders React Router Link with dynamic active class and mobile responsiveness', () => {
  const mainJsx = fs.readFileSync('src/main.jsx', 'utf8');

  // Nav uses Link with to={item.path} and active class
  assert.match(mainJsx, /adminRoutes\.map\(\s*item\s*=>/, 'Must map adminRoutes in sidebar nav');
  assert.match(mainJsx, /<Link\s+key=\{item\.key\}\s+to=\{item\.path\}\s+className=\{isActive\s*\?\s*'active'\s*:\s*''\}/, 'Sidebar items must be Links with active class');

  // Dynamic breadcrumb in header
  assert.match(mainJsx, /VEYORA \/ STUDIO \/ \{activeRoute\.label\.toUpperCase\(\)\}/, 'Header must display dynamic breadcrumb');

  // Mobile sidebar drawer support
  assert.match(mainJsx, /mobileSidebarOpen/, 'Must support mobileSidebarOpen state');
  assert.match(mainJsx, /admin-mobile-toggle/, 'Must include admin-mobile-toggle button');
  assert.match(mainJsx, /admin-mobile-close/, 'Must include admin-mobile-close button');
  assert.match(mainJsx, /admin-sidebar-backdrop/, 'Must include admin-sidebar-backdrop');
});

test('admin sidebar CSS defines dark green styling, gold accent border, and mobile drawer transitions', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');

  // Dark green background and gold active indicator
  assert.match(css, /\.admin-sidebar nav a\.active,\s*\.admin-sidebar nav button\.active/, 'Must style active links and buttons');
  assert.match(css, /border-left:\s*3px solid #c2ac76/, 'Must use #c2ac76 gold accent border for active state');
  assert.match(css, /color:\s*#e7d9b7/, 'Must use light gold text for active item');

  // Mobile drawer styling
  assert.match(css, /\.admin-sidebar\.open/, 'Must define .admin-sidebar.open class');
  assert.match(css, /transform:\s*translateX\(-100%\)/, 'Mobile sidebar must slide from left');
  assert.match(css, /transform:\s*translateX\(0\)/, 'Mobile open sidebar must slide into view');
});
