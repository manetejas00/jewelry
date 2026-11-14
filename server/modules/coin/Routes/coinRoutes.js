import { Router } from 'express';
import { CoinController } from '../Controllers/CoinController.js';

export function createCoinRouter(db, { auth, route }) {
  const router = Router();
  const controller = new CoinController(db);

  // Public Storefront Routes
  router.get('/coin', route((req, res) => controller.listStorefront(req, res)));
  router.get('/coins', route((req, res) => controller.listStorefront(req, res))); // Alias for backward compatibility
  router.get('/coin/categories', route((req, res) => controller.listCategories(req, res)));
  router.get('/coin/:slug', route((req, res) => controller.getStorefrontDetail(req, res)));

  // Admin Routes
  router.get('/admin/coin', auth(), route((req, res) => controller.listAdmin(req, res)));
  router.get('/admin/coins', auth(), route((req, res) => controller.listAdmin(req, res))); // Alias
  router.post('/admin/coin', auth(['owner', 'manager']), route((req, res) => controller.createAdmin(req, res)));
  router.post('/admin/coins', auth(['owner', 'manager']), route((req, res) => controller.createAdmin(req, res))); // Alias
  router.get('/admin/coin/export', auth(), route((req, res) => controller.exportAdmin(req, res)));
  router.get('/admin/coins/export', auth(), route((req, res) => controller.exportAdmin(req, res))); // Alias
  router.get('/admin/coin/:sku', auth(), route((req, res) => controller.getAdminDetail(req, res)));
  router.patch('/admin/coin/:sku', auth(['owner', 'manager']), route((req, res) => controller.updateAdmin(req, res)));
  router.patch('/admin/coins/:sku', auth(['owner', 'manager']), route((req, res) => controller.updateAdmin(req, res))); // Alias
  router.delete('/admin/coin/:sku', auth(['owner', 'manager']), route((req, res) => controller.deleteAdmin(req, res)));
  router.delete('/admin/coins/:sku', auth(['owner', 'manager']), route((req, res) => controller.deleteAdmin(req, res))); // Alias

  return router;
}
