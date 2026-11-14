export const feedKeys=['GOLD_MAX_AGE_HOURS','INVENTORY_MODE','GOLD_FEED_URL','PRODUCT_FEED_URL','SUPPLIER_OVERWRITE_FIELDS','FEED_STATUS','GOLD_FEED_ENABLED','PRODUCT_FEED_ENABLED','SILVER_RATE_PER_GRAM','SILVER_RATE_UPDATED_AT'];
export async function loadFeedSettings(k){for(const setting of await k('settings').whereIn('key',feedKeys))process.env[setting.key]=setting.value;}
