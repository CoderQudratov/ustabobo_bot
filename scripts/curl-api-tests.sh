#!/usr/bin/env bash
# Barcha backend API testlari va log
# Ishga tushirish: ./scripts/curl-api-tests.sh

set -e
BASE="https://ustabobo-backend.onrender.com"
LOG="${1:-api-tests.log}"

echo "=== API tests started at $(date -Iseconds) ===" | tee "$LOG"
echo "" | tee -a "$LOG"

# 1. Login
echo "━━━ 1. POST /admin/auth/login ━━━" | tee -a "$LOG"
RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}')
HTTP=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')
echo "Response: $BODY" | tee -a "$LOG"
echo "Status: $HTTP" | tee -a "$LOG"
TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "ERROR: No token received. Aborting." | tee -a "$LOG"
  exit 1
fi
echo "Token: ${TOKEN:0:50}..." | tee -a "$LOG"
echo "" | tee -a "$LOG"

AUTH="Authorization: Bearer $TOKEN"

# 2. Organizations list (full UUID olish uchun)
echo "━━━ 2. GET /admin/organizations ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE/admin/organizations?limit=5" -H "$AUTH" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# Org ID (birinchi org dan)
ORG_ID=$(curl -s -X GET "$BASE/admin/organizations?limit=1" -H "$AUTH" | grep -o '"id":"[a-f0-9-]*"' | head -1 | cut -d'"' -f4)
echo "First org_id: $ORG_ID" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 3. POST vehicle (to'liq orgId bilan)
echo "━━━ 3. POST /admin/organizations/:orgId/vehicles ━━━" | tee -a "$LOG"
if [ -n "$ORG_ID" ]; then
  curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE/admin/organizations/$ORG_ID/vehicles" \
    -H "Content-Type: application/json" -H "$AUTH" \
    -d '{"plate_number":"01A123BB","model":"Nexia","year":2019,"color":"oq","vin":"1HGBH41JXMN109186"}' | tee -a "$LOG"
else
  echo "Skip: no org_id" | tee -a "$LOG"
fi
echo "" | tee -a "$LOG"

# 4. GET services
echo "━━━ 4. GET /admin/services ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE/admin/services?limit=5" -H "$AUTH" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 5. POST service
echo "━━━ 5. POST /admin/services ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE/admin/services" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Test xizmat","price":25000}' | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 6. GET users
echo "━━━ 6. GET /admin/users ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE/admin/users?limit=5" -H "$AUTH" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 7. POST user (name + commission — frontend format)
echo "━━━ 7. POST /admin/users (name, commission) ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE/admin/users" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Test Usta","phone":"971112233","login":"testusta","password":"test123","role":"master","commission":15}' | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 8. GET products
echo "━━━ 8. GET /admin/products ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE/admin/products?limit=5" -H "$AUTH" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 9. POST product (selling_price, min_stock — frontend format)
echo "━━━ 9. POST /admin/products ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE/admin/products" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Test mahsulot","cost_price":1000,"selling_price":1200,"stock_count":50,"min_stock":5}' | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 10. GET client orders (phone bilan)
echo "━━━ 10. GET /admin/clients/individuals/orders?phone=931764610 ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE/admin/clients/individuals/orders?phone=931764610" -H "$AUTH" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 11. GET reports
echo "━━━ 11. GET /admin/reports (default dates) ━━━" | tee -a "$LOG"
FROM=$(date -u +%Y-%m-%dT00:00:00.000Z 2>/dev/null || date -u +%Y-%m-%dT00:00:00.000Z)
TO=$(date -u +%Y-%m-%dT23:59:59.000Z 2>/dev/null || date -u +%Y-%m-%dT23:59:59.000Z)
curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE/admin/reports?from=$FROM&to=$TO" -H "$AUTH" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 12. GET vehicle by plate
echo "━━━ 12. GET /admin/vehicles/by-plate/01A123BB ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE/admin/vehicles/by-plate/01A123BB" -H "$AUTH" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 13. PATCH service (to'liq UUID — "Moy almashtirish" id)
SERVICE_ID="c75a13d9-42f8-43dd-9376-5d2e00ca61a5"
echo "━━━ 13. PATCH /admin/services/:id ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X PATCH "$BASE/admin/services/$SERVICE_ID" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Moy almashtirish","price":55000}' | tee -a "$LOG"
echo "" | tee -a "$LOG"

# 14. PATCH user toggle-active (to'liq UUID — master/driver, boss emas)
USER_ID="7637320c-e3d8-4200-90d3-f0b9b6e0bc5a"
echo "━━━ 14. PATCH /admin/users/:id/toggle-active ━━━" | tee -a "$LOG"
curl -s -w "\nHTTP_CODE:%{http_code}" -X PATCH "$BASE/admin/users/$USER_ID/toggle-active" -H "$AUTH" | tee -a "$LOG"
echo "" | tee -a "$LOG"

echo "=== API tests finished at $(date -Iseconds) ===" | tee -a "$LOG"
echo "Log saved to: $LOG"
