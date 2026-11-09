import('./server/index.js').catch((err) => {
  console.error('Fatal startup error in server/index.js:', err);
  process.exit(1);
});
