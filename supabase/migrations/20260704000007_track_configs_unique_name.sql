ALTER TABLE track_configs
  ADD CONSTRAINT track_configs_user_track_name_unique UNIQUE (user_id, track_id, name);
