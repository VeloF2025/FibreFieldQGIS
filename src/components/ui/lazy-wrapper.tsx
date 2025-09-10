'use client';

/**
 * Lazy Loading Wrapper Component
 *
 * Provides a reusable wrapper for lazy loading components with loading states,
 * error boundaries, and performance optimizations.
 */

import React, { ComponentType, Suspense, lazy, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

/**
 * Default loading component
 */
const DefaultLoading = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
  </div>
);

/**
 * Default error component
 */
const DefaultError = ({ error, resetErrorBoundary }: { error: any; resetErrorBoundary: () => void }) => (
  <div className="flex flex-col items-center justify-center p-4 text-center">
    <div className="text-red-500 mb-2">Failed to load component</div>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    >
      Try Again
    </button>
  </div>
);

/**
 * Lazy wrapper with error boundary and loading state
 */
export function LazyWrapper({
  children,
  fallback = <DefaultLoading />,
  errorFallback
}: LazyWrapperProps) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) =>
        errorFallback || <DefaultError error={error} resetErrorBoundary={resetErrorBoundary} />
      }
    >
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Create a lazy-loaded component with wrapper
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: {
    fallback?: ReactNode;
    errorFallback?: ReactNode;
  } = {}
) {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <LazyWrapper
      fallback={options.fallback}
      errorFallback={options.errorFallback}
    >
      <LazyComponent {...props} />
    </LazyWrapper>
  );
}

/**
 * Lazy load component with intersection observer
 */
export class LazyLoadWrapper extends React.Component<
  {
    children: ReactNode;
    rootMargin?: string;
    threshold?: number;
    fallback?: ReactNode;
  },
  { isVisible: boolean }
> {
  private observer: IntersectionObserver | null = null;
  private ref: React.RefObject<HTMLDivElement | null> = React.createRef();

  state = { isVisible: false };

  componentDidMount() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      this.setState({ isVisible: true });
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.setState({ isVisible: true });
          this.observer?.disconnect();
        }
      },
      {
        rootMargin: this.props.rootMargin || '50px',
        threshold: this.props.threshold || 0.1,
      }
    );

    if (this.ref.current) {
      this.observer.observe(this.ref.current);
    }
  }

  componentWillUnmount() {
    this.observer?.disconnect();
  }

  render() {
    return (
      <div ref={this.ref}>
        {this.state.isVisible ? (
          this.props.children
        ) : (
          this.props.fallback || <DefaultLoading />
        )}
      </div>
    );
  }
}

/**
 * Preload lazy components
 */
export function preloadLazyComponent(importFunc: () => Promise<any>) {
  // Preload the component in the background
  importFunc().catch(() => {
    // Ignore preload errors
  });
}

/**
 * Lazy load with priority
 */
export function lazyWithPriority<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  priority: 'low' | 'normal' | 'high' = 'normal'
) {
  const LazyComponent = lazy(() => {
    if (priority === 'high') {
      // High priority: preload immediately
      return importFunc();
    } else if (priority === 'low') {
      // Low priority: delay loading
      return new Promise<{ default: T }>(resolve => {
        setTimeout(() => resolve(importFunc()), 100);
      });
    }
    // Normal priority: load normally
    return importFunc();
  });

  return LazyComponent;
}