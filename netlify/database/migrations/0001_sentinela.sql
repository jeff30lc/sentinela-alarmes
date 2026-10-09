CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin','operator','vigilance')),
  password text NOT NULL,
  active integer NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at text NOT NULL
);
CREATE TABLE stations (
  code text PRIMARY KEY,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown','active','inactive','pending_active','pending_inactive')),
  version integer NOT NULL DEFAULT 0,
  last_request text,
  updated_at text
);
CREATE TABLE requests (
  id text PRIMARY KEY,
  station_code text NOT NULL REFERENCES stations(code),
  target text NOT NULL CHECK (target IN ('active','inactive')),
  requested_by text NOT NULL REFERENCES users(id),
  requester_name text NOT NULL,
  requested_at text NOT NULL,
  confirmed_by text REFERENCES users(id),
  confirmer_name text,
  confirmed_at text,
  note text NOT NULL DEFAULT ''
);
CREATE TABLE sessions (
  token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  expires_at text NOT NULL
);
CREATE TABLE settings (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE events (
  id text PRIMARY KEY, station_code text,
  actor_id text NOT NULL, actor_name text NOT NULL,
  type text NOT NULL, detail text NOT NULL, created_at text NOT NULL
);
CREATE TABLE login_attempts (key text PRIMARY KEY, count integer NOT NULL, since text NOT NULL);
CREATE INDEX events_created_at_idx ON events(created_at DESC);
CREATE INDEX events_station_created_idx ON events(station_code,created_at DESC);
CREATE INDEX requests_station_requested_idx ON requests(station_code,requested_at DESC);
CREATE INDEX requests_pending_idx ON requests(requested_at) WHERE confirmed_at IS NULL;
CREATE INDEX sessions_expires_idx ON sessions(expires_at);
