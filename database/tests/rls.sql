-- Run with psql -v ON_ERROR_STOP=1 as an administrator on the disposable test DB.
BEGIN;
CREATE ROLE defaultstack_rls_test NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA platform TO defaultstack_rls_test;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.projects TO defaultstack_rls_test;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA platform TO defaultstack_rls_test;
SET LOCAL ROLE defaultstack_rls_test;
DO $$ BEGIN
  IF (SELECT count(*) FROM platform.projects) <> 0 THEN RAISE EXCEPTION 'Missing context leaked records'; END IF;
END $$;
SELECT set_config('app.user_id', '11111111-1111-4111-8111-111111111111', true);
INSERT INTO platform.projects(owner_id, name) VALUES ('11111111-1111-4111-8111-111111111111', 'Owner one');
DO $$ BEGIN
  BEGIN
    INSERT INTO platform.projects(owner_id, name) VALUES ('22222222-2222-4222-8222-222222222222', 'Forbidden');
    RAISE EXCEPTION 'Cross-owner insert was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF (SELECT count(*) FROM platform.projects) <> 1 THEN RAISE EXCEPTION 'Own row missing'; END IF;
END $$;
SELECT set_config('app.user_id', '22222222-2222-4222-8222-222222222222', true);
DO $$ DECLARE changed integer; BEGIN
  IF (SELECT count(*) FROM platform.projects) <> 0 THEN RAISE EXCEPTION 'Other owner leaked'; END IF;
  UPDATE platform.projects SET name='Forbidden';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN RAISE EXCEPTION 'Other owner updated'; END IF;
  DELETE FROM platform.projects;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN RAISE EXCEPTION 'Other owner deleted'; END IF;
END $$;
SELECT set_config('app.user_id', '', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM platform.projects) <> 0 THEN RAISE EXCEPTION 'Cleared context leaked'; END IF;
END $$;
ROLLBACK;
