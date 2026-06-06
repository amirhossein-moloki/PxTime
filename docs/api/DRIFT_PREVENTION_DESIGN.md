# API DRIFT PREVENTION SYSTEM DESIGN

## 1. CONTRACT VALIDATION SYSTEM
### Rules
* **Code-to-Spec Coverage:** Every endpoint route defined in `src/routes/index.ts` and module-specific routers (e.g., `reservations.routes.ts`) must have a corresponding path and method entry in `src/docs/openapi.yaml`.
* **Spec-to-Code Implementation:** Every path defined in `openapi.yaml` must be implemented and active in the backend code.
* **DTO & Schema Alignment:** Request body and query parameters defined in Zod schemas (found in `*.validators.ts`) must match the `components/schemas` in `openapi.yaml` exactly in terms of field names, types, and required status.

## 2. CI PIPELINE CHECKS
The following steps will be integrated into `.github/workflows/ci.yml`:
1. **OpenAPI Linting:** Validate that `openapi.yaml` follows the 3.0.0 specification and internal style guides.
2. **Route Mismatch Detection:** A script will extract all routes from the Express application and compare them against the paths in `openapi.yaml`.
3. **Schema Validation:** Automated comparison between Zod schemas and OpenAPI components to ensure structural parity.
4. **Endpoint Existence Check:** Fail the build if an OpenAPI endpoint is missing from the code or vice versa.

## 3. AUTOMATED DRIFT DETECTION
### Detection Mechanism
* **Static Analysis:** Use a utility to crawl the `src/routes` directory and module-level routers to build a map of (Method, Path).
* **OpenAPI Parsing:** Parse `openapi.yaml` to extract its (Method, Path) map.
* **Comparison Engine:**
    * Flag **Undocumented Endpoints**: Found in code but not in spec.
    * Flag **Ghost Endpoints**: Found in spec but not in code.
    * Flag **Modified Routes**: Path parameters or base paths that have changed.

## 4. FAILURE POLICY
* **CRITICAL (Block PR):**
    * New undocumented endpoints.
    * Removed endpoints that are still in spec.
    * Changed HTTP methods for existing routes.
    * Path parameter mismatches.
* **MEDIUM (Warning/Block):**
    * DTO/Schema field mismatches (missing fields, changed types).
    * Missing response schemas.
* **MINOR (Allow):**
    * Description or summary updates.
    * Metadata changes.

## 5. CI/CD PIPELINE DIAGRAM
```text
[ Developer PR ]
       |
       v
[ CI: Install & Generate ] ----> [ Type Check & Lint ]
       |
       v
[ CI: API Drift Check ]
       |-- (1) Extract Routes from Express
       |-- (2) Parse openapi.yaml
       |-- (3) Compare Route Maps
       |-- (4) Validate Zod vs OpenAPI Schemas
       |
       |---- Fail if CRITICAL Drift detected
       |---- Warn if MEDIUM Drift detected
       v
[ CI: Run Tests (Jest) ]
       |
       v
[ Merge to Develop/Main ]
```

## 6. ENFORCEMENT & ROLLBACK STRATEGY
* **Enforcement:** The `API Drift Check` job is a mandatory status check for all PRs. Merging is blocked if any CRITICAL failures are found.
* **Rollback:** In case of emergency fixes that cause drift, the `x-api-contract-version` in `openapi.yaml` must be updated, and a "Drift Exception" must be documented in the PR, triggering an immediate follow-up task to sync the spec.
