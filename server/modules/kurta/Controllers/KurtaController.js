import { KurtaService } from '../Services/KurtaService.js';
import { KurtaPolicy } from '../Policies/KurtaPolicy.js';

export class KurtaController {
  constructor(db) {
    this.service = new KurtaService(db);
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
      color: req.query.color,
      code: req.query.offerCode
    });
    if (!detail) return res.status(404).json({ error: 'Kurta not found' });
    res.json(detail);
  }

  async listCategories(req, res) {
    const cats = await this.service.getCategories();
    res.json(cats);
  }

  async listAdmin(req, res) {
    if (!KurtaPolicy.canView(req.session.staff)) {
      return res.status(403).json({ error: 'Staff access required' });
    }
    const list = await this.service.getAdminList({
      category: req.query.category,
      status: req.query.status
    });
    res.json(list);
  }

  async getAdminDetail(req, res) {
    if (!KurtaPolicy.canView(req.session.staff)) {
      return res.status(403).json({ error: 'Staff access required' });
    }
    const item = await this.service.getByCode(req.params.code);
    if (!item) return res.status(404).json({ error: 'Kurta not found' });
    res.json(item);
  }

  async createAdmin(req, res) {
    if (!KurtaPolicy.canCreate(req.session.staff)) {
      return res.status(403).json({ error: 'Staff write access required' });
    }
    const created = await this.service.createKurta(req.body, req.session.staff.id);
    res.status(201).json({ ok: true, kurta: created });
  }

  async updateAdmin(req, res) {
    if (!KurtaPolicy.canUpdate(req.session.staff)) {
      return res.status(403).json({ error: 'Staff write access required' });
    }
    const updated = await this.service.updateKurta(req.params.code, req.body, req.session.staff.id);
    res.json({ ok: true, kurta: updated });
  }

  async deleteAdmin(req, res) {
    if (!KurtaPolicy.canDelete(req.session.staff)) {
      return res.status(403).json({ error: 'Staff write access required' });
    }
    const success = await this.service.deleteKurta(req.params.code);
    if (!success) return res.status(404).json({ error: 'Kurta not found' });
    res.json({ ok: true });
  }

  async exportAdmin(req, res) {
    if (!KurtaPolicy.canExport(req.session.staff)) {
      return res.status(403).json({ error: 'Staff access required' });
    }
    const csv = await this.service.exportCsv();
    const d = new Date().toISOString().slice(0, 10);
    res.type('text/csv').attachment(`kurtas-${d}.csv`).send(csv);
  }
}
