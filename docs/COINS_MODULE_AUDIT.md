# Coins Module Audit & Architecture Preservation Report

## Overview
The Coins module (`/coins`, `/coins/:category`, `/coins/product/:sku`) represents an independent bullion investment section within Veyora Jewels. This audit confirms that the module has been fully preserved while adopting the shared `CommonPLP` and `CommonPDP` components.

## Preserved Bullion Specifics
1. **Domain Attributes**:
   - `weight_g`: Gross weight in grams (e.g., 1g, 2g, 5g, 10g, 20g, 50g, 100g).
   - `purity`: Hallmark purity (999 Fine Silver, 24K 999 Fine Gold).
   - `metal`: Gold and Silver classifications.
   - `coin_type`: Mint round, Lakshmi Ganesh, Banyan Tree, Queen Victoria, etc.
   - `dimension`: Diameter and thickness specifications.
   - `packaging`: Certified tamper-evident blister packaging.
2. **Dynamic Live Metal Rates**:
   - Integrated with daily gold and silver rates via `/gold-rates` API.
   - Calculates bullion metal value + minting/making charge + merchant margin + GST.
3. **Dedicated Admin & Seeders**:
   - Preserved `/admin` coins tab and sample CSV imports (`samples/coins-example.csv`, `samples/gold-rates-example.csv`).
4. **Bullion Trust Banner**:
   - Displays 999 purity guarantee, certified weight tolerance, tamper-evident blister packaging, and buyback policy.
