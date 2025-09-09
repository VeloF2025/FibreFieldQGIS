/**
 * Photo Quality Validation API - Server-side photo quality analysis
 */

import { NextRequest, NextResponse } from 'next/server';

// Photo quality thresholds by type
const QUALITY_THRESHOLDS = {
  power_meter: {
    minSharpness: 60,
    minOverallScore: 70,
    minBrightness: 30,
    maxBrightness: 80
  },
  fibertime_setup: {
    minSharpness: 50,
    minOverallScore: 65,
    minBrightness: 25,
    maxBrightness: 85
  },
  device_actions: {
    minSharpness: 45,
    minOverallScore: 60,
    minBrightness: 30,
    maxBrightness: 85
  },
  router_lights: {
    minSharpness: 40,
    minOverallScore: 55,
    minBrightness: 15, // Lower for LED visibility
    maxBrightness: 75
  },
  default: {
    minSharpness: 40,
    minOverallScore: 60,
    minBrightness: 20,
    maxBrightness: 85
  }
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photoFile = formData.get('photo') as File;
    const photoType = formData.get('type') as string || 'default';
    const enforceThresholds = formData.get('enforceThresholds') !== 'false';
    
    if (!photoFile) {
      return NextResponse.json(
        { success: false, error: 'No photo file provided' },
        { status: 400 }
      );
    }

    // Get thresholds for photo type
    const thresholds = QUALITY_THRESHOLDS[photoType as keyof typeof QUALITY_THRESHOLDS] || QUALITY_THRESHOLDS.default;
    
    // Perform server-side quality analysis
    const buffer = await photoFile.arrayBuffer();
    const qualityMetrics = await analyzePhotoQuality(buffer, photoFile.type);
    
    // Check against thresholds
    const issues: string[] = [];
    const warnings: string[] = [];
    
    if (qualityMetrics.sharpness < thresholds.minSharpness) {
      issues.push(`Image is too blurry (sharpness: ${qualityMetrics.sharpness}%, required: ${thresholds.minSharpness}%)`);
    }
    
    if (qualityMetrics.brightness < thresholds.minBrightness) {
      issues.push(`Image is too dark (brightness: ${qualityMetrics.brightness}%, minimum: ${thresholds.minBrightness}%)`);
    }
    
    if (qualityMetrics.brightness > thresholds.maxBrightness) {
      issues.push(`Image is overexposed (brightness: ${qualityMetrics.brightness}%, maximum: ${thresholds.maxBrightness}%)`);
    }
    
    if (qualityMetrics.overallScore < thresholds.minOverallScore) {
      issues.push(`Overall quality score too low (${qualityMetrics.overallScore}%, required: ${thresholds.minOverallScore}%)`);
    }
    
    // Add warnings for non-critical issues
    if (qualityMetrics.noiseLevel > 30) {
      warnings.push('Image has high noise levels - consider better lighting');
    }
    
    if (qualityMetrics.contrast < 30) {
      warnings.push('Low contrast detected - ensure subject is clearly visible');
    }
    
    if (qualityMetrics.composition < 40) {
      warnings.push('Poor composition - center the main subject');
    }
    
    // Generate recommendations
    const recommendations = generateRecommendations(qualityMetrics, thresholds);
    
    // Determine if photo passes
    const passed = enforceThresholds ? issues.length === 0 : qualityMetrics.overallScore >= 40;
    
    return NextResponse.json({
      success: true,
      data: {
        passed,
        score: qualityMetrics.overallScore,
        metrics: qualityMetrics,
        issues,
        warnings,
        recommendations,
        thresholds: {
          photoType,
          ...thresholds
        }
      }
    });
    
  } catch (error: unknown) {
    console.error('Photo quality validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate photo quality',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Server-side photo quality analysis
async function analyzePhotoQuality(buffer: ArrayBuffer, mimeType: string) {
  // This is a simplified version - in production you'd use Sharp or similar
  const uint8Array = new Uint8Array(buffer);
  
  // Calculate basic metrics
  let totalBrightness = 0;
  let minBrightness = 255;
  let maxBrightness = 0;
  
  // Sample every 100th pixel for performance
  for (let i = 0; i < uint8Array.length; i += 400) {
    const brightness = (uint8Array[i] + uint8Array[i+1] + uint8Array[i+2]) / 3;
    totalBrightness += brightness;
    minBrightness = Math.min(minBrightness, brightness);
    maxBrightness = Math.max(maxBrightness, brightness);
  }
  
  const avgBrightness = (totalBrightness / (uint8Array.length / 400)) / 255 * 100;
  const contrast = ((maxBrightness - minBrightness) / 255) * 100;
  
  // Estimate sharpness based on edge detection (simplified)
  let edgeCount = 0;
  for (let i = 0; i < uint8Array.length - 4; i += 400) {
    const diff = Math.abs(uint8Array[i] - uint8Array[i+4]);
    if (diff > 30) edgeCount++;
  }
  const sharpness = Math.min(100, (edgeCount / (uint8Array.length / 400)) * 200);
  
  // Calculate file size score
  const sizeKB = buffer.byteLength / 1024;
  let sizeScore = 50;
  if (sizeKB > 500) sizeScore = 70;
  if (sizeKB > 1000) sizeScore = 85;
  if (sizeKB < 100) sizeScore = 30;
  
  // Estimate other metrics
  const colorBalance = 75; // Placeholder
  const noiseLevel = Math.max(0, 100 - (contrast / 2)); // Simplified noise estimation
  const composition = 60; // Placeholder
  
  // Calculate overall score
  const overallScore = Math.round(
    avgBrightness * 0.15 +
    contrast * 0.15 +
    sharpness * 0.30 +
    colorBalance * 0.10 +
    (100 - noiseLevel) * 0.20 +
    composition * 0.10
  );
  
  return {
    brightness: Math.round(avgBrightness),
    contrast: Math.round(contrast),
    sharpness: Math.round(sharpness),
    colorBalance: Math.round(colorBalance),
    noiseLevel: Math.round(noiseLevel),
    composition: Math.round(composition),
    overallScore: Math.round(overallScore),
    fileSize: sizeKB
  };
}

// Generate recommendations based on metrics
function generateRecommendations(metrics: any, thresholds: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.brightness < thresholds.minBrightness) {
    recommendations.push('Use better lighting or flash when capturing');
    recommendations.push('Avoid backlit situations');
  }
  
  if (metrics.brightness > thresholds.maxBrightness) {
    recommendations.push('Reduce exposure or avoid direct sunlight');
    recommendations.push('Use HDR mode if available');
  }
  
  if (metrics.sharpness < thresholds.minSharpness) {
    recommendations.push('Hold device steady when capturing');
    recommendations.push('Clean the camera lens');
    recommendations.push('Ensure subject is in focus');
    if (metrics.sharpness < 30) {
      recommendations.push('Consider using a tripod or stable surface');
    }
  }
  
  if (metrics.noiseLevel > 30) {
    recommendations.push('Improve lighting to reduce camera ISO');
    recommendations.push('Avoid using digital zoom');
  }
  
  if (metrics.contrast < 30) {
    recommendations.push('Ensure good contrast between subject and background');
    recommendations.push('Adjust camera settings for better exposure');
  }
  
  if (metrics.composition < 40) {
    recommendations.push('Center the main subject in frame');
    recommendations.push('Ensure all important details are visible');
    recommendations.push('Avoid cutting off edges of important elements');
  }
  
  return recommendations;
}