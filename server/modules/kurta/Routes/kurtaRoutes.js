import { Router } from 'express';
import { KurtaController } from '../Controllers/KurtaController.js';

export function createKurtaRouter(db, { auth, route }) {
  const router = Router();
  const controller = new KurtaController(db);

  // Public Storefront Routes
  router.get('/kurta', route((req, res) => controller.listStorefront(req, res)));
  router.get('/kurtas', route((req, res) => controller.listStorefront(req, res))); // Alias for backward compatibility
  router.get('/kurta/categories', route((req, res) => controller.listCategories(req, res)));
  router.get('/kurta/:slug', route((req, res) => controller.getStorefrontDetail(req, res)));

  // Admin Routes
  router.get('/admin/kurta', auth(), route((req, res) => controller.listAdmin(req, res)));
  router.get('/admin/kurtas', auth(), route((req, res) => controller.listAdmin(req, res))); // Alias
  router.post('/admin/kurta', auth(['owner', 'manager']), route((req, res) => controller.createAdmin(req, res)));
  router.post('/admin/kurtas', auth(['owner', 'manager']), route((req, res) => controller.createAdmin(req, res))); // Alias
  router.get('/admin/kurta/export', auth(), route((req, res) => controller.exportAdmin(req, res)));
  router.get('/admin/kurtas/export', auth(), route((req, res) => controller.exportAdmin(req, res))); // Alias
  router.get('/admin/kurta/:code', auth(), route((req, res) => controller.getAdminDetail(req, res)));
  router.patch('/admin/kurta/:code', auth(['owner', 'manager']), route((req, res) => controller.updateAdmin(req, res)));
  router.patch('/admin/kurtas/:code', auth(['owner', 'manager']), route((req, res) => controller.updateAdmin(req, res))); // Alias
  router.delete('/admin/kurta/:code', auth(['owner', 'manager']), route((req, res) => controller.deleteAdmin(req, res)));
  router.delete('/admin/kurtas/:code', auth(['owner', 'manager']), route((req, res) => controller.deleteAdmin(req, res))); // Alias

  return router;
}
