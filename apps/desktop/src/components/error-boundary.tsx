import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { i18n } from "@/i18n";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("SocketLens render failure", error, errorInfo);
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section className="w-full max-w-lg rounded-lg border border-destructive/40 bg-panel p-5 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-destructive/35 bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold">{i18n.t("errorBoundary.title")}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{i18n.t("errorBoundary.description")}</p>
              <pre className="mt-4 max-h-40 overflow-auto rounded-md border border-border/70 bg-code p-3 text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                <RotateCcw className="h-4 w-4" />
                {i18n.t("errorBoundary.reload")}
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }
}
