# Fixed and percentage margins

Merchant Studio → Pricing Rules has a Margin type selector and a margin value. Owners preview old/new prices and confirm the rule before it goes live. Every publication creates a pricing-rule history record and an audit entry with the staff member and the margin settings.

- Fixed amount: add the entered INR amount per sellable piece, not per order.
- Percentage: a markup on the base subtotal. This is a percentage of base cost, not a gross-profit percentage of the final selling price.
- Gold-linked jewellery base: metal value + full making + stone + other approved charges.
- Metal-linked coin base: metal value + full minting/making charge.
- Fixed-price base: the merchant-entered selling price. The margin is added to that price; tax is not charged again on an already-final fixed price. Gold-rate changes still do not change the fixed base price.

Margin is calculated to paise using decimal arithmetic. For linked prices, applicable offers are then applied, followed by configured inclusive/exclusive tax treatment and final rounding. Making-charge discounts reduce making charges only, never the margin. Total-value discounts apply to the subtotal including margin. Fixed-price totals retain paise. The storefront and admin display paise when present.

For a ₹24,500 fixed-price piece, a ₹500 margin produces ₹25,000; a 10% margin produces ₹26,950, before any applicable total-price offer. A synthetic 5.000 g gold-linked piece at ₹6,000/g plus ₹2,000 making has a ₹32,000 base: a 10% margin makes ₹35,200 before tax or offers.

Migration `006_pricing_margins.js` adds margin type and decimal value with a zero default, preserving existing rule values. Margin is stored on the price breakdown in the order item snapshot. Existing orders retain their purchased totals when rules change. Checkout rechecks the latest price and requests acceptance of a new quote if a margin changed while an item was in the bag.

Saving a rule refreshes product details, collection cards, bag estimates and coin prices in that browser session. A same-origin browser notification refreshes other open tabs. Returning focus to a storefront tab also reloads the catalogue. Other devices receive the latest prices when their catalogue refreshes. The server remains authoritative at checkout.

The local browser test verified ₹24,500 → ₹25,000 (fixed ₹500) → ₹26,950 (10%) on an already-open product page, then restored the zero-margin baseline. Automated coverage includes both margin types, coins, offers, tax, decimal precision, invalid inputs, catalogue-to-checkout consistency and historical order totals.
