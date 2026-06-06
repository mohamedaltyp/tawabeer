#!/usr/bin/env python3
"""
Health check monitor — checks the app every N minutes
and sends a Telegram alert if something is down.

Usage: python scripts/health_monitor.py
Recommended cron: */5 * * * * python scripts/health_monitor.py

Config: set env vars or edit defaults below.
"""

import os
import sys
import urllib.request
import urllib.error
import json
import time

# --- CONFIG ---
APP_URL = os.getenv("APP_URL", "https://operates-minister-review-jun.trycloudflare.com")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "1027781923")
TIMEOUT = 15
# -------------

STATUS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".health_last_down")

def send_telegram(message):
    if not TELEGRAM_BOT_TOKEN:
        print("No TELEGRAM_BOT_TOKEN set, skipping notification")
        print(f"Message: {message}")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=10)
        print("Telegram notification sent")
    except Exception as e:
        print(f"Telegram send failed: {e}")

def check():
    url = f"{APP_URL}/api/health"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HealthCheck/1.0"})
        resp = urllib.request.urlopen(req, timeout=TIMEOUT)
        body = json.loads(resp.read().decode())
        status = body.get("status", "unknown")
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return f"Connection failed: {e.reason}"
    except Exception as e:
        return f"Error: {e}"
    if status == "ok":
        return "ok"
    else:
        failed = [f"{k}={v}" for k, v in body.get("checks", {}).items() if v.startswith("X")]
        return f"degraded: {', '.join(failed)}"

def main():
    result = check()
    is_down = result != "ok"
    was_down = os.path.exists(STATUS_FILE)
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    if is_down:
        with open(STATUS_FILE, "w") as f:
            f.write(timestamp)
        if not was_down:
            msg = f"""<b>RED Application Down!</b>

Time: {timestamp}
URL: <code>{APP_URL}</code>
Status: {result}"""
            send_telegram(msg)
            print(f"DOWN detected at {timestamp}")
        else:
            print(f"Still DOWN at {timestamp}")
    else:
        if was_down:
            os.remove(STATUS_FILE)
            msg = f"""<b>GREEN Application Back Up!</b>

Time: {timestamp}
URL: <code>{APP_URL}</code>
Status: OK"""
            send_telegram(msg)
            print(f"BACK UP at {timestamp}")
        else:
            print(f"OK at {timestamp}")

if __name__ == "__main__":
    main()
