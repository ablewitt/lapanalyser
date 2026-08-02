-- Optional, free-form per-session metadata (vehicle, engine, suspension, notes).
-- JSONB keeps the shape flexible as the fields evolve; existing table GRANTs and
-- RLS policies cover the new column automatically.
ALTER TABLE sessions ADD COLUMN metadata JSONB;
