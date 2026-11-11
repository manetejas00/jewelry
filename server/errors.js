export function validationError(message, status = 400) {
  return Object.assign(new Error(message), { status, expose: true });
}

export function errorResponse(err) {
  if (!err) return { status: 500, body: { error: 'The request could not be completed. Please try again.' } };
  if (err.type === 'entity.parse.failed') return { status: 400, body: { error: 'Request body must be valid JSON' } };
  if (err.type === 'entity.too.large') return { status: 413, body: { error: 'Request exceeds the allowed size' } };
  if (err.expose) return { status: err.status || 400, body: { error: err.message, ...(err.quote ? { quote: err.quote } : {}) } };

  const code = err.code || '';
  const msg = String(err.message || '');
  if (code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT_UNIQUE' || (code === 'SQLITE_CONSTRAINT' && msg.includes('UNIQUE'))) {
    return { status: 409, body: { error: 'A record with this identifier already exists.' } };
  }
  if (code === 'ER_NO_REFERENCED_ROW_2' || (code === 'SQLITE_CONSTRAINT' && msg.includes('FOREIGN KEY'))) {
    return { status: 400, body: { error: 'Referenced record was not found.' } };
  }

  return { status: 500, body: { error: 'The request could not be completed. Please try again.' } };
}
