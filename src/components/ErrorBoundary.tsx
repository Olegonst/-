import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from './components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                <ShieldAlert className="text-red-500" size={32} />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Application Error</h1>
              <p className="text-[#A1A1AA] text-sm">
                The application crashed during initialization. This often happens if the Firebase configuration is missing or incorrect.
              </p>
            </div>
            
            <div className="bg-[#121214] border border-white/5 p-4 rounded-lg overflow-hidden">
              <p className="text-red-400 font-mono text-xs break-all text-left">
                {this.state.error?.toString()}
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                className="w-full bg-white text-black hover:bg-white/90"
                onClick={() => window.location.reload()}
              >
                Reload Application
              </Button>
              <p className="text-[10px] text-[#A1A1AA]">
                Tip: Check your browser console for more details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
