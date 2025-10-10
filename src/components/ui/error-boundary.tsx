import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log del error para debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Llamar al callback de error si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Aquí podrías enviar el error a un servicio de monitoreo
    // como Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de error por defecto
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">¡Ups! Algo salió mal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error inesperado</AlertTitle>
                <AlertDescription>
                  La aplicación encontró un error inesperado. Por favor, intenta recargar la página.
                </AlertDescription>
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                    Detalles del error (solo desarrollo)
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                    <div className="text-red-600 font-bold mb-2">
                      {this.state.error.name}: {this.state.error.message}
                    </div>
                    <pre className="whitespace-pre-wrap text-muted-foreground">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleReset} 
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                  variant="outline"
                >
                  Recargar página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente de error simplificado para secciones específicas
interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
  message?: string;
}

export function ErrorFallback({ 
  error, 
  resetError, 
  message = "Ha ocurrido un error en esta sección" 
}: ErrorFallbackProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs">Ver detalles</summary>
            <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        <Button 
          size="sm" 
          variant="outline" 
          onClick={resetError}
          className="mt-2"
        >
          <RefreshCw className="mr-2 h-3 w-3" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Hook para manejar errores en componentes funcionales
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    console.error('Error handled by useErrorHandler:', error, errorInfo);
    
    // Aquí podrías enviar el error a un servicio de monitoreo
    // logErrorToService(error, errorInfo);
    
    // Mostrar toast de error
    // toast.error(`Error: ${error.message}`);
  };
}

// HOC para envolver componentes con Error Boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}