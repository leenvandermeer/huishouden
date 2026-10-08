CREATE TABLE IF NOT EXISTS user_ui_preferences (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  transaction_columns jsonb NOT NULL DEFAULT '["account","counterAccount","status","correction"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
