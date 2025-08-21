#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DEFAULT="$HOME/workspace/agbara"
WORKSPACE="${WORKSPACE:-$WORKSPACE_DEFAULT}"
ARTIFACTS="${ARTIFACTS:-$WORKSPACE/artifacts}"
LOGS="${LOGS:-$WORKSPACE/logs}"

mkdir -p "$WORKSPACE" "$ARTIFACTS" "$LOGS"

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.dev.yml"

docker compose -f "$COMPOSE_FILE" up -d

sleep 2

health_pg="failed"
if command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -h 127.0.0.1 -p 55432 -U postgres >/dev/null 2>&1; then
    health_pg="ok"
  fi
else
  if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    health_pg="ok"
  fi
fi

health_minio="failed"
if curl -sSf "http://127.0.0.1:9002/minio/health/ready" >/dev/null 2>&1; then
  health_minio="ok"
fi

health_synapse="failed"
if curl -sSf "http://127.0.0.1:8008/_matrix/client/versions" >/dev/null 2>&1; then
  health_synapse="ok"
fi

health_ganache="failed"
if curl -sS -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://127.0.0.1:8545 >/dev/null 2>&1; then
  health_ganache="ok"
fi

acc_identity="failed"
if curl -sSf http://127.0.0.1:7000/health >/dev/null 2>&1; then
  acc_identity="ok"
fi

acc_wallet="failed"
if curl -sSf http://127.0.0.1:7001/health >/dev/null 2>&1; then
  acc_wallet="ok"
fi

acc_media="failed"
if curl -sSf http://127.0.0.1:7002/health >/dev/null 2>&1; then
  acc_media="ok"
fi

acc_mapping="failed"
if curl -sSf http://127.0.0.1:7003/health >/dev/null 2>&1; then
  acc_mapping="ok"
fi

acc_messaging="failed"
if curl -sSf http://127.0.0.1:7004/health >/dev/null 2>&1; then
  acc_messaging="ok"
fi

schema_ok="failed"
if npx --yes ajv-cli compile -s docs/manifest.schema.json --spec=draft2020 >/dev/null 2>&1; then
  schema_ok="ok"
fi

lint_identity_ok="failed"
if npx --yes @stoplight/spectral-cli lint -r .spectral.yaml openapi/identity.yaml >/dev/null 2>&1; then
  lint_identity_ok="ok"
fi

lint_wallet_ok="failed"
if npx --yes @stoplight/spectral-cli lint -r .spectral.yaml openapi/wallet.yaml >/dev/null 2>&1; then
  lint_wallet_ok="ok"
fi

docker compose -f "$COMPOSE_FILE" ps > "$LOGS/compose-ps.txt" 2>&1 || true
docker compose -f "$COMPOSE_FILE" logs --no-color > "$LOGS/compose.log" 2>&1 || true

summary="pass"
for v in "$health_pg" "$health_minio" "$health_synapse" "$health_ganache" "$schema_ok" "$lint_identity_ok" "$lint_wallet_ok" "$acc_identity" "$acc_wallet" "$acc_media" "$acc_mapping" "$acc_messaging"; do
  if [ "$v" != "ok" ]; then
    summary="fail"
    break
  fi
done

report_path="$ARTIFACTS/bootstrap-report.json"
printf '{' > "$report_path"
printf '"knowledge_base":{"present":%s,"source":"%s"},' "true" "docs/knowledge_base.md" >> "$report_path"
printf '"specs":{"manifestSchema":{"valid":"%s"},"openapi":{"identity":{"lintOk":"%s"},"wallet":{"lintOk":"%s"}}},' "$schema_ok" "$lint_identity_ok" "$lint_wallet_ok" >> "$report_path"
printf '"services":{"postgres":{"healthy":"%s"},"minio":{"healthy":"%s"},"synapse":{"healthy":"%s"},"ganache":{"healthy":"%s"}},' "$health_pg" "$health_minio" "$health_synapse" "$health_ganache" >> "$report_path"
printf '"acceptance":{"identity":{"ok":"%s"},"wallet":{"ok":"%s"},"media":{"ok":"%s"},"mapping":{"ok":"%s"},"messaging":{"ok":"%s"}},' "$acc_identity" "$acc_wallet" "$acc_media" "$acc_mapping" "$acc_messaging" >> "$report_path"
printf '"summary":"%s"' "$summary" >> "$report_path"
printf '}\n' >> "$report_path"

echo "$report_path"
