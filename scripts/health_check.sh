#!/bin/bash
# Health check for Vercel deployment
cd "C:/Users/admin/Desktop/tawabeer"
URL="https://tawabeer-mu.vercel.app/api/health"
TIMEOUT=10
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$URL" 2>/dev/null)
if [ "$RESPONSE" = "200" ]; then
    echo "OK"
    exit 0
else
    echo "DOWN: HTTP $RESPONSE"
    exit 1
fi
