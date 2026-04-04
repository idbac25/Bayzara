-- Migration 007: Store encrypted merchant credentials for automatic session renewal.
-- When the EVC session expires the sync can re-authenticate without user action.

ALTER TABLE evc_connections
  ADD COLUMN IF NOT EXISTS credentials_encrypted TEXT;  -- AES-GCM encrypted password, base64

COMMENT ON COLUMN evc_connections.credentials_encrypted
  IS 'AES-GCM encrypted merchant password. Decrypted server-side using EVC_CREDENTIALS_SECRET env var.';
