-- Migration 006: Fix EVC connections to store correct Hormud session credentials
--
-- The original schema stored a JWT Bearer token in session_token.
-- The Hormud merchant API actually authenticates via sessionId in the request body
-- (format: "WEB;{subscriptionId};{shortToken}") plus a session cookie (_cyc).
-- This migration adds the missing columns and a comment clarifying the column usage.

ALTER TABLE evc_connections
  ADD COLUMN IF NOT EXISTS account_id TEXT,        -- Hormud accountId (e.g. 13731596) — required for activity report API
  ADD COLUMN IF NOT EXISTS session_cookie TEXT;    -- _cyc cookie value from login — required for server-side API calls

-- session_token column is repurposed: now stores the sessionId string ("WEB;...;...")
-- not the JWT Bearer token it was originally intended for.
COMMENT ON COLUMN evc_connections.session_token IS 'Hormud sessionId in format WEB;{subscriptionId};{token} — used in API request bodies';
COMMENT ON COLUMN evc_connections.account_id    IS 'Hormud numeric accountId from login — used in /api/report/activity requests';
COMMENT ON COLUMN evc_connections.session_cookie IS 'Value of _cyc session cookie from login — sent as Cookie header in server-side API calls';
