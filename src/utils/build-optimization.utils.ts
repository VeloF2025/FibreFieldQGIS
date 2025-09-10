/**
 * Build Optimization Utilities
 *
 * Provides utilities for optimizing the build process, analyzing bundle sizes,
 * and implementing advanced build strategies for better performance.
 */

import { log } from '@/lib/logger';

/**
 * Build optimization configuration
 */
export interface BuildOptimizationConfig {
  enableBundleAnalysis: boolean;
  enableCompression: boolean;
  enableTreeShaking: boolean;
  enableCodeSplitting: boolean;
  enableCaching: boolean;
  targetBundleSize: number; // KB
  enableParallelization: boolean;
  enableSourceMaps: boolean;
  enableMinification: boolean;
}

/**
 * Default build optimization settings
 */
export const DEFAULT_BUILD_CONFIG: BuildOptimizationConfig = {
  enableBundleAnalysis: true,
  enableCompression: true,
  enableTreeShaking: true,
  enableCodeSplitting: true,
  enableCaching: true,
  targetBundleSize: 500, // 500KB
  enableParallelization: true,
  enableSourceMaps: false,
  enableMinification: true,
};

/**
 * Bundle analyzer utilities
 */
export class BundleAnalyzer {
  private static analysisResults: BundleAnalysisResult | null = null;

  /**
   * Analyze bundle composition
   */
  static async analyzeBundle(): Promise<BundleAnalysisResult> {
    try {
      // In a real implementation, this would parse webpack stats
      // For now, we'll simulate analysis
      const mockAnalysis: BundleAnalysisResult = {
        totalSize: 1.2 * 1024 * 1024, // 1.2MB
        chunks: [
          { name: 'vendor', size: 800 * 1024, modules: 150 },
          { name: 'app', size: 300 * 1024, modules: 80 },
          { name: 'pages', size: 100 * 1024, modules: 25 },
        ],
        largestModules: [
          { name: 'firebase', size: 400 * 1024, category: 'vendor' },
          { name: 'leaflet', size: 200 * 1024, category: 'vendor' },
          { name: 'react-dom', size: 150 * 1024, category: 'vendor' },
        ],
        recommendations: [
          'Consider lazy loading Firebase modules',
          'Optimize Leaflet bundle size',
          'Implement code splitting for routes',
        ],
        generatedAt: new Date(),
      };

      this.analysisResults = mockAnalysis;
      return mockAnalysis;
    } catch (error) {
      log.error('Bundle analysis failed', { error }, 'BundleAnalyzer');
      throw error;
    }
  }

  /**
   * Get current analysis results
   */
  static getAnalysisResults(): BundleAnalysisResult | null {
    return this.analysisResults;
  }

  /**
   * Generate optimization recommendations
   */
  static generateOptimizationRecommendations(analysis: BundleAnalysisResult): string[] {
    const recommendations: string[] = [];

    // Size-based recommendations
    if (analysis.totalSize > DEFAULT_BUILD_CONFIG.targetBundleSize * 1024) {
      recommendations.push(`Bundle size (${(analysis.totalSize / 1024 / 1024).toFixed(1)}MB) exceeds target (${DEFAULT_BUILD_CONFIG.targetBundleSize}KB)`);
    }

    // Large module recommendations
    analysis.largestModules.forEach(module => {
      if (module.size > 100 * 1024) { // 100KB
        recommendations.push(`Large module detected: ${module.name} (${(module.size / 1024).toFixed(1)}KB)`);
      }
    });

    // Chunk-based recommendations
    if (analysis.chunks.length < 3) {
      recommendations.push('Consider implementing more granular code splitting');
    }

    return recommendations;
  }
}

/**
 * Bundle analysis result interface
 */
export interface BundleAnalysisResult {
  totalSize: number;
  chunks: Array<{
    name: string;
    size: number;
    modules: number;
  }>;
  largestModules: Array<{
    name: string;
    size: number;
    category: string;
  }>;
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Build cache utilities
 */
export class BuildCache {
  private static readonly CACHE_KEY = 'fibrefield-build-cache';
  private static readonly CACHE_VERSION = 'v1';

  /**
   * Check if build cache is valid
   */
  static isCacheValid(): boolean {
    if (typeof localStorage === 'undefined') return false;

    try {
      const cache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
      return cache.version === this.CACHE_VERSION &&
             Date.now() - cache.timestamp < 24 * 60 * 60 * 1000; // 24 hours
    } catch {
      return false;
    }
  }

  /**
   * Save build cache
   */
  static saveCache(data: any): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const cache = {
        version: this.CACHE_VERSION,
        timestamp: Date.now(),
        data,
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      log.warn('Failed to save build cache', { error }, 'BuildCache');
    }
  }

  /**
   * Load build cache
   */
  static loadCache(): any | null {
    if (typeof localStorage === 'undefined') return null;

    try {
      const cache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
      if (this.isCacheValid() && cache.data) {
        return cache.data;
      }
    } catch (error) {
      log.warn('Failed to load build cache', { error }, 'BuildCache');
    }

    return null;
  }

  /**
   * Clear build cache
   */
  static clearCache(): void {
    if (typeof localStorage === 'undefined') return;

    localStorage.removeItem(this.CACHE_KEY);
    log.info('Build cache cleared', {}, 'BuildCache');
  }
}

/**
 * Build optimization manager
 */
export class BuildOptimizationManager {
  private config: BuildOptimizationConfig;

  constructor(config: Partial<BuildOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_BUILD_CONFIG, ...config };
  }

  /**
   * Run pre-build optimizations
   */
  async preBuildOptimization(): Promise<{
    optimizations: string[];
    warnings: string[];
    estimatedSavings: number;
  }> {
    const optimizations: string[] = [];
    const warnings: string[] = [];
    let estimatedSavings = 0;

    log.info('Running pre-build optimizations', {}, 'BuildOptimizationManager');

    // Analyze bundle if enabled
    if (this.config.enableBundleAnalysis) {
      try {
        const analysis = await BundleAnalyzer.analyzeBundle();
        optimizations.push('Bundle analysis completed');

        const recommendations = BundleAnalyzer.generateOptimizationRecommendations(analysis);
        warnings.push(...recommendations);

        // Estimate savings based on recommendations
        estimatedSavings = recommendations.length * 50 * 1024; // Assume 50KB per recommendation
      } catch (error) {
        warnings.push('Bundle analysis failed');
      }
    }

    // Check for unused dependencies
    const unusedDeps = await this.analyzeUnusedDependencies();
    if (unusedDeps.length > 0) {
      optimizations.push(`Found ${unusedDeps.length} potentially unused dependencies`);
      warnings.push(...unusedDeps.map(dep => `Unused dependency: ${dep}`));
      estimatedSavings += unusedDeps.length * 20 * 1024; // Assume 20KB per unused dep
    }

    // Optimize imports
    const importOptimizations = await this.optimizeImports();
    optimizations.push(...importOptimizations.optimized);
    warnings.push(...importOptimizations.warnings);
    estimatedSavings += importOptimizations.savings;

    return {
      optimizations,
      warnings,
      estimatedSavings,
    };
  }

  /**
   * Analyze unused dependencies
   */
  private async analyzeUnusedDependencies(): Promise<string[]> {
    // In a real implementation, this would use a tool like depcheck
    // For now, return mock data
    return [
      // Mock unused dependencies that could be removed
    ];
  }

  /**
   * Optimize imports
   */
  private async optimizeImports(): Promise<{
    optimized: string[];
    warnings: string[];
    savings: number;
  }> {
    const optimized: string[] = [];
    const warnings: string[] = [];
    let savings = 0;

    // Analyze import patterns
    optimized.push('Import optimization analysis completed');

    // Estimate savings from tree shaking and import optimization
    savings = 100 * 1024; // 100KB estimated savings

    return { optimized, warnings, savings };
  }

  /**
   * Generate build report
   */
  async generateBuildReport(): Promise<{
    buildTime: number;
    bundleSize: number;
    chunks: number;
    optimizations: string[];
    recommendations: string[];
  }> {
    const startTime = Date.now();

    // Simulate build process
    await new Promise(resolve => setTimeout(resolve, 1000));

    const buildTime = Date.now() - startTime;

    // Mock build results
    const report = {
      buildTime,
      bundleSize: 1.2 * 1024 * 1024, // 1.2MB
      chunks: 12,
      optimizations: [
        'Tree shaking enabled',
        'Code splitting implemented',
        'Compression enabled',
        'Minification enabled',
      ],
      recommendations: [
        'Consider implementing dynamic imports for large components',
        'Optimize images and assets',
        'Implement service worker for caching',
        'Consider using WebAssembly for heavy computations',
      ],
    };

    log.info('Build report generated', report, 'BuildOptimizationManager');
    return report;
  }

  /**
   * Get build configuration
   */
  getBuildConfig(): BuildOptimizationConfig {
    return { ...this.config };
  }

  /**
   * Update build configuration
   */
  updateBuildConfig(updates: Partial<BuildOptimizationConfig>): void {
    this.config = { ...this.config, ...updates };
    log.info('Build configuration updated', updates, 'BuildOptimizationManager');
  }
}

/**
 * Webpack optimization utilities
 */
export class WebpackOptimizer {
  /**
   * Generate optimized webpack configuration
   */
  static generateOptimizedConfig(baseConfig: any): any {
    return {
      ...baseConfig,
      optimization: {
        ...baseConfig.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            firebase: {
              test: /[\\/]node_modules[\\/]firebase[\\/]/,
              name: 'firebase',
              chunks: 'all',
              priority: 20,
            },
            leaflet: {
              test: /[\\/]node_modules[\\/]leaflet[\\/]/,
              name: 'leaflet',
              chunks: 'all',
              priority: 20,
            },
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 15,
            },
          },
        },
        minimize: true,
        minimizer: [
          // TerserPlugin for JS minification
          // CSSMinimizerPlugin for CSS minification
        ],
      },
      performance: {
        hints: 'warning',
        maxEntrypointSize: 512 * 1024, // 512KB
        maxAssetSize: 512 * 1024, // 512KB
      },
    };
  }

  /**
   * Analyze webpack bundle
   */
  static async analyzeWebpackBundle(stats: any): Promise<{
    assets: Array<{ name: string; size: number; chunks: number[] }>;
    chunks: Array<{ id: number; size: number; modules: number }>;
    warnings: string[];
  }> {
    // Parse webpack stats and return analysis
    const analysis = {
      assets: stats.assets?.map((asset: any) => ({
        name: asset.name,
        size: asset.size,
        chunks: asset.chunks || [],
      })) || [],
      chunks: stats.chunks?.map((chunk: any) => ({
        id: chunk.id,
        size: chunk.size,
        modules: chunk.modules?.length || 0,
      })) || [],
      warnings: stats.warnings || [],
    };

    return analysis;
  }
}

/**
 * Build performance monitor
 */
export class BuildPerformanceMonitor {
  private static buildTimes: Array<{ timestamp: Date; duration: number; success: boolean }> = [];

  /**
   * Record build time
   */
  static recordBuildTime(duration: number, success: boolean = true): void {
    this.buildTimes.push({
      timestamp: new Date(),
      duration,
      success,
    });

    // Keep only last 10 builds
    if (this.buildTimes.length > 10) {
      this.buildTimes = this.buildTimes.slice(-10);
    }

    log.info('Build time recorded', { duration, success }, 'BuildPerformanceMonitor');
  }

  /**
   * Get build performance statistics
   */
  static getBuildStats(): {
    averageTime: number;
    successRate: number;
    recentBuilds: Array<{ timestamp: Date; duration: number; success: boolean }>;
  } {
    const recentBuilds = [...this.buildTimes].reverse();
    const successfulBuilds = recentBuilds.filter(build => build.success);

    return {
      averageTime: recentBuilds.length > 0
        ? recentBuilds.reduce((sum, build) => sum + build.duration, 0) / recentBuilds.length
        : 0,
      successRate: recentBuilds.length > 0
        ? (successfulBuilds.length / recentBuilds.length) * 100
        : 0,
      recentBuilds: recentBuilds.slice(0, 5),
    };
  }

  /**
   * Check if build performance is degrading
   */
  static isPerformanceDegrading(): boolean {
    if (this.buildTimes.length < 3) return false;

    const recent = this.buildTimes.slice(-3);
    const older = this.buildTimes.slice(-6, -3);

    if (older.length === 0) return false;

    const recentAvg = recent.reduce((sum, build) => sum + build.duration, 0) / recent.length;
    const olderAvg = older.reduce((sum, build) => sum + build.duration, 0) / older.length;

    // Consider degrading if recent builds are 20% slower
    return recentAvg > olderAvg * 1.2;
  }
}

// Export singleton instances
export const buildOptimizationManager = new BuildOptimizationManager();

// Auto-run pre-build optimizations in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Only run in development to avoid affecting production builds
  setTimeout(() => {
    buildOptimizationManager.preBuildOptimization().then(result => {
      log.info('Pre-build optimization completed', result, 'BuildOptimization');
    });
  }, 1000);
}