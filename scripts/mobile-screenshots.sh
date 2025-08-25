#!/bin/bash

# Mobile Screenshots Script for PolePlantingApp
# Uses Chrome DevTools Protocol for mobile emulation

SCREENSHOT_DIR="/home/ldp/VF/Apps/FibreFlow/PolePlantingApp/screenshots/mobile-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$SCREENSHOT_DIR"

echo "Mobile Screenshot Capture Plan"
echo "=============================="
echo "Target: https://pole-planting-app.web.app"
echo "Viewport: 360x640 (Budget Android)"
echo "Output: $SCREENSHOT_DIR"
echo ""

# Define screenshots needed
cat << EOF > "$SCREENSHOT_DIR/screenshot-plan.md"
# PolePlantingApp Mobile Screenshots

## Planned Screenshots

### 1. Dashboard (Home Screen)
- URL: https://pole-planting-app.web.app
- Expected: Project selector, Start button, Network status
- Viewport: 360x640

### 2. Project Selection Expanded
- Action: Click on project dropdown
- Expected: List of available projects
- Check: Touch target sizes

### 3. Wizard Start - Before Installation
- Action: Select project, click Start New Capture
- Expected: First wizard step with photo capture
- Check: Button sizes, text readability

### 4. Photo Capture Interface
- Expected: Camera button, instructions
- Check: 48px minimum touch targets

### 5. Form Inputs
- Expected: Pole number, GPS, notes fields
- Check: Input accessibility on mobile

### 6. Review Screen
- Expected: Summary of all captured data
- Check: Photo previews, submit button

## Mobile Testing Checklist
- [ ] All buttons ≥ 48x48px
- [ ] Text readable at 16px minimum
- [ ] High contrast for outdoor use
- [ ] Offline indicators visible
- [ ] No horizontal scrolling
- [ ] Forms easy to fill with thumb
- [ ] Clear feedback for all actions

## How to capture manually:
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "Responsive" and set to 360x640
4. Navigate to https://pole-planting-app.web.app
5. Take screenshots of each screen
6. Save to: $SCREENSHOT_DIR
EOF

echo "Screenshot plan created at: $SCREENSHOT_DIR/screenshot-plan.md"
echo ""
echo "To capture screenshots manually:"
echo "1. Open Chrome/Chromium"
echo "2. Press F12 for DevTools"
echo "3. Press Ctrl+Shift+M for mobile view"
echo "4. Set viewport to 360x640"
echo "5. Navigate to https://pole-planting-app.web.app"
echo "6. Follow the plan in $SCREENSHOT_DIR/screenshot-plan.md"

# Try to open the URL in Chrome with mobile emulation
if command -v google-chrome &> /dev/null; then
    echo ""
    echo "Opening Chrome with mobile emulation..."
    google-chrome \
        --window-size=360,640 \
        --user-agent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36" \
        "https://pole-planting-app.web.app" &
elif command -v chromium &> /dev/null; then
    echo ""
    echo "Opening Chromium with mobile emulation..."
    chromium \
        --window-size=360,640 \
        --user-agent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36" \
        "https://pole-planting-app.web.app" &
fi