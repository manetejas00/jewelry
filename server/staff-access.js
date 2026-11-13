import {validationError} from './errors.js';
import bcrypt from 'bcryptjs';
import {now} from './db.js';

const roles = ['owner', 'manager', 'viewer'];
const normalEmail = value => String(value || '').trim().toLowerCase();
const passwordValid = value => typeof value === 'string' && value.length >= 12 && Buffer.byteLength(value, 'utf8') <= 72;

export function staffIsActive(row) {
  return Boolean(row) && !row.disabled_at;
}

export async function createStaff(k, input) {
  const email = normalEmail(input?.email);
  const role = String(input?.role || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw validationError('Enter a valid email address.');
  if (!roles.includes(role)) throw validationError('Choose a role of owner, manager, or viewer.');
  if (!passwordValid(input?.password)) throw validationError('Choose a password of at least 12 characters, up to 72 UTF-8 bytes.');
  const password_hash = await bcrypt.hash(input.password, 12);
  return k.transaction(async t => {
    if (await t('staff').where({email}).first()) throw validationError('A staff account with this email already exists.');
    let id;
    try { [id] = await t('staff').insert({email, password_hash, role}); }
    catch (e) { if (e.code === 'ER_DUP_ENTRY' || String(e.code || '').startsWith('SQLITE_CONSTRAINT')) throw validationError('A staff account with this email already exists.'); throw e; }
    return {id, email, role, disabled_at: null};
  });
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
