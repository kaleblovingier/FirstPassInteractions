import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ViewBoundary, ViewFailed } from "./view-boundary";

describe("ViewBoundary", () => {
  it("renders its view when nothing failed", () => {
    const html = renderToStaticMarkup(
      <ViewBoundary resetKey="atlas" onHome={() => {}}>
        <p>atlas</p>
      </ViewBoundary>,
    );
    assert.equal(html, "<p>atlas</p>");
  });

  it("marks a failure, and clears it when the view changes", () => {
    assert.deepEqual(ViewBoundary.getDerivedStateFromError(), { failed: true });
    assert.equal(ViewBoundary.getDerivedStateFromProps({ resetKey: "atlas" }, { failed: true, resetKey: "atlas" }), null);
    assert.deepEqual(ViewBoundary.getDerivedStateFromProps({ resetKey: "desk" }, { failed: true, resetKey: "atlas" }), {
      failed: false,
      resetKey: "desk",
    });
  });

  it("says what happened and offers a reload and the way back", () => {
    const html = renderToStaticMarkup(<ViewFailed onHome={() => {}} />);
    assert.match(html, /role="alert"/);
    assert.match(html, /<h1[^>]*>This view did not load<\/h1>/);
    assert.match(html, />Reload the page</);
    assert.match(html, />Back to the desk</);
    assert.doesNotMatch(html, /—/);
  });

  it("drops the way back when the desk itself failed", () => {
    const html = renderToStaticMarkup(<ViewFailed />);
    assert.doesNotMatch(html, /Back to the desk/);
  });
});
