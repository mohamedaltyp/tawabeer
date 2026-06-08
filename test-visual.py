import asyncio
import os

async def visual_test():
    from playwright.async_api import async_playwright
    import urllib.request
    import json
    
    output_dir = r"C:\Users\admin\Desktop\tawabeer\test-output"
    os.makedirs(os.path.join(output_dir, "screenshots"), exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()
        
        pages_to_test = [
            ("http://localhost:3000", "homepage"),
            ("http://localhost:3000/dashboard", "dashboard"),
            ("http://localhost:3000/dashboard/pricing", "pricing"),
            ("http://localhost:3000/admin", "admin"),
            ("http://localhost:3000/nonexistent", "404"),
        ]
        
        results = []
        
        for url, name in pages_to_test:
            try:
                await page.goto(url, timeout=15000)
                await page.wait_for_load_state('networkidle')
                await asyncio.sleep(2)
                
                screenshot_path = os.path.join(output_dir, "screenshots", f"{name}.png")
                await page.screenshot(path=screenshot_path, full_page=True)
                
                title = await page.title()
                body = await page.text_content("body") or ""
                preview = body[:300].replace("\n", " ")
                
                results.append({"name": name, "url": url, "title": title, "screenshot": screenshot_path, "status": "OK", "preview": preview})
                print(f"OK  {name}: {url} -> {title}")
            except Exception as e:
                results.append({"name": name, "url": url, "status": f"ERROR: {str(e)[:100]}"})
                print(f"ERR {name}: {url} -> {str(e)[:100]}")
        
        # Test homepage search
        try:
            await page.goto("http://localhost:3000", timeout=15000)
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(1)
            search = page.locator('input[placeholder*="بحث"]')
            if await search.count() > 0:
                await search.fill("restaurant")
                await asyncio.sleep(1)
                ss = os.path.join(output_dir, "screenshots", "search_english.png")
                await page.screenshot(path=ss, full_page=True)
                print(f"OK  search_english: filled 'restaurant'")
        except Exception as e:
            print(f"ERR search: {str(e)[:100]}")
        
        # Test dark mode toggle
        try:
            await page.goto("http://localhost:3000", timeout=15000)
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(1)
            toggle = page.locator('button[aria-label="Toggle theme"]')
            if await toggle.count() > 0:
                await toggle.click()
                await asyncio.sleep(0.5)
                is_dark = await page.evaluate("document.documentElement.classList.contains('dark')")
                ss = os.path.join(output_dir, "screenshots", "dark_mode.png")
                await page.screenshot(path=ss, full_page=True)
                print(f"OK  dark_mode: toggled, dark={is_dark}")
                # Toggle back
                await toggle.click()
                await asyncio.sleep(0.5)
                is_light = not await page.evaluate("document.documentElement.classList.contains('dark')")
                print(f"OK  light_mode: toggled back, light={is_light}")
        except Exception as e:
            print(f"ERR dark_mode: {str(e)[:100]}")
        
        # Test 404 page
        try:
            await page.goto("http://localhost:3000/nonexistent-page", timeout=15000)
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(1)
            body = await page.text_content("body") or ""
            has_404_msg = "الصفحة غير موجودة" in body
            has_home_link = "العودة للرئيسية" in body
            print(f"OK  404: custom_msg={has_404_msg}, home_link={has_home_link}")
        except Exception as e:
            print(f"ERR 404: {str(e)[:100]}")
        
        # Test API health
        try:
            req = urllib.request.Request("http://localhost:3000/api/health", headers={"ngrok-skip-browser-warning": "true"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
                status = data.get('status', 'unknown')
                db = data.get('checks', {}).get('database', 'unknown')
                server = data.get('checks', {}).get('server', 'unknown')
                memory = data.get('checks', {}).get('memory', 'unknown')
                print(f"OK  health: status={status}, server={server}, db={db}, mem={memory}")
        except Exception as e:
            print(f"ERR health: {str(e)[:100]}")
        
        # Test dashboard login form
        try:
            await page.goto("http://localhost:3000/dashboard", timeout=15000)
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(1)
            phone_input = page.locator('input[placeholder*="0100"]')
            pass_input = page.locator('input[type="password"]')
            has_phone = await phone_input.count() > 0
            has_pass = await pass_input.count() > 0
            print(f"OK  dashboard: phone_input={has_phone}, pass_input={has_pass}")
        except Exception as e:
            print(f"ERR dashboard: {str(e)[:100]}")
        
        # Check PWA manifest
        try:
            req = urllib.request.Request("http://localhost:3000/manifest.json")
            with urllib.request.urlopen(req, timeout=10) as resp:
                manifest = json.loads(resp.read())
                print(f"OK  manifest: name={manifest.get('name')}, short_name={manifest.get('short_name')}, theme={manifest.get('theme_color')}")
        except Exception as e:
            print(f"ERR manifest: {str(e)[:100]}")
        
        # Check service worker
        try:
            sw_registered = await page.evaluate("navigator.serviceWorker.controller !== null")
            print(f"OK  service_worker: registered={sw_registered}")
        except Exception as e:
            print(f"ERR sw: {str(e)[:100]}")
        
        await browser.close()
        
        print("\n========== SUMMARY ==========")
        ok = sum(1 for r in results if r['status'] == 'OK')
        err = sum(1 for r in results if r['status'] != 'OK')
        print(f"Pages tested: {len(results)} | OK: {ok} | Errors: {err}")
        for r in results:
            icon = "✅" if r['status'] == 'OK' else "❌"
            print(f"  {icon} {r['name']}: {r['status']}")
        print(f"Screenshots: {output_dir}\\screenshots\\")

asyncio.run(visual_test())
