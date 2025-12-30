/**
 * Performance Monitoring Utility
 * Provides tools for tracking and logging operation performance
 * Uses Performance API for accurate timing measurements
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceThresholds {
  /** Warn if operation takes longer than this (ms) */
  warning: number;
  /** Error if operation takes longer than this (ms) */
  error: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  warning: 1000, // 1 second
  error: 5000, // 5 seconds
};

/**
 * Performance monitor for tracking operation timing
 * Automatically logs warnings for slow operations
 *
 * @example
 * ```typescript
 * const monitor = createPerformanceMonitor('textDetection');
 *
 * // Perform operation
 * const result = await detectTextBlocks();
 *
 * // End monitoring
 * monitor.end({ totalPages: 10, blocksFound: 25 });
 * ```
 */
export function createPerformanceMonitor(
  operationName: string,
  thresholds: Partial<PerformanceThresholds> = {},
) {
  const startTime = performance.now();
  const combinedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  return {
    /**
     * End the performance monitoring and log results
     * @param metadata - Additional context to log with the metric
     * @returns The duration in milliseconds
     */
    end(metadata?: Record<string, unknown>): number {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        operation: operationName,
        duration,
        timestamp: Date.now(),
        metadata,
      };

      // Log based on thresholds
      if (duration >= combinedThresholds.error) {
        console.error(
          `[Performance] SLOW OPERATION: ${operationName} took ${duration.toFixed(2)}ms`,
          metric,
        );
      } else if (duration >= combinedThresholds.warning) {
        console.warn(
          `[Performance] ${operationName} took ${duration.toFixed(2)}ms`,
          metric,
        );
      } else if (process.env.NODE_ENV === "development") {
        console.log(
          `[Performance] ${operationName} took ${duration.toFixed(2)}ms`,
          metric,
        );
      }

      return duration;
    },

    /**
     * Get current elapsed time without ending the monitor
     * @returns The current duration in milliseconds
     */
    elapsed(): number {
      return performance.now() - startTime;
    },
  };
}

/**
 * Measure the performance of an async operation
 * Automatically starts and ends monitoring around the operation
 *
 * @param operationName - Name of the operation being measured
 * @param operation - Async function to measure
 * @param metadata - Additional context to log with the metric
 * @param thresholds - Custom performance thresholds
 * @returns Promise resolving to the operation result and duration
 *
 * @example
 * ```typescript
 * const { result, duration } = await measurePerformance(
 *   'detectTextBlocks',
 *   () => instance.detectTextBlocks(session),
 *   { totalPages: 10 }
 * );
 * ```
 */
export async function measurePerformance<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>,
  thresholds?: Partial<PerformanceThresholds>,
): Promise<{ result: T; duration: number }> {
  const monitor = createPerformanceMonitor(operationName, thresholds);

  try {
    const result = await operation();
    const duration = monitor.end(metadata);
    return { result, duration };
  } catch (error) {
    const duration = monitor.end({ ...metadata, error: true });
    throw error;
  }
}

/**
 * Measure the performance of a synchronous operation
 *
 * @param operationName - Name of the operation being measured
 * @param operation - Synchronous function to measure
 * @param metadata - Additional context to log with the metric
 * @param thresholds - Custom performance thresholds
 * @returns The operation result and duration
 *
 * @example
 * ```typescript
 * const { result, duration } = measurePerformanceSync(
 *   'parseTextBlocks',
 *   () => parseTextBlocks(rawData),
 *   { blockCount: 25 }
 * );
 * ```
 */
export function measurePerformanceSync<T>(
  operationName: string,
  operation: () => T,
  metadata?: Record<string, unknown>,
  thresholds?: Partial<PerformanceThresholds>,
): { result: T; duration: number } {
  const monitor = createPerformanceMonitor(operationName, thresholds);

  try {
    const result = operation();
    const duration = monitor.end(metadata);
    return { result, duration };
  } catch (error) {
    const duration = monitor.end({ ...metadata, error: true });
    throw error;
  }
}

/**
 * Batch multiple performance metrics for analysis
 * Useful for tracking aggregate performance over multiple operations
 */
export class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics: number;

  constructor(maxMetrics = 100) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Add a metric to the tracker
   */
  add(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get all metrics for a specific operation
   */
  getMetricsForOperation(operationName: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.operation === operationName);
  }

  /**
   * Calculate average duration for an operation
   */
  getAverageDuration(operationName: string): number {
    const operationMetrics = this.getMetricsForOperation(operationName);
    if (operationMetrics.length === 0) return 0;

    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  /**
   * Get the slowest operation
   */
  getSlowestOperation(): PerformanceMetric | null {
    if (this.metrics.length === 0) return null;

    return this.metrics.reduce((slowest, current) =>
      current.duration > slowest.duration ? current : slowest,
    );
  }

  /**
   * Clear all stored metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalOperations: number;
    uniqueOperations: number;
    averageDuration: number;
    slowest: PerformanceMetric | null;
  } {
    const uniqueOperations = new Set(this.metrics.map((m) => m.operation)).size;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration =
      this.metrics.length > 0 ? totalDuration / this.metrics.length : 0;

    return {
      totalOperations: this.metrics.length,
      uniqueOperations,
      averageDuration,
      slowest: this.getSlowestOperation(),
    };
  }
}

/**
 * Global performance tracker instance
 * Use this to track performance across the application
 */
export const globalPerformanceTracker = new PerformanceTracker();
