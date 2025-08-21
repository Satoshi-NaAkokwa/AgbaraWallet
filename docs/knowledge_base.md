# Agbara Project Knowledge Base

Purpose

- Establish conventions and minimal specifications required to bootstrap Agbara locally.
- Define development infrastructure, health checks, contract tests, and acceptance endpoints.

Repository conventions

- Primary repo: AgbaraWallet.
- Documentation: docs/ directory.
- API specifications: openapi/ directory.
- Development environment: docker-compose.dev.yml at repo root.
- Scripts: scripts/ directory.

Core specifications

- Manifest JSON Schema at docs/manifest.schema.json.
- OpenAPI stubs:
  - openapi/identity.yaml listening on http://localhost:7000.
  - openapi/wallet.yaml listening on http://localhost:7001.

Development infrastructure

- Docker Compose file docker-compose.dev.yml must include:
  - Postgres (5432)
  - MinIO (9000, 9001)
  - Synapse-compatible endpoint on 8008
  - Ganache (8545)
  - Acceptance endpoints on 7000–7004:
    - 7000 Identity
    - 7001 Wallet
    - 7002 Media
    - 7003 Mapping
    - 7004 Messaging

Health checks

- Postgres: pg_isready.
- MinIO: GET /minio/health/ready on port 9000.
- Synapse: GET /\_matrix/client/versions on port 8008.
- Ganache: JSON-RPC eth_blockNumber on port 8545.

Contract tests

- JSON Schema: validate docs/manifest.schema.json.
- OpenAPI lint: openapi/identity.yaml and openapi/wallet.yaml.

Acceptance tests

- Each service on ports 7000–7004 must respond 200 with JSON { "status": "ok" } on GET /health.

Artifacts and logs

- Use environment variables:
  - WORKSPACE: ~/workspace/agbara
  - ARTIFACTS: ${WORKSPACE}/artifacts
  - LOGS: ${WORKSPACE}/logs
- Final bootstrap report: ${ARTIFACTS}/bootstrap-report.json

Decision logic

- If all health, contract, and acceptance tests pass: prepare PRs in AgbaraWallet for specs and sample agents.
- If any fail: collate failures and open issues with logs and report details.
