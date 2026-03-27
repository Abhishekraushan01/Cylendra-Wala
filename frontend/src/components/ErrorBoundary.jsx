import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Frontend runtime error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "24px", fontFamily: "Segoe UI, sans-serif" }}>
          <h1>App crashed while rendering</h1>
          <p>Please refresh once. If this stays visible, share the message below.</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error?.message || "Unknown runtime error"}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
