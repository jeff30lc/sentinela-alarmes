CREATE TABLE IF NOT EXISTS users (
  id varchar(64) PRIMARY KEY,
  name varchar(100) NOT NULL,
  username varchar(50) NOT NULL UNIQUE,
  role varchar(20) NOT NULL CHECK (role IN ('admin','operator','vigilance')),
  password varchar(200) NOT NULL,
  active integer NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at varchar(24) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS stations (
  code varchar(20) PRIMARY KEY,
  name varchar(200) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown','active','inactive','pending_active','pending_inactive')),
  version integer NOT NULL DEFAULT 0,
  last_request varchar(100),
  updated_at varchar(24)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS requests (
  id varchar(100) PRIMARY KEY,
  station_code varchar(20) NOT NULL,
  target varchar(10) NOT NULL CHECK (target IN ('active','inactive')),
  requested_by varchar(64) NOT NULL,
  requester_name varchar(100) NOT NULL,
  requested_at varchar(24) NOT NULL,
  confirmed_by varchar(64),
  confirmer_name varchar(100),
  confirmed_at varchar(24),
  note varchar(500) NOT NULL DEFAULT '',
  FOREIGN KEY (station_code) REFERENCES stations(code),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (confirmed_by) REFERENCES users(id),
  INDEX requests_station_requested_idx (station_code,requested_at),
  INDEX requests_pending_idx (confirmed_at,requested_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sessions (
  token varchar(64) PRIMARY KEY,
  user_id varchar(64) NOT NULL,
  expires_at varchar(24) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX sessions_expires_idx (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS settings (`key` varchar(100) PRIMARY KEY, value text NOT NULL) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS events (
  id varchar(100) PRIMARY KEY,
  station_code varchar(20),
  actor_id varchar(64) NOT NULL,
  actor_name varchar(100) NOT NULL,
  type varchar(30) NOT NULL,
  detail text NOT NULL,
  created_at varchar(24) NOT NULL,
  INDEX events_created_at_idx (created_at),
  INDEX events_station_created_idx (station_code,created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS login_attempts (
  `key` varchar(64) PRIMARY KEY, count integer NOT NULL, since varchar(24) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_recovery (
 user_id varchar(64) PRIMARY KEY,
 email varchar(255) UNIQUE,
 token_hash varchar(64) UNIQUE,
 expires_at varchar(24),
 claim_id varchar(64),
 version integer NOT NULL DEFAULT 0,
 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
