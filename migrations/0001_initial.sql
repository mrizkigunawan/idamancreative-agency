PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" integer NOT NULL DEFAULT 0,
  "image" text,
  "createdAt" integer NOT NULL,
  "updatedAt" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expiresAt" integer NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" integer NOT NULL,
  "updatedAt" integer NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" integer,
  "refreshTokenExpiresAt" integer,
  "scope" text,
  "password" text,
  "createdAt" integer NOT NULL,
  "updatedAt" integer NOT NULL
);
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" integer NOT NULL,
  "createdAt" integer,
  "updatedAt" integer
);
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
CREATE TABLE IF NOT EXISTS "rateLimit" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL,
  "lastRequest" integer NOT NULL
);
CREATE TRIGGER IF NOT EXISTS "single_admin_only" BEFORE INSERT ON "user"
WHEN (SELECT COUNT(*) FROM "user") >= 1
BEGIN
  SELECT RAISE(ABORT, 'single admin account already exists');
END;

CREATE TABLE IF NOT EXISTS "brands" (
  "id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "industry" text NOT NULL DEFAULT '',
  "owner" text NOT NULL DEFAULT '', "phone" text NOT NULL DEFAULT '', "handle" text NOT NULL DEFAULT '',
  "retainer" integer NOT NULL DEFAULT 0, "color" text NOT NULL DEFAULT '#ef783c', "address" text NOT NULL DEFAULT '',
  "notes" text NOT NULL DEFAULT '', "sow_reels" integer NOT NULL DEFAULT 0, "sow_feed" integer NOT NULL DEFAULT 0,
  "sow_story" integer NOT NULL DEFAULT 0, "sow_visit" integer NOT NULL DEFAULT 0, "created_at" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "contents" (
  "id" text PRIMARY KEY NOT NULL, "brand_id" text NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "title" text NOT NULL, "format" text NOT NULL, "date" text NOT NULL, "status" text NOT NULL DEFAULT 'Ideation',
  "platforms" text NOT NULL DEFAULT '[]', "inspo" text NOT NULL DEFAULT '', "hook" text NOT NULL DEFAULT '', "brief" text NOT NULL DEFAULT '',
  "caption" text NOT NULL DEFAULT '', "views" integer NOT NULL DEFAULT 0, "likes" integer NOT NULL DEFAULT 0,
  "comments" integer NOT NULL DEFAULT 0, "shares" integer NOT NULL DEFAULT 0, "saves" integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "contents_date_idx" ON "contents" ("date");
CREATE INDEX IF NOT EXISTS "contents_brand_idx" ON "contents" ("brand_id");
CREATE TABLE IF NOT EXISTS "visits" (
  "id" text PRIMARY KEY NOT NULL, "brand_id" text NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "date" text NOT NULL, "time" text NOT NULL DEFAULT '09:00', "location" text NOT NULL DEFAULT '', "notes" text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "visits_date_idx" ON "visits" ("date");
CREATE TABLE IF NOT EXISTS "prospects" (
  "id" text PRIMARY KEY NOT NULL, "brand_name" text NOT NULL, "pic_name" text NOT NULL DEFAULT '', "contact" text NOT NULL DEFAULT '',
  "estimated_value" integer NOT NULL DEFAULT 0, "status" text NOT NULL DEFAULT 'Prospek', "sow" text NOT NULL DEFAULT '', "notes" text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" text PRIMARY KEY NOT NULL, "type" text NOT NULL, "title" text NOT NULL, "category" text NOT NULL,
  "amount" integer NOT NULL, "date" text NOT NULL, "status" text NOT NULL DEFAULT 'Lunas', "notes" text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "transactions_date_idx" ON "transactions" ("date");
