/**
 * Home Drop Capture E2E Tests
 * 
 * Comprehensive end-to-end tests for the Home Drop Capture workflow.
 * Tests the complete user journey from assignment to approval across
 * multiple viewports and user scenarios.
 */

import { test, expect } from '@playwright/test'

test.describe('Home Drop Capture Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home drop assignments page
    await page.goto('/home-drop-assignments')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test.describe('Mobile Workflow (@mobile)', () => {
    test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE

    test('should complete home drop capture on mobile', async ({ page }) => {
      // Step 1: Select an assignment
      await test.step('Select Assignment', async () => {
        // Look for assignment cards
        const assignmentCard = page.locator('[data-testid="assignment-card"]').first()
        await expect(assignmentCard).toBeVisible()
        
        // Check assignment details are displayed
        await expect(page.locator('[data-testid="customer-name"]')).toBeVisible()
        await expect(page.locator('[data-testid="customer-address"]')).toBeVisible()
        await expect(page.locator('[data-testid="pole-number"]')).toBeVisible()
        
        // Start capture
        await page.locator('[data-testid="start-capture-button"]').click()
        
        // Should navigate to GPS capture step
        await expect(page).toHaveURL(/\/home-drop-capture\/gps/)
      })

      // Step 2: GPS Location Capture
      await test.step('GPS Location Capture', async () => {
        // Mock geolocation for testing
        await page.evaluate(() => {
          navigator.geolocation.getCurrentPosition = (success) => {
            success({
              coords: {
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 10,
                altitude: 15,
                altitudeAccuracy: 5,
                heading: 0,
                speed: 0
              },
              timestamp: Date.now()
            })
          }
        })

        // Click GPS capture button
        await page.locator('[data-testid="capture-gps-button"]').click()
        
        // Wait for GPS coordinates to be displayed
        await expect(page.locator('[data-testid="gps-coordinates"]')).toBeVisible()
        await expect(page.locator('[data-testid="gps-accuracy"]')).toContainText('10m')
        
        // Verify GPS accuracy is acceptable
        await expect(page.locator('[data-testid="gps-status"]')).toContainText('Good')
        
        // Continue to photo capture
        await page.locator('[data-testid="continue-to-photos"]').click()
        await expect(page).toHaveURL(/\/home-drop-capture\/photos/)
      })

      // Step 3: Photo Capture (All 4 Required Types)
      await test.step('Photo Capture', async () => {
        const requiredPhotoTypes = [
          'power-meter-test',
          'fibertime-setup-confirmation', 
          'fibertime-device-actions',
          'router-4-lights-status'
        ]

        for (const photoType of requiredPhotoTypes) {
          // Select photo type
          await page.locator(`[data-testid="photo-type-${photoType}"]`).click()
          
          // Mock camera access
          await page.evaluate(() => {
            navigator.mediaDevices.getUserMedia = () => Promise.resolve({
              getTracks: () => [{
                stop: () => {},
                getSettings: () => ({
                  width: 1920,
                  height: 1080,
                  facingMode: 'environment'
                })
              }]
            } as any)
          })

          // Open camera
          await page.locator('[data-testid="open-camera-button"]').click()
          
          // Wait for camera interface
          await expect(page.locator('[data-testid="camera-preview"]')).toBeVisible()
          
          // Take photo
          await page.locator('[data-testid="capture-photo-button"]').click()
          
          // Verify photo captured
          await expect(page.locator(`[data-testid="photo-preview-${photoType}"]`)).toBeVisible()
          
          // Accept photo
          await page.locator('[data-testid="accept-photo-button"]').click()
          
          // Check photo is marked as completed
          await expect(page.locator(`[data-testid="photo-status-${photoType}"]`)).toContainText('✓')
        }

        // All photos completed - continue to review
        await page.locator('[data-testid="continue-to-review"]').click()
        await expect(page).toHaveURL(/\/home-drop-capture\/review/)
      })

      // Step 4: Installation Details & Review
      await test.step('Installation Details & Review', async () => {
        // Fill installation details
        await page.locator('[data-testid="ont-serial-input"]').fill('ONT-ABC123456')
        await page.locator('[data-testid="router-serial-input"]').fill('RTR-XYZ789012')
        await page.locator('[data-testid="optical-power-input"]').fill('-14.5')
        await page.locator('[data-testid="signal-strength-input"]').fill('98')
        
        // Mark service as activated
        await page.locator('[data-testid="service-activated-checkbox"]').check()
        
        // Review all captured data
        await expect(page.locator('[data-testid="review-customer-name"]')).toBeVisible()
        await expect(page.locator('[data-testid="review-gps-location"]')).toBeVisible()
        await expect(page.locator('[data-testid="review-photos-count"]')).toContainText('4 / 4')
        await expect(page.locator('[data-testid="review-installation-details"]')).toBeVisible()
        
        // Submit for approval
        await page.locator('[data-testid="submit-for-approval-button"]').click()
        
        // Should show success message
        await expect(page.locator('[data-testid="submission-success"]')).toBeVisible()
        await expect(page.locator('[data-testid="submission-success"]')).toContainText('Home drop submitted for approval')
        
        // Should navigate to success page
        await expect(page).toHaveURL(/\/home-drop-capture\/success/)
      })
    })

    test('should handle GPS errors gracefully', async ({ page }) => {
      // Navigate to GPS capture
      await page.locator('[data-testid="assignment-card"]').first().click()
      await page.locator('[data-testid="start-capture-button"]').click()
      
      // Mock GPS error
      await page.evaluate(() => {
        navigator.geolocation.getCurrentPosition = (success, error) => {
          error({
            code: 1,
            message: 'User denied geolocation request',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2, 
            TIMEOUT: 3
          })
        }
      })

      // Try to capture GPS
      await page.locator('[data-testid="capture-gps-button"]').click()
      
      // Should show error message
      await expect(page.locator('[data-testid="gps-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="gps-error"]')).toContainText('GPS permission denied')
      
      // Should show manual coordinates option
      await expect(page.locator('[data-testid="manual-coordinates-button"]')).toBeVisible()
    })

    test('should validate photo quality', async ({ page }) => {
      // Navigate to photo capture
      await page.locator('[data-testid="assignment-card"]').first().click()
      await page.locator('[data-testid="start-capture-button"]').click()
      
      // Skip GPS for this test
      await page.locator('[data-testid="skip-gps-button"]').click()
      
      // Try to capture low quality photo
      await page.locator('[data-testid="photo-type-power-meter-test"]').click()
      await page.locator('[data-testid="open-camera-button"]').click()
      
      // Mock low quality photo
      await page.evaluate(() => {
        // Simulate blurry/low quality photo detection
        window.photoQualityCheck = () => ({
          isValid: false,
          score: 45, // Below 70 threshold
          issues: ['Image too blurry', 'Insufficient lighting']
        })
      })

      await page.locator('[data-testid="capture-photo-button"]').click()
      
      // Should show quality warning
      await expect(page.locator('[data-testid="photo-quality-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="photo-quality-score"]')).toContainText('45%')
      
      // Should offer retake option
      await expect(page.locator('[data-testid="retake-photo-button"]')).toBeVisible()
    })
  })

  test.describe('Desktop Workflow', () => {
    test.use({ viewport: { width: 1920, height: 1080 } }) // Desktop

    test('should display workflow progress indicator', async ({ page }) => {
      // Start capture
      await page.locator('[data-testid="assignment-card"]').first().click()
      await page.locator('[data-testid="start-capture-button"]').click()
      
      // Check progress indicator
      await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="current-step"]')).toContainText('2 of 4')
      
      // Step indicators should be visible
      await expect(page.locator('[data-testid="step-1-assignments"]')).toHaveClass(/completed/)
      await expect(page.locator('[data-testid="step-2-gps"]')).toHaveClass(/active/)
      await expect(page.locator('[data-testid="step-3-photos"]')).not.toHaveClass(/active|completed/)
      await expect(page.locator('[data-testid="step-4-review"]')).not.toHaveClass(/active|completed/)
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.locator('[data-testid="assignment-card"]').first().focus()
      
      // Navigate with keyboard
      await page.keyboard.press('Enter')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter') // Start capture
      
      // Should navigate to GPS step
      await expect(page).toHaveURL(/\/home-drop-capture\/gps/)
      
      // GPS capture button should be focusable
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="capture-gps-button"]')).toBeFocused()
    })
  })

  test.describe('Offline Functionality', () => {
    test('should work offline and sync when online', async ({ page, context }) => {
      // Start online
      await page.locator('[data-testid="assignment-card"]').first().click()
      await page.locator('[data-testid="start-capture-button"]').click()
      
      // Go offline
      await context.setOffline(true)
      
      // Continue capture offline
      await page.evaluate(() => {
        navigator.geolocation.getCurrentPosition = (success) => {
          success({
            coords: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
            timestamp: Date.now()
          })
        }
      })

      await page.locator('[data-testid="capture-gps-button"]').click()
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
      
      // Data should be saved locally
      await expect(page.locator('[data-testid="offline-queue-count"]')).toContainText('1 item')
      
      // Go back online
      await context.setOffline(false)
      
      // Should start syncing automatically
      await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible()
      await page.waitForTimeout(2000) // Wait for sync
      
      // Offline queue should be cleared
      await expect(page.locator('[data-testid="offline-queue-count"]')).toContainText('0 items')
    })
  })

  test.describe('Accessibility', () => {
    test('should meet WCAG AA standards', async ({ page }) => {
      // Check for proper heading structure
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBe(1)
      
      // Check for alt text on images
      const images = page.locator('img')
      const imageCount = await images.count()
      
      for (let i = 0; i < imageCount; i++) {
        const alt = await images.nth(i).getAttribute('alt')
        expect(alt).toBeTruthy()
      }
      
      // Check for proper form labels
      const inputs = page.locator('input')
      const inputCount = await inputs.count()
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i)
        const id = await input.getAttribute('id')
        if (id) {
          const label = page.locator(`label[for="${id}"]`)
          await expect(label).toBeVisible()
        }
      }
      
      // Check color contrast (basic check)
      const button = page.locator('[data-testid="start-capture-button"]').first()
      const buttonStyles = await button.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color
        }
      })
      
      // Should have sufficient contrast (basic validation)
      expect(buttonStyles.backgroundColor).not.toBe(buttonStyles.color)
    })

    test('should support screen readers', async ({ page }) => {
      // Check for proper ARIA labels
      const buttons = page.locator('button')
      const buttonCount = await buttons.count()
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i)
        const ariaLabel = await button.getAttribute('aria-label')
        const text = await button.textContent()
        
        // Button should have either text content or aria-label
        expect(ariaLabel || text?.trim()).toBeTruthy()
      }
      
      // Check for proper landmarks
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('nav')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load within performance thresholds', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/home-drop-assignments')
      await page.waitForLoadState('domcontentloaded')
      
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })

    test('should handle large photo files efficiently', async ({ page }) => {
      await page.locator('[data-testid="assignment-card"]').first().click()
      await page.locator('[data-testid="start-capture-button"]').click()
      await page.locator('[data-testid="skip-gps-button"]').click() // Skip to photos
      
      // Mock large photo file (5MB)
      await page.evaluate(() => {
        window.mockLargePhoto = () => {
          const canvas = document.createElement('canvas')
          canvas.width = 4000
          canvas.height = 3000
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = 'red'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          return canvas.toDataURL('image/jpeg', 1.0)
        }
      })

      await page.locator('[data-testid="photo-type-power-meter-test"]').click()
      
      const startTime = Date.now()
      await page.locator('[data-testid="upload-large-photo"]').click()
      
      // Should compress and process within 5 seconds
      await expect(page.locator('[data-testid="photo-compressed"]')).toBeVisible({ timeout: 5000 })
      
      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(5000)
    })
  })

  test.describe('Error Handling', () => {
    test('should recover from network errors', async ({ page, context }) => {
      await page.locator('[data-testid="assignment-card"]').first().click()
      await page.locator('[data-testid="start-capture-button"]').click()
      
      // Simulate network failure during sync
      await context.route('**/api/home-drop-captures/**', route => {
        route.abort('failed')
      })

      await page.locator('[data-testid="capture-gps-button"]').click()
      
      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
      
      // Should offer retry option
      await expect(page.locator('[data-testid="retry-sync-button"]')).toBeVisible()
      
      // Restore network
      await context.unroute('**/api/home-drop-captures/**')
      
      // Retry should succeed
      await page.locator('[data-testid="retry-sync-button"]').click()
      await expect(page.locator('[data-testid="sync-success"]')).toBeVisible()
    })

    test('should handle application crashes gracefully', async ({ page }) => {
      await page.locator('[data-testid="assignment-card"]').first().click()
      await page.locator('[data-testid="start-capture-button"]').click()
      
      // Fill some data
      await page.evaluate(() => {
        navigator.geolocation.getCurrentPosition = (success) => {
          success({
            coords: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
            timestamp: Date.now()
          })
        }
      })
      await page.locator('[data-testid="capture-gps-button"]').click()
      
      // Simulate app crash by refreshing
      await page.reload()
      
      // Should recover data from local storage
      await expect(page.locator('[data-testid="recovery-banner"]')).toBeVisible()
      await expect(page.locator('[data-testid="recovery-banner"]')).toContainText('Recovered unsaved work')
      
      // Data should be restored
      await page.locator('[data-testid="continue-work-button"]').click()
      await expect(page.locator('[data-testid="gps-coordinates"]')).toBeVisible()
    })
  })
})