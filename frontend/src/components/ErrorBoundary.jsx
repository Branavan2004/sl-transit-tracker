// Prevents blank screens by rendering a readable fallback on runtime errors.
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    // Keep a console trace for debugging in browser devtools.
    console.error("App runtime error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-slate-100 px-4 py-10">
          <section className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-red-700">App failed to load</h1>
            <p className="mt-2 text-sm text-slate-700">
              A runtime error occurred in the UI. Refresh the page, and if it persists share this message.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {this.state.message}
            </pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
