-- Exclude accounts from import (BR59-extension)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS excluded_from_import boolean NOT NULL DEFAULT false;
