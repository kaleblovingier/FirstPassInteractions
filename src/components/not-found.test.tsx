import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NotFoundView } from "./not-found";

const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

describe("NotFoundView", () => {
  it("has a page heading and the ways back in", () => {
    const html = renderToStaticMarkup(<NotFoundView />);
    assert.match(html, /<h1[^>]*>That page doesn(&#x27;|')t exist<\/h1>/);
    assert.deepEqual(hrefs(html), ["/", "/pairs", "/enzymes"]);
  });

  it("names the kind of page and lists its index once", () => {
    const html = renderToStaticMarkup(
      <NotFoundView what="enzyme page" back={{ href: "/enzymes", label: "Enzyme pages" }} />,
    );
    assert.match(html, /That enzyme page doesn/);
    assert.deepEqual(hrefs(html), ["/", "/enzymes", "/pairs"]);
  });
});
