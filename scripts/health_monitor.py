#!/usr/bin/env python3
"""
Health check monitor for Vercel deployment.
Checks https://tawabeer-mu.vercel.app/api/health every run.
Exits 0 if OK, 1 if down.

Usage: python scripts/health_monitor.py
Recommended cron: */5 * * * *
"""

import urllib.request
import urllib.error
import json
import sys

APP_URL = "https://tawabeer-mu.vercel.app/api/health"
TIMEOUT = 10

def check():
    try:
        req = urllib.request.Request(APP_URL, headers={"User-Agent": "HealthCheck/1.0"})
        resp = urllib.request.urlopen(req, timeout=TIMEOUT)
        body = json.loads(resp.read().decode())
        status = body.get("status", "unknown")
        if status == "ok":
            print("OK")
            return 0
        else:
            checks = body.get("checks", {})
            failed = [f"{k}={v}" for k, v in checks.items() if "❌" in str(v)]
            print(f"DEGRADED: {', '.join(failed)}")
            return 1
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}")
        return 1
    except urllib.error.URLError as e:
        print(f"CONNECTION FAILED: {e.reason}")
        return 1
    except Exception as e:
        print(f"ERROR: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(check())
