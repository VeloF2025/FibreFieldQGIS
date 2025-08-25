# PolePlantingApp Mobile Screenshot Review

## Overview
This document outlines the mobile screenshots needed for reviewing the PolePlantingApp's field worker usability.

## Screenshot Requirements

### 1. Dashboard/Home Screen
- **URL**: https://pole-planting-app.web.app
- **Expected Elements**:
  - App header "FibreField"
  - Project selector dropdown
  - "Start New Capture" button
  - Incomplete poles section
  - Network status indicator
  - Sync status indicator

### 2. Project Selection
- **Action**: Click on project selector
- **Expected**:
  - Dropdown list of available projects
  - Touch-friendly selection items
  - Clear project names

### 3. Wizard Capture Flow - Start
- **Action**: Select project and click "Start New Capture"
- **Expected**:
  - Step 1: Before Installation
  - Progress indicator
  - Photo capture button
  - Navigation buttons
  - Clear instructions

### 4. Photo Capture Interface
- **Expected Elements**:
  - Camera button (min 48x48px)
  - Photo preview area
  - Upload status
  - Skip/Next buttons
  - Clear photo requirements

### 5. Form Input Fields
- **Look for**:
  - Pole number input
  - GPS coordinates
  - Notes field
  - Touch-friendly inputs
  - Clear labels

### 6. Review & Complete
- **Final wizard step**:
  - Summary of captured data
  - All photos preview
  - Submit button
  - Edit options

## Mobile Viewport Settings
- **Width**: 360px (budget Android phone)
- **Height**: 640px
- **Device Scale Factor**: 2
- **User Agent**: Mobile Chrome
- **Touch**: Enabled

## Key Validation Points

### Touch Targets
All interactive elements must be at least 48x48px:
- Buttons
- Links
- Form inputs
- Dropdown triggers

### Visibility
- Text contrast ratio ≥ 4.5:1
- Minimum font size 16px
- Clear visual hierarchy
- Works in bright light

### Performance
- Initial load < 3 seconds
- Smooth scrolling
- No janky animations
- Responsive interactions

### Offline Capability
- Clear offline indicators
- Local storage usage
- Sync status visible
- No data loss

## Review Checklist
- [ ] All buttons are tappable with thumb
- [ ] Text is readable without zooming
- [ ] Forms are easy to fill on mobile
- [ ] Navigation is intuitive
- [ ] Offline mode works properly
- [ ] Photo capture is seamless
- [ ] Progress is clearly indicated
- [ ] Errors are clearly communicated
- [ ] Success states are obvious
- [ ] App feels fast and responsive