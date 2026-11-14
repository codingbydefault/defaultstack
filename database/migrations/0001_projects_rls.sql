-- Foundation only: run on a separate test database, never on existing customer tables.
CREATE SCHEMA IF NOT EXISTS platform;
CREATE TABLE platform.projects (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_owner_id_idx ON platform.projects(owner_id);
ALTER TABLE platform.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.projects FORCE ROW LEVEL SECURITY;
CREATE POLICY projects_owner ON platform.projects
  FOR ALL
  USING (owner_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (owner_id = nullif(current_setting('app.user_id', true), '')::uuid);
-- Intentionally no GRANT to public. A later migration must grant CRUD to a
-- dedicated non-owner application role with NOSUPERUSER NOBYPASSRLS.
-- The trusted API must SET LOCAL app.user_id from a verified login inside
-- the SAME transaction as each query. Never trust an ID sent by the browser.
