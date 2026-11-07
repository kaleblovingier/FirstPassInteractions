import { Component, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Catches a crash inside one desk view (a station, the atlas, a lazy chunk that failed to
 * download after a deploy or while offline) so the header, the tray and the way back stay on
 * screen. Without it the router's page-level error replaced the whole desk.
 * `resetKey` is the current view: switching views clears the error.
 */
export class ViewBoundary extends Component<
  { resetKey: string; onHome: () => void; atHome?: boolean; children: ReactNode },
  { failed: boolean; resetKey: string }
> {
  state = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: { resetKey: string },
    state: { failed: boolean; resetKey: string },
  ) {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <ViewFailed onHome={this.props.atHome ? undefined : this.props.onHome} />;
  }
}

/** `onHome` is left out when the desk itself failed, since going "back" would land here again. */
export function ViewFailed({ onHome }: { onHome?: () => void }) {
  return (
    <section
      role="alert"
      data-testid="view-failed"
      className="mx-auto max-w-lg rounded-xl bg-surface px-5 py-6 text-center shadow-[var(--shadow-border)]"
    >
      <TriangleAlert className="mx-auto size-6 text-danger" aria-hidden="true" />
      <h1 className="mt-2 font-serif text-xl tracking-tight text-fg">This view did not load</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Your desk and tray are saved on this browser. If you are offline or the site was just
        updated, reloading usually fixes it.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button onClick={() => window.location.reload()}>Reload the page</Button>
        {onHome ? (
          <Button variant="secondary" onClick={onHome}>
            Back to the desk
          </Button>
        ) : null}
      </div>
    </section>
  );
}
