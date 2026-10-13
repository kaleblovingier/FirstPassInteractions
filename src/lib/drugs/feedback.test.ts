import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FEEDBACK_SUBJECT, feedbackBody, feedbackMailto } from "./feedback.ts";

const EMAIL = "FirstPassInteractions@gmail.com";

test("mailto goes to the canon contact with a subject and body", () => {
  const href = feedbackMailto({ email: EMAIL });
  assert.ok(href.startsWith(`mailto:${EMAIL}?`));
  const q = new URL(href.replace("mailto:", "https://x.test/")).searchParams;
  assert.equal(q.get("subject"), FEEDBACK_SUBJECT);
  assert.match(q.get("body") ?? "", /What were you trying to do\?/);
  assert.doesNotMatch(href, /\+/, "spaces must be %20 in mailto");
});

test("body carries the tray and desk link so the pair can be reopened", () => {
  const body = feedbackBody({
    names: ["Ketamine", "Grapefruit"],
    url: "https://firstpass-desk.vercel.app/?case=gf-oral-ketamine",
  });
  assert.match(body, /Tray: Ketamine \+ Grapefruit/);
  assert.match(body, /Desk link: https:\/\/firstpass-desk\.vercel\.app\/\?case=gf-oral-ketamine/);
});

test("body omits tray and link lines when there is none, and warns against PHI", () => {
  const body = feedbackBody({});
  assert.doesNotMatch(body, /Tray:|Desk link:/);
  assert.match(body, /do not include patient names/i);
  assert.match(body, /educational only and not FDA-cleared/i);
});

test("desk wires the feedback link to the operator email", async () => {
  const app = await readFile(new URL("../../components/desk/app.tsx", import.meta.url), "utf8");
  assert.match(app, /feedbackMailto\(\{\s*email: OPERATOR\.email/);
  assert.match(app, /Send feedback/);
});
