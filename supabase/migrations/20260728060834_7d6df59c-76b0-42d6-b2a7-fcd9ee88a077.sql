
REVOKE EXECUTE ON FUNCTION public.transition_question_state(uuid, workflow_state, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_question(uuid, uuid, timestamptz, assignment_priority, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.schedule_question(uuid, timestamptz, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.publish_due_scheduled() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_question_state(uuid, workflow_state, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_question(uuid, uuid, timestamptz, assignment_priority, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_question(uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_due_scheduled() TO service_role;
