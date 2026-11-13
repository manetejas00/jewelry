import {validationError} from './errors.js';
import {now} from './db.js';

export function staffIsActive(row) {
  return Boolean(row) && !row.disabled_at;
}

export async function setStaffAccess(k, actorId, staffId, disabled) {
  const staff = await k('staff').where({id: Number(staffId)}).first();
  if (!staff) throw validationError('Staff member not found', 404);
  if (disabled && Number(actorId) === Number(staff.id)) throw validationError('You cannot disable your own account');
  if (disabled && staff.role === 'owner') {
    const owners = await k('staff').where({role: 'owner'}).whereNull('disabled_at');
    if (owners.length < 2 && owners.some(row => Number(row.id) === Number(staff.id))) throw validationError('Keep at least one active owner');
  }
  await k('staff').where({id: staff.id}).update({disabled_at: disabled ? now() : null});
  return {id: staff.id, email: staff.email, role: staff.role, disabled: Boolean(disabled)};
}
