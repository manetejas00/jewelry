# Documentation index

This is the entry point for project documentation. Current guides, architecture notes, module references, and audit reports are organized here. Some project and operational documents remain at the repository root.

## Start here

- [Environment setup](ENV_SETUP.md)
- [Deployment guide](DEPLOYMENT_GUIDE.md)
- [Production readiness](PRODUCTION_READINESS.md)
- [Rollback and recovery](ROLLBACK.md)
- [Current production blockers](PRODUCTION_BLOCKERS.md)
- [Development guidelines](DEVELOPMENT_GUIDELINES.md)
- [Audit collection](audit/)

## Operations, delivery, and source control

- [Deployment](DEPLOYMENT.md)
- [Deployment guide](DEPLOYMENT_GUIDE.md)
- [Deployment history](DEPLOYMENT_HISTORY.md)
- [Automatic deployment](AUTO_DEPLOYMENT.md)
- [CI/CD setup](CI_CD_SETUP.md)
- [Hostinger setup](hostinger-setup.md)
- [Environment setup](ENV_SETUP.md)
- [Git workflow](GIT_WORKFLOW.md)
- [Rollback and recovery](ROLLBACK.md)
- [Production readiness](PRODUCTION_READINESS.md)
- [Production blockers](PRODUCTION_BLOCKERS.md)
- [Live deployment verification](LIVE_DEPLOYMENT_VERIFICATION.md)

## Catalogue, products, and merchandising

- [Catalogue architecture audit](catalogue-audit.md)
- [Catalogue database architecture](catalogue-database-architecture.md)
- [Catalogue implementation report](catalogue-implementation-report.md)
- [100-product collection](products-100.md)
- [Material classification](material-classification.md)
- [Product reviews](PRODUCT-REVIEWS.md)
- [Customer accounts](customer-accounts.md)
- [AI catalogue copy](AI_CATALOGUE_COPY.md)
- [AI product recommendations](ai-product-recommendations.md)
- [Gold and silver pricing](GOLD_SILVER_PRICING.md)
- [Pricing margins](pricing-margins.md)
- [Coin and bullion module](COIN_MODULE.md)

## Imports and data management

- [Daily import guide](import-guide.md)
- [Product-import audit](product-import-audit.md)
- [Product-import migration](product-import-migration.md)
- [Product-import templates](product-import-templates.md)
- [Import validation rules](import-validation-rules.md)
- [Catalogue import testing](catalogue-import-testing.md)
- [Coin imports](coin-imports.md)
- [Database changes](DATABASE_CHANGES.md)
- [Data migration and schema evolution](DATA_MIGRATION.md)
- [Database restructuring](DATABASE_RESTRUCTURING.md)

## Images and assets

- [Asset inventory](ASSET_INVENTORY.md)
- [Product assets](product-assets.md)
- [Product image manifest](product-image-manifest.md)
- [Product image system](PRODUCT_IMAGE_SYSTEM.md)
- [Product image structure](PRODUCT_IMAGE_STRUCTURE.md)
- [Product image generation](product-image-generation.md)
- [Coin assets](coin-assets.md)
- [Automatic thumbnails](automatic-thumbnails.md)
- [Image zoom](image-zoom.md)
- [Watermark cleanup](IMAGE_WATERMARK_CLEANUP.md)
- [Live asset repair](live-asset-repair.md)

## Storefront, admin, and feature implementations

- [Admin panel audit](admin-panel-audit.md)
- [Admin panel updates](admin-panel-updates.md)
- [Admin routing and sidebar](ADMIN_ROUTING_AND_SIDEBAR_IMPLEMENTATION.md)
- [Common PLP and PDP](COMMON_PLP_PDP_IMPLEMENTATION.md)
- [Hero carousel](HERO_CAROUSEL_IMPLEMENTATION.md)
- [Popup overflow audit](POPUP_OVERFLOW_AUDIT.md)
- [Showcase offer cleanup](SHOWCASE_OFFER_POST_CLEANUP.md)
- [Coins module audit](COINS_MODULE_AUDIT.md)
- [AI chatbot setup](AI_CHATBOT_SETUP.md)

## Platform architecture and API

- [REST API documentation](API_DOCUMENTATION.md)
- [Development guidelines](DEVELOPMENT_GUIDELINES.md)
- [Data migration and schema evolution](DATA_MIGRATION.md)
- [Database restructuring](DATABASE_RESTRUCTURING.md)

## Chicken Curry Kurta module

- [Module architecture and implementation](CHICKEN_CURRY_KURTAS_MODULE.md)
- [Collection implementation](CHICKEN_CURRY_KURTA_IMPLEMENTATION.md)
- [Catalogue specification](CHICKEN_CURRY_KURTA_CATALOG.md)
- [Independent module plan](IMPLEMENTATION_PLAN.md)
- [Colour variants](KURTA_COLOUR_VARIANT_IMPLEMENTATION.md)
- [Size and variant management](SIZE_AND_VARIANT_MANAGEMENT.md)
- [Implementation test report](IMPLEMENTATION_TEST_REPORT.md)

## Audits, verification, and reports

- [Project audit](PROJECT_AUDIT.md)
- [Project architecture audit](project-audit.md)
- [Full website audit](FULL_WEBSITE_AUDIT.md)
- [Initial audit and change summary](audit.md)
- [Security audit](SECURITY_AUDIT.md)
- [Test results](test-results.md)
- [Testing report](TESTING_REPORT.md)
- [Live audit report](LIVE_AUDIT_REPORT.md)
- [Live functional testing](LIVE_FUNCTIONAL_TESTING.md)
- [Live performance report](LIVE_PERFORMANCE_REPORT.md)
- [Live security report](LIVE_SECURITY_REPORT.md)
- [Live SEO report](LIVE_SEO_REPORT.md)
- [CYO removal report](CYO_REMOVAL_REPORT.md)

Historical reports describe the state and date in their own headings; do not treat an older passing report as proof of the current deployment.

## Structured collections

- [Source-audit series](audit/README.md) — numbered codebase, security, performance, SEO, testing, readiness, and roadmap reports.
- [SEO page briefs](seo/pages/README.md) — page-by-page metadata, canonical, structured-data, and indexing guidance.

## Navigation rules

- Use this index for discovery and link directly to the underlying document for the authoritative detail.
- Keep new operational documents in `docs/` and add them to the most specific section above.
- Keep numbered source audits in `docs/audit/` and SEO page briefs in `docs/seo/pages/`.
- Some operational and generated references still point to root-level project files.
- Prefer descriptive kebab-case filenames for new files; retain existing filenames when a move would break published or operational references.
