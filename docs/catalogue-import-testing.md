# Catalogue Import Testing & QA Verification Suite

## 1. Test Coverage Overview
Automated regression tests verify the integrity of all catalogue import channels in the Node.js test runner:
- `tests/coin-imports.test.js`: Bullion coin CSV ingestion, metal linking, and validation.
- `tests/product-imports.test.js`: Fine jewellery CSV ingestion, material links, and pricing calculations.
- `tests/kurta-imports.test.js`: Apparel multi-variant imports, colour swatches, and size enumerations.
- `tests/catalogue-ui.test.js`: Frontend rendering of imported catalogue entities and thumbnails.

---

## 2. Automated Test Matrix

| Test Scenario | Input Data | Expected Behavior | Verification Target |
|---|---|---|---|
| **Clean Jewellery Import** | Valid CSV with 10 rows | 10 created, 0 errors, transaction committed | DB count matches, materials linked |
| **Duplicate SKU Ingestion** | Same SKU with new price | 0 created, 1 updated (idempotent upsert) | Price updated, no duplicate rows |
| **Invalid Coin Purity** | Purity = "14K" on Bullion | Row rejected with validation error | Batch logs warning, valid rows pass |
| **Invalid Kurta Size** | Size = "Extra Large" | Rejected: must match XS–XXXL | Row rejected, clear error message |
| **Malformed CSV UTF-8** | Unquoted commas in description | Handled gracefully without crash | Row parsed or error flagged |
| **Zero/Negative Stock** | Stock = "-5" | Clamped to 0 or rejected | Negative stock prevented |
| **Thumbnail Whitelist Check** | 20 Coin asset paths | All 20 match `media.js` thumb pattern | Thumbnail ratio < 0.1 |

---

## 3. Running Test Commands
```bash
# Execute entire test suite
npm test

# Run specific import tests
node --test tests/coin-imports.test.js
node --test tests/catalogue-ui.test.js
```
All 222 suite tests pass without regressions.
