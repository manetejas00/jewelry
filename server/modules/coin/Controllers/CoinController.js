import { CoinService } from '../Services/CoinService.js';
import { CoinPolicy } from '../Policies/CoinPolicy.js';

export class CoinController {
  constructor(db) {
    this.service = new CoinService(db);
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
    if (!detail) return res.status(404).json({ error: 'Coin not found' });
    res.json(detail);
  }

  async listCategories(req, res) {
    const cats = await this.service.getCategories();
    res.json(cats);
  }

  async listAdmin(req, res) {
    if (!CoinPolicy.canView(req.session.staff)) {
      return res.status(403).json({ error: 'Staff access required' });
    }
    const list = await this.service.getAdminList({
      metal: req.query.metal,
      status: req.query.status
    });
    res.json(list);
  }

  async getAdminDetail(req, res) {
    if (!CoinPolicy.canView(req.session.staff)) {
      return res.status(403).json({ error: 'Staff access required' });
    }
    const item = await this.service.getBySku(req.params.sku);
    if (!item) return res.status(404).json({ error: 'Coin not found' });
    res.json(item);
  }

  async createAdmin(req, res) {
    if (!CoinPolicy.canCreate(req.session.staff)) {
      return res.status(403).json({ error: 'Staff write access required' });
    }
    const created = await this.service.createCoin(req.body, req.session.staff.id);
    res.status(201).json({ ok: true, coin: created });
  }

  async updateAdmin(req, res) {
    if (!CoinPolicy.canUpdate(req.session.staff)) {
      return res.status(403).json({ error: 'Staff write access required' });
    }
    const updated = await this.service.updateCoin(req.params.sku, req.body, req.session.staff.id);
    res.json({ ok: true, coin: updated });
  }

  async deleteAdmin(req, res) {
    if (!CoinPolicy.canDelete(req.session.staff)) {
      return res.status(403).json({ error: 'Staff write access required' });
    }
    const success = await this.service.deleteCoin(req.params.sku);
    if (!success) return res.status(404).json({ error: 'Coin not found' });
    res.json({ ok: true });
  }

  async exportAdmin(req, res) {
    if (!CoinPolicy.canExport(req.session.staff)) {
      return res.status(403).json({ error: 'Staff access required' });
    }
    const csv = await this.service.exportCsv();
    const d = new Date().toISOString().slice(0, 10);
    res.type('text/csv').attachment(`coins-${d}.csv`).send(csv);
  }
}
