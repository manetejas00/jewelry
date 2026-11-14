import { JewelryService } from '../Services/JewelryService.js';
import { JewelryPolicy } from '../Policies/JewelryPolicy.js';
import { validationError } from '../../../errors.js';

export class JewelryController {
  constructor(db) {
    this.service = new JewelryService(db);
  }

  async listStorefront(req, res) {
    const list = await this.service.getPublishedCatalogue({
      category: req.query.category,
      code: req.query.offerCode
    });
    res.json(list);
  }

  async getStorefrontDetail(req, res) {
    const detail = await this.service.getPublishedBySlug(req.params.slug, {
      code: req.query.offerCode
    });
    if (!detail) return res.status(404).json({ error: 'Jewelry piece not found' });
    res.json(detail);
  }

  async listCategories(req, res) {
    const cats = await this.service.getCategories();
    res.json(cats);
  }

  async listAdmin(req, res) {
    if (!JewelryPolicy.canView(req.session.staff)) {
      return res.status(403).json({ error: 'Staff access required' });
    }
    const list = await this.service.getAdminList({
      category: req.query.category,
      status: req.query.status
    });
    res.json(list);
  }

  async getAdminDetail(req, res) {
    if (!JewelryPolicy.canView(req.session.staff)) {
      return res.status(403).json({ error: 'Staff access required' });
    }
    const item = await this.service.getBySku(req.params.sku);
    if (!item) return res.status(404).json({ error: 'Jewelry piece not found' });
    res.json(item);
  }

  async createAdmin(req, res) {
    if (!JewelryPolicy.canCreate(req.session.staff)) {
      return res.status(403).json({ error: 'Staff write access required' });
    }
    const created = await this.service.createJewelry(req.body, req.session.staff.id);
    res.status(201).json({ ok: true, jewelry: created });
  }

  async updateAdmin(req, res) {
    if (!JewelryPolicy.canUpdate(req.session.staff)) {
      return res.status(403).json({ error: 'Staff write access required' });
    }
    const updated = await this.service.updateJewelry(req.params.sku, req.body, req.session.staff.id);
    res.json({ ok: true, jewelry: updated });
  }

  async deleteAdmin(req, res) {
    if (!JewelryPolicy.canDelete(req.session.staff)) {
      return res.status(403).json({ error: 'Staff write access required' });
    }
    const success = await this.service.deleteJewelry(req.params.sku);
    if (!success) return res.status(404).json({ error: 'Jewelry piece not found' });
    res.json({ ok: true });
  }

  async exportAdmin(req, res) {
    if (!JewelryPolicy.canExport(req.session.staff)) {
      return res.status(403).json({ error: 'Staff access required' });
    }
    const csv = await this.service.exportCsv();
    const d = new Date().toISOString().slice(0, 10);
    res.type('text/csv').attachment(`jewelry-${d}.csv`).send(csv);
  }
}
