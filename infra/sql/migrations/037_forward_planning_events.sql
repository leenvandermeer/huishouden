CREATE TABLE IF NOT EXISTS planned_cash_events (
  id text PRIMARY KEY,
  label text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  direction text NOT NULL CHECK (direction IN ('income', 'expense')),
  due_on date NOT NULL,
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forecast_event_skips (
  id text PRIMARY KEY,
  event_key text NOT NULL UNIQUE,
  label text NOT NULL,
  occurrence_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planned_cash_events_due_on ON planned_cash_events(due_on);
CREATE INDEX IF NOT EXISTS idx_forecast_event_skips_date ON forecast_event_skips(occurrence_date);
