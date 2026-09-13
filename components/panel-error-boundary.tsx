"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  /** Short panel name used in the fallback heading (e.g. "Bao-18"). */
  name: string;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Isolates optional Research-tab panels so a render/parse failure in one
 * artifact panel cannot blank the rest of the app (§24 error boundaries).
 *
 * Fetch failures are already handled inside each panel via `.catch(() => null)`;
 * this boundary covers the remaining class: unexpected throw during render
 * (corrupt JSON that passes a weak check, null-deref after a schema drift, etc.).
 */
export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      JSON.stringify({
        level: "error",
        event: "ui.panel_error_boundary",
        panel: this.props.name,
        message: error.message,
        componentStack: info.componentStack?.slice(0, 500) ?? null,
      }),
    );
  }

  render() {
    if (this.state.error) {
      return (
        <section
          className="analysis-card panel-error-fallback"
          role="alert"
          aria-labelledby={`panel-error-${slug(this.props.name)}`}
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Panel lỗi cục bộ</p>
              <h2 id={`panel-error-${slug(this.props.name)}`}>
                Không hiển thị được {this.props.name}
              </h2>
            </div>
            <AlertTriangle aria-hidden="true" />
          </div>
          <p>
            Phần còn lại của ứng dụng vẫn hoạt động. Lỗi này thường đến từ một
            artifact tùy chọn bị thiếu hoặc hỏng — không phải lỗi toàn trang.
          </p>
          <p className="panel-error-detail">
            <code>{this.state.error.message}</code>
          </p>
          <button
            type="button"
            className="panel-error-retry"
            onClick={() => this.setState({ error: null })}
          >
            Thử render lại panel
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "panel";
}
