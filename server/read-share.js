const flights = new WeakMap();
const remembered = new WeakSet();

// Collapse identical reads that overlap on the same database connection.
// The result is not kept after the read finishes, so the next call sees fresh stock and prices.
export function shareRead(db, key, run) {
  let bucket = flights.get(db);
  if (!bucket) {
    bucket = new Map();
    flights.set(db, bucket);
  }
  const existing = bucket.get(key);
  if (existing) return existing;
  const promise = Promise.resolve().then(run).finally(() => {
    if (bucket.get(key) === promise) bucket.delete(key);
  });
  bucket.set(key, promise);
  return promise;
}

// Knex builds a fresh schema builder on every `db.schema` access, so the cache
// has to live outside that object. Tables do not appear after startup migrations.
export function rememberSchema(db) {
  if (!db || remembered.has(db)) return;
  const descriptor = Object.getOwnPropertyDescriptor(db, 'schema')
    || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(db), 'schema');
  if (!descriptor?.get) return;
  remembered.add(db);
  const tables = new Map();
  const columns = new Map();
  Object.defineProperty(db, 'schema', {
    configurable: true,
    get() {
      const schema = descriptor.get.call(db);
      const hasTable = schema.hasTable.bind(schema);
      const hasColumn = schema.hasColumn.bind(schema);
      schema.hasTable = async table => {
        if (tables.has(table)) return tables.get(table);
        const has = await hasTable(table);
        tables.set(table, has);
        return has;
      };
      schema.hasColumn = async (table, column) => {
        const key = `${table}.${column}`;
        if (columns.has(key)) return columns.get(key);
        const has = await hasColumn(table, column);
        columns.set(key, has);
        return has;
      };
      return schema;
    }
  });
}
