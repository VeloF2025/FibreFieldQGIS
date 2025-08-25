#!/usr/bin/env python3
"""
Take mobile screenshots of PolePlantingApp for review
"""

import asyncio
from playwright.async_api import async_playwright
import os
from datetime import datetime

# Mobile viewport configuration for budget Android phones
MOBILE_CONFIG = {
    "viewport": {"width": 360, "height": 640},
    "device_scale_factor": 2,
    "is_mobile": True,
    "has_touch": True,
    "user_agent": "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
}

# Screenshots to capture
SCREENSHOTS = [
    {
        "name": "01-dashboard",
        "url": "https://pole-planting-app.web.app",
        "wait_for": "text=Select a project",
        "description": "Main dashboard"
    },
    {
        "name": "02-network-status",
        "url": "https://pole-planting-app.web.app",
        "wait_for": ".network-status",
        "description": "Network and sync status indicators"
    }
]

async def take_screenshots():
    # Create screenshot directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    screenshot_dir = f"/home/ldp/VF/Apps/FibreFlow/PolePlantingApp/screenshots/mobile-{timestamp}"
    os.makedirs(screenshot_dir, exist_ok=True)
    
    async with async_playwright() as p:
        # Launch browser with mobile configuration
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(**MOBILE_CONFIG)
        page = await context.new_page()
        
        print(f"Taking mobile screenshots in {screenshot_dir}")
        print("=" * 50)
        
        for screenshot in SCREENSHOTS:
            try:
                print(f"\nCapturing: {screenshot['name']}")
                print(f"URL: {screenshot['url']}")
                
                # Navigate to page
                await page.goto(screenshot['url'], wait_until="networkidle")
                
                # Wait for specific element
                if screenshot.get('wait_for'):
                    try:
                        await page.wait_for_selector(screenshot['wait_for'], timeout=5000)
                    except:
                        print(f"Warning: Could not find '{screenshot['wait_for']}'")
                
                # Take screenshot
                filepath = os.path.join(screenshot_dir, f"{screenshot['name']}.png")
                await page.screenshot(path=filepath, full_page=False)
                print(f"✓ Saved: {filepath}")
                
                # Check console errors
                console_logs = []
                page.on("console", lambda msg: console_logs.append(msg))
                
            except Exception as e:
                print(f"✗ Error capturing {screenshot['name']}: {e}")
        
        await browser.close()
        print(f"\nScreenshots saved to: {screenshot_dir}")

if __name__ == "__main__":
    asyncio.run(take_screenshots())