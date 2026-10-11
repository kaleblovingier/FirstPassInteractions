import test from "node:test";
import assert from "node:assert/strict";
import { duePhrase, isDue, normalizeStudyMarks, scheduleStudyMark } from "./study-marks.ts";
import { pileOf, type StudyCard } from "./study.ts";

const DAY = 86_400_000;

function card(id: string): StudyCard {
  return {
    id,
    lane: "drill",
    kicker: "",
    title: id,
    prompt: "",
    ask: "",
    answer: "",
    drugIds: [],
  };
}

test("got it steps 1, 3, 7, then 21 days", () => {
  const now = 1_700_000_000_000;
  let mark = scheduleStudyMark(undefined, "got", now);
  assert.equal(mark.streak, 1);
  assert.equal(mark.nextReview, now + DAY);
  assert.equal(isDue(mark, now), false);
  assert.equal(duePhrase(mark, now), "due in 1 day");

  mark = scheduleStudyMark(mark, "got", now);
  assert.equal(mark.streak, 2);
  assert.equal(mark.nextReview, now + 3 * DAY);

  mark = scheduleStudyMark(mark, "got", now);
  assert.equal(mark.nextReview, now + 7 * DAY);

  mark = scheduleStudyMark(mark, "got", now);
  assert.equal(mark.streak, 4);
  assert.equal(mark.nextReview, now + 21 * DAY);

  mark = scheduleStudyMark(mark, "got", now);
  assert.equal(mark.streak, 5);
  assert.equal(mark.nextReview, now + 21 * DAY);
});

test("a miss is due immediately and clears the streak", () => {
  const now = 1_700_000_000_000;
  const got = scheduleStudyMark(scheduleStudyMark(undefined, "got", now), "got", now);
  const miss = scheduleStudyMark(got, "miss", now + 50);
  assert.deepEqual(miss, { mark: "miss", nextReview: now + 50, streak: 0 });
  assert.equal(isDue(miss, now + 50), true);
  assert.equal(duePhrase(miss, now + 50), "due now");
  const again = scheduleStudyMark(miss, "got", now + 50);
  assert.equal(again.streak, 1);
});

test("legacy string marks and future misses migrate", () => {
  const now = 5_000;
  const marks = normalizeStudyMarks(
    {
      missString: "miss",
      gotString: "got",
      kept: { mark: "got", nextReview: 9, streak: 2 },
      futureMiss: { mark: "miss", nextReview: now + DAY, streak: 4 },
      junk: "nope",
    },
    now,
  );
  assert.equal(marks.missString?.nextReview, now);
  assert.equal(marks.gotString?.streak, 1);
  assert.equal(marks.gotString?.nextReview, now + DAY);
  assert.equal(marks.kept?.streak, 2);
  assert.equal(marks.kept?.nextReview, 9);
  assert.equal(marks.futureMiss?.nextReview, now);
  assert.equal(marks.futureMiss?.streak, 0);
  assert.equal(marks.junk, undefined);
});

test("the review pile is only cards that are due", () => {
  const now = 100_000;
  const cards = [card("miss"), card("fresh"), card("open")];
  const marks = {
    miss: scheduleStudyMark(undefined, "miss", now),
    fresh: scheduleStudyMark(undefined, "got", now),
  };
  assert.deepEqual(
    pileOf(cards, "miss", marks, now).map((c) => c.id),
    ["miss"],
  );
  assert.deepEqual(
    pileOf(cards, "miss", marks, now + DAY).map((c) => c.id),
    ["miss", "fresh"],
  );
  assert.deepEqual(
    pileOf(cards, "open", marks, now).map((c) => c.id),
    ["open"],
  );
  assert.equal(pileOf(cards, "all", marks, now).length, 3);
});
