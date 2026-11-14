import { Router } from 'express';
import { JewelryController } from '../Controllers/JewelryController.js';

export function createJewelryRouter(db, { auth, route }) {
  const router = Router();
  const controller = new JewelryController(db);

  // Public Storefront Routes
  router.get('/jewelry', route((req, res) => controller.listStorefront(req, res)));
  router.get('/jewelry/categories', route((req, res) => controller.listCategories(req, res)));
  router.get('/jewelry/:slug', route((req, res) => controller.getStorefrontDetail(req, res)));

  // Admin Routes
  router.get('/admin/jewelry', auth(), route((req, res) => controller.listAdmin(req, res)));
  router.post('/admin/jewelry', auth(['owner', 'manager']), route((req, res) => controller.createAdmin(req, res)));
  router.get('/admin/jewelry/export', auth(), route((req, res) => controller.exportAdmin(req, res)));
  router.get('/admin/jewelry/:sku', auth(), route((req, res) => controller.getAdminDetail(req, res)));
  router.patch('/admin/jewelry/:sku', auth(['owner', 'manager']), route((req, res) => controller.updateAdmin(req, res)));
  router.delete('/admin/jewelry/:sku', auth(['owner', 'manager']), route((req, res) => controller.deleteAdmin(req, res)));

  return router;
}
