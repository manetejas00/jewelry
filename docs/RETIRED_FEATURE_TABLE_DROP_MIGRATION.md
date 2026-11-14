# Retired CYO and combo table drop migration

Migration `028_drop_retired_cyo_and_combo_tables.js` removes the retired Create Your Own and combo schemas from databases that still contain them.

It drops:

- `cyo_audit_logs`, `cyo_ai_usage`, `cyo_quotations`, `cyo_messages`, `cyo_conversations`, `cyo_design_images`, `cyo_design_versions`, and `cyo_designs`
- `combo_items` and `combos`

The migration is idempotent: on databases where earlier migrations already removed these tables, it completes without changing other data. It is not reversible; restore a database backup if those retired feature records are needed.
