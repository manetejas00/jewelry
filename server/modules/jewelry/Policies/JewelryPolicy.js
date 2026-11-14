export class JewelryPolicy {
  static canView(staff) {
    return Boolean(staff && ['owner', 'manager', 'viewer'].includes(staff.role));
  }

  static canCreate(staff) {
    return Boolean(staff && ['owner', 'manager'].includes(staff.role));
  }

  static canUpdate(staff) {
    return Boolean(staff && ['owner', 'manager'].includes(staff.role));
  }

  static canDelete(staff) {
    return Boolean(staff && ['owner', 'manager'].includes(staff.role));
  }

  static canImport(staff) {
    return Boolean(staff && ['owner', 'manager'].includes(staff.role));
  }

  static canExport(staff) {
    return Boolean(staff && ['owner', 'manager', 'viewer'].includes(staff.role));
  }
}
