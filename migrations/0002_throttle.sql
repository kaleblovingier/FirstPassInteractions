-- Shared abuse throttles (src/lib/server/throttle-store.ts).
--
-- Used only when DATABASE_URL is set, so the reader-ask caps and the operator PIN
-- backoff hold across every serverless instance instead of one. Without a
-- database the app keeps its in-memory limits and never touches these tables.
--
-- `key` is a keyed hash (HMAC-SHA256) of the caller key, never the IP address.
-- Every row carries `expires_ms`; the store deletes expired rows as it goes, so
-- nothing here outlives its window (at most an hour today).
--
-- Times are epoch milliseconds (bigint), written by the app, so the same code
-- runs on Neon and on the PGLite preview fallback.
--
-- Additive only: two new tables, no change to any existing table. Safe to apply
-- to a database that is already serving the previous release, which never reads
-- them.

create table if not exists throttle_hits (
  bucket text not null,
  key text not null,
  at_ms bigint not null,
  expires_ms bigint not null
);

create index if not exists throttle_hits_bucket_key_at on throttle_hits (bucket, key, at_ms);
create index if not exists throttle_hits_expires on throttle_hits (expires_ms);

create table if not exists throttle_strikes (
  bucket text not null,
  key text not null,
  fails integer not null,
  last_ms bigint not null,
  expires_ms bigint not null,
  primary key (bucket, key)
);

create index if not exists throttle_strikes_expires on throttle_strikes (bucket, expires_ms);
