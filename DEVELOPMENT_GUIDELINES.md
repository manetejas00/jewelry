# Development guidelines

Use PascalCase for React components and classes, camelCase for functions and local names, and UPPER_SNAKE_CASE for named constants. Name each module for the business capability it owns. Use the existing domain terminology for URLs, JSON fields, SKUs and database identifiers.

## Adding a module

1. Find the domain that owns the workflow and extend its existing route and service entry points.
2. Register new HTTP routes in the composition root before the API fallback. Check for overlapping methods, parameters and aliases before choosing the registration point.
3. Apply authentication and authorization at the HTTP boundary. Validate payloads, filters and pagination before passing them to services.
4. Put business decisions and transaction boundaries in the service. Keep query and row mapping details in an existing repository when the domain has one. Extract a repository when the queries form a coherent persistence boundary.
5. Use the existing API client and state provider from React. Reuse common catalogue and Studio components when their interaction matches.
6. Place dependency-free code in `shared/` only when both runtimes use it. Keep business logic, credentials and provider SDKs on the server.

## HTTP and persistence

Maintain current response shapes, status codes, media types and roles when editing existing endpoints. Use `validationError` for client-safe messages and let unexpected exceptions reach the global handler. Include request IDs in diagnostics and keep query strings out of request-failure logs. Keep order creation, inventory mutation and import publication atomic. Exercise retry and concurrency behavior with the same transaction boundaries used in production.

Create a new migration when schema work is required. Verify the migration on an empty database and an anonymized copy of an existing schema. Use separate SQLite or MySQL databases for tests. Keep staging and production credentials in the server environment and configure the merchant, feeds, mail and OTP services for each deployment.

## Verification

Run `npm test`, `npm run build`, and `npm run assets:check`. HTTP integration tests launch local listeners against a disposable SQLite database. Use an in-memory migrated Knex fixture for service tests. Add cases for role and CSRF boundaries, order ownership, idempotent retries or failed publication when those behaviors change. The repository currently uses Node tests and Vite; linting and formatting have no configured command.
