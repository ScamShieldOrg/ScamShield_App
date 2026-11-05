-- Report decisions are stored on reports.status and in moderation_actions.
-- Evidence has no independent moderation lifecycle.
BEGIN;
ALTER TABLE report_evidence DROP COLUMN IF EXISTS verification_status;
COMMIT;
