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
        <main className="min-h-screen bg-[var(--c-navy)] px-4 py-10">
          <section className="mx-auto max-w-2xl rounded-[20px] border border-[color:rgba(226,75,74,0.28)] bg-[var(--c-navy2)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <h1 className="text-xl font-bold text-[#f0b3b3]">App failed to load</h1>
            <p className="mt-2 text-sm text-[var(--c-text2)]">
              A runtime error occurred in the UI. Refresh the page, and if it persists share this message.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-navy)] p-3 text-xs text-[var(--c-text)]">
              {this.state.message}
            </pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
