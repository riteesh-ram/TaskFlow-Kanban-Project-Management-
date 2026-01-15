import React from 'react';

interface AsyncBoundaryProps {
  loading: boolean;
  error?: string | null;
  fallback?: React.ReactNode;
  errorFallback?: (message: string) => React.ReactNode;
  children: React.ReactNode;
}

// Simple async boundary to reuse across pages and organisms.
export const AsyncBoundary: React.FC<AsyncBoundaryProps> = ({
  loading,
  error,
  fallback = <div className="p-6 text-center text-muted-foreground">Loading...</div>,
  errorFallback,
  children,
}) => {
  if (loading) return <>{fallback}</>;
  if (error) {
    if (errorFallback) return <>{errorFallback(error)}</>;
    return (
      <div className="p-6 text-center text-destructive">
        <p className="font-semibold">Something went wrong</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }
  return <>{children}</>;
};
