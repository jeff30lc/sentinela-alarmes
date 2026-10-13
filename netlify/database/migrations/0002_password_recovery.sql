CREATE TABLE user_recovery (
 user_id text PRIMARY KEY REFERENCES users(id),
 email text UNIQUE,
 token_hash text UNIQUE,
 expires_at text,
 claim_id text,
 version integer NOT NULL DEFAULT 0
);
