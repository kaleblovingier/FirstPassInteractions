-- Visitor analytics (src/lib/analytics/store.server.ts).
--
-- Cookieless, aggregate analytics kept in Postgres.
-- No IP addresses, user agents, cookies or drug names are ever stored.
--
-- `visitor_code` is keyed by a daily rotating salt that is deleted when its UTC day
-- ends, so codes cannot be linked across days or traced back to an IP.
--
-- Views are retained for 90 days (RETENTION_DAYS).

create table if not exists analytics_salts (
  day text primary key,
  salt text not null,
  expires_ms bigint not null
);

create index if not exists analytics_salts_expires on analytics_salts (expires_ms);

create table if not exists analytics_views (
  day text not null,
  visitor_code text not null,
  path text not null,
  referrer_host text not null default '',
  country text not null default '',
  device text not null default 'desktop',
  created_at_ms bigint not null
);

create index if not exists analytics_views_day on analytics_views (day);
create index if not exists analytics_views_path on analytics_views (path);
create index if not exists analytics_views_created on analytics_views (created_at_ms);
