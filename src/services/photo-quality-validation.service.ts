// Photo Quality Validation Service
import type { HomeDropPhoto } from '@/types/home-drop.types';

export interface QualityMetrics {
  brightness: number;      // 0-100
  contrast: number;        // 0-100
  sharpness: number;       // 0-100
  colorBalance: number;    // 0-100
  noiseLevel: number;      // 0-100 (lower is better)
  composition: number;     // 0-100
  overallScore: number;    // 0-100
}

export interface QualityValidationResult {
  passed: boolean;
  score: number;
  metrics: QualityMetrics;
  issues: QualityIssue[];
  recommendations: string[];
}

export interface QualityIssue {
  type: 'brightness' | 'blur' | 'noise' | 'composition' | 'resolution' | 'format';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  value?: number;
}

export interface PhotoRequirements {
  minWidth: number;
  minHeight: number;
  maxFileSize: number; // bytes
  minBrightness: number;
  maxBrightness: number;
  minSharpness: number;
  minOverallScore: number;
  acceptedFormats: string[];
}

class PhotoQualityValidationService {
  private readonly defaultRequirements: PhotoRequirements = {
    minWidth: 1280,
    minHeight: 720,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    minBrightness: 20,
    maxBrightness: 85,
    minSharpness: 40,
    minOverallScore: 60,
    acceptedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  };
  
  private photoTypeRequirements: Map<string, Partial<PhotoRequirements>> = new Map([
    ['power_meter', {
      minSharpness: 60, // Higher sharpness for text readability
      minOverallScore: 70
    }],
    ['fibertime_setup', {
      minWidth: 1920,
      minHeight: 1080,
      minSharpness: 50
    }],
    ['device_actions', {
      minBrightness: 30, // Better lighting for equipment
      minSharpness: 45
    }],
    ['router_lights', {
      minBrightness: 15, // Lower for LED visibility
      maxBrightness: 75,
      minSharpness: 40
    }]
  ]);
  
  /**
   * Validate photo quality
   */
  async validatePhoto(
    file: File | Blob,
    photoType: string,
    customRequirements?: Partial<PhotoRequirements>
  ): Promise<QualityValidationResult> {
    try {
      // Get requirements for photo type
      const requirements = this.getRequirements(photoType, customRequirements);
      
      // Basic file validation
      const basicIssues = this.validateFileBasics(file, requirements);
      
      // Load image for quality analysis
      const image = await this.loadImage(file);
      
      // Calculate quality metrics
      const metrics = await this.calculateQualityMetrics(image, file);
      
      // Validate against requirements
      const qualityIssues = this.validateQualityMetrics(metrics, requirements);
      
      // Combine all issues
      const allIssues = [...basicIssues, ...qualityIssues];
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(allIssues, metrics);
      
      // Calculate if passed
      const criticalIssues = allIssues.filter(i => i.severity === 'critical');
      const passed = criticalIssues.length === 0 && metrics.overallScore >= requirements.minOverallScore;
      
      return {
        passed,
        score: metrics.overallScore,
        metrics,
        issues: allIssues,
        recommendations
      };
    } catch (error) {
      log.error('Photo validation error:', {}, "PhotoqualityvalidationService", error);
      return {
        passed: false,
        score: 0,
        metrics: this.getEmptyMetrics(),
        issues: [{
          type: 'format',
          severity: 'critical',
          message: 'Failed to process image'
        }],
        recommendations: ['Please ensure the image is valid and try again']
      };
    }
  }
  
  /**
   * Batch validate multiple photos
   */
  async validateBatch(
    photos: Array<{ file: File | Blob; type: string }>,
    customRequirements?: Partial<PhotoRequirements>
  ): Promise<QualityValidationResult[]> {
    const results = await Promise.all(
      photos.map(({ file, type }) => 
        this.validatePhoto(file, type, customRequirements)
      )
    );
    
    return results;
  }
  
  /**
   * Get requirements for photo type
   */
  private getRequirements(
    photoType: string,
    customRequirements?: Partial<PhotoRequirements>
  ): PhotoRequirements {
    const typeSpecific = this.photoTypeRequirements.get(photoType) || {};
    
    return {
      ...this.defaultRequirements,
      ...typeSpecific,
      ...customRequirements
    };
  }
  
  /**
   * Validate file basics
   */
  private validateFileBasics(
    file: File | Blob,
    requirements: PhotoRequirements
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // Check file size
    if (file.size > requirements.maxFileSize) {
      issues.push({
        type: 'format',
        severity: 'warning',
        message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${(requirements.maxFileSize / 1024 / 1024).toFixed(2)}MB)`,
        value: file.size
      });
    }
    
    // Check file type
    if (!requirements.acceptedFormats.includes(file.type)) {
      issues.push({
        type: 'format',
        severity: 'critical',
        message: `File format "${file.type}" is not accepted`,
        value: 0
      });
    }
    
    return issues;
  }
  
  /**
   * Load image from file
   */
  private loadImage(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }
  
  /**
   * Calculate quality metrics
   */
  private async calculateQualityMetrics(
    image: HTMLImageElement,
    file: File | Blob
  ): Promise<QualityMetrics> {
    // Create canvas for pixel analysis
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    // Calculate brightness
    const brightness = this.calculateBrightness(pixels);
    
    // Calculate contrast
    const contrast = this.calculateContrast(pixels);
    
    // Calculate sharpness (edge detection)
    const sharpness = this.calculateSharpness(imageData);
    
    // Calculate color balance
    const colorBalance = this.calculateColorBalance(pixels);
    
    // Calculate noise level
    const noiseLevel = this.calculateNoiseLevel(imageData);
    
    // Calculate composition score (rule of thirds, centering)
    const composition = this.calculateComposition(imageData);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore({
      brightness,
      contrast,
      sharpness,
      colorBalance,
      noiseLevel,
      composition
    });
    
    return {
      brightness,
      contrast,
      sharpness,
      colorBalance,
      noiseLevel,
      composition,
      overallScore
    };
  }
  
  /**
   * Calculate brightness
   */
  private calculateBrightness(pixels: Uint8ClampedArray): number {
    let totalBrightness = 0;
    const pixelCount = pixels.length / 4;
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // Calculate perceived brightness
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
      totalBrightness += brightness;
    }
    
    // Return as percentage
    return (totalBrightness / pixelCount / 255) * 100;
  }
  
  /**
   * Calculate contrast
   */
  private calculateContrast(pixels: Uint8ClampedArray): number {
    const grayscale: number[] = [];
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      grayscale.push(0.299 * r + 0.587 * g + 0.114 * b);
    }
    
    const mean = grayscale.reduce((a, b) => a + b, 0) / grayscale.length;
    const variance = grayscale.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / grayscale.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize to 0-100
    return Math.min(100, (stdDev / 128) * 100);
  }
  
  /**
   * Calculate sharpness using Laplacian edge detection
   */
  private calculateSharpness(imageData: ImageData): number {
    const { data, width, height } = imageData;
    const laplacian = [0, -1, 0, -1, 4, -1, 0, -1, 0];
    let edgeSum = 0;
    let pixelCount = 0;
    
    // Sample every 10th pixel for performance
    for (let y = 1; y < height - 1; y += 10) {
      for (let x = 1; x < width - 1; x += 10) {
        let sum = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            sum += gray * laplacian[(ky + 1) * 3 + (kx + 1)];
          }
        }
        
        edgeSum += Math.abs(sum);
        pixelCount++;
      }
    }
    
    // Normalize to 0-100
    const avgEdge = edgeSum / pixelCount;
    return Math.min(100, (avgEdge / 255) * 100);
  }
  
  /**
   * Calculate color balance
   */
  private calculateColorBalance(pixels: Uint8ClampedArray): number {
    let rSum = 0, gSum = 0, bSum = 0;
    const pixelCount = pixels.length / 4;
    
    for (let i = 0; i < pixels.length; i += 4) {
      rSum += pixels[i];
      gSum += pixels[i + 1];
      bSum += pixels[i + 2];
    }
    
    const rAvg = rSum / pixelCount;
    const gAvg = gSum / pixelCount;
    const bAvg = bSum / pixelCount;
    
    // Calculate deviation from gray
    const grayAvg = (rAvg + gAvg + bAvg) / 3;
    const deviation = Math.abs(rAvg - grayAvg) + Math.abs(gAvg - grayAvg) + Math.abs(bAvg - grayAvg);
    
    // Lower deviation = better balance
    return Math.max(0, 100 - (deviation / 255) * 100);
  }
  
  /**
   * Calculate noise level
   */
  private calculateNoiseLevel(imageData: ImageData): number {
    const { data, width, height } = imageData;
    let noiseSum = 0;
    let pixelCount = 0;
    
    // Sample pixels and compare with neighbors
    for (let y = 1; y < height - 1; y += 10) {
      for (let x = 1; x < width - 1; x += 10) {
        const idx = (y * width + x) * 4;
        const centerGray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        
        let neighborSum = 0;
        let neighborCount = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            const nGray = 0.299 * data[nIdx] + 0.587 * data[nIdx + 1] + 0.114 * data[nIdx + 2];
            neighborSum += nGray;
            neighborCount++;
          }
        }
        
        const neighborAvg = neighborSum / neighborCount;
        noiseSum += Math.abs(centerGray - neighborAvg);
        pixelCount++;
      }
    }
    
    // Lower noise = better quality (invert for scoring)
    const avgNoise = noiseSum / pixelCount;
    return Math.max(0, 100 - (avgNoise / 255) * 200);
  }
  
  /**
   * Calculate composition score
   */
  private calculateComposition(imageData: ImageData): number {
    const { data, width, height } = imageData;
    
    // Check if main content is in rule of thirds zones
    const thirdWidth = width / 3;
    const thirdHeight = height / 3;
    
    // Find content density in different zones
    const zones: number[] = new Array(9).fill(0);
    
    for (let y = 0; y < height; y += 10) {
      for (let x = 0; x < width; x += 10) {
        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        
        const zoneX = Math.floor(x / thirdWidth);
        const zoneY = Math.floor(y / thirdHeight);
        const zoneIdx = Math.min(8, zoneY * 3 + zoneX);
        
        zones[zoneIdx] += gray;
      }
    }
    
    // Prefer distribution across zones (not all in center)
    const totalContent = zones.reduce((a, b) => a + b, 0);
    const avgContent = totalContent / 9;
    const variance = zones.reduce((sum, val) => sum + Math.pow(val - avgContent, 2), 0) / 9;
    
    // Moderate variance is good (not too uniform, not too concentrated)
    const idealVariance = avgContent * avgContent * 0.3;
    const varianceScore = 100 - Math.abs(variance - idealVariance) / idealVariance * 50;
    
    return Math.max(0, Math.min(100, varianceScore));
  }
  
  /**
   * Calculate overall score
   */
  private calculateOverallScore(metrics: Omit<QualityMetrics, 'overallScore'>): number {
    // Weight different metrics
    const weights = {
      brightness: 0.15,
      contrast: 0.15,
      sharpness: 0.30,
      colorBalance: 0.10,
      noiseLevel: 0.20,
      composition: 0.10
    };
    
    let weightedSum = 0;
    
    // Apply optimal ranges for brightness
    let brightnessScore = metrics.brightness;
    if (metrics.brightness < 20) {
      brightnessScore = metrics.brightness * 2; // Penalize dark images
    } else if (metrics.brightness > 85) {
      brightnessScore = 100 - (metrics.brightness - 85) * 3; // Penalize overexposed
    } else {
      brightnessScore = 100; // Optimal range
    }
    
    weightedSum += brightnessScore * weights.brightness;
    weightedSum += metrics.contrast * weights.contrast;
    weightedSum += metrics.sharpness * weights.sharpness;
    weightedSum += metrics.colorBalance * weights.colorBalance;
    weightedSum += metrics.noiseLevel * weights.noiseLevel;
    weightedSum += metrics.composition * weights.composition;
    
    return Math.round(weightedSum);
  }
  
  /**
   * Validate quality metrics against requirements
   */
  private validateQualityMetrics(
    metrics: QualityMetrics,
    requirements: PhotoRequirements
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // Check brightness
    if (metrics.brightness < requirements.minBrightness) {
      issues.push({
        type: 'brightness',
        severity: 'critical',
        message: `Image is too dark (${metrics.brightness.toFixed(0)}% brightness)`,
        value: metrics.brightness
      });
    } else if (metrics.brightness > requirements.maxBrightness) {
      issues.push({
        type: 'brightness',
        severity: 'critical',
        message: `Image is overexposed (${metrics.brightness.toFixed(0)}% brightness)`,
        value: metrics.brightness
      });
    }
    
    // Check sharpness
    if (metrics.sharpness < requirements.minSharpness) {
      issues.push({
        type: 'blur',
        severity: metrics.sharpness < requirements.minSharpness * 0.5 ? 'critical' : 'warning',
        message: `Image is blurry (${metrics.sharpness.toFixed(0)}% sharpness)`,
        value: metrics.sharpness
      });
    }
    
    // Check noise
    if (metrics.noiseLevel < 30) {
      issues.push({
        type: 'noise',
        severity: 'warning',
        message: `Image has high noise levels`,
        value: metrics.noiseLevel
      });
    }
    
    // Check composition
    if (metrics.composition < 40) {
      issues.push({
        type: 'composition',
        severity: 'info',
        message: `Poor image composition`,
        value: metrics.composition
      });
    }
    
    return issues;
  }
  
  /**
   * Generate recommendations
   */
  private generateRecommendations(
    issues: QualityIssue[],
    metrics: QualityMetrics
  ): string[] {
    const recommendations: string[] = [];
    
    // Brightness recommendations
    if (issues.some(i => i.type === 'brightness')) {
      if (metrics.brightness < 20) {
        recommendations.push('Use better lighting or flash when capturing the photo');
        recommendations.push('Avoid backlit situations');
      } else if (metrics.brightness > 85) {
        recommendations.push('Reduce exposure or avoid direct sunlight');
        recommendations.push('Use HDR mode if available');
      }
    }
    
    // Sharpness recommendations
    if (issues.some(i => i.type === 'blur')) {
      recommendations.push('Hold the device steady when capturing');
      recommendations.push('Clean the camera lens');
      recommendations.push('Ensure subject is in focus before capturing');
      if (metrics.sharpness < 30) {
        recommendations.push('Consider using a tripod or stable surface');
      }
    }
    
    // Noise recommendations
    if (issues.some(i => i.type === 'noise')) {
      recommendations.push('Use better lighting to reduce ISO/grain');
      recommendations.push('Avoid digital zoom');
    }
    
    // Composition recommendations
    if (issues.some(i => i.type === 'composition')) {
      recommendations.push('Center the main subject in the frame');
      recommendations.push('Ensure all important details are visible');
    }
    
    // Resolution recommendations
    if (issues.some(i => i.type === 'resolution')) {
      recommendations.push('Use higher camera resolution settings');
      recommendations.push('Move closer to the subject instead of zooming');
    }
    
    return recommendations;
  }
  
  /**
   * Get empty metrics
   */
  private getEmptyMetrics(): QualityMetrics {
    return {
      brightness: 0,
      contrast: 0,
      sharpness: 0,
      colorBalance: 0,
      noiseLevel: 0,
      composition: 0,
      overallScore: 0
    };
  }
  
  /**
   * Get quality rating from score
   */
  getQualityRating(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Acceptable';
    if (score >= 40) return 'Poor';
    return 'Unacceptable';
  }
  
  /**
   * Get quality color from score
   */
  getQualityColor(score: number): string {
    if (score >= 90) return '#10b981'; // green-500
    if (score >= 75) return '#84cc16'; // lime-500
    if (score >= 60) return '#eab308'; // yellow-500
    if (score >= 40) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  }
}

export const photoQualityValidationService = new PhotoQualityValidationService();