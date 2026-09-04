-- 대화 끝에서 한 번만 "공개하고 전달할게요"를 고른 경우, 이미 저장된 이 세션의 답변들
-- (flight_risk·friction_map·stay_menu)의 공개 수준을 한꺼번에 올린다. anon 클라이언트는
-- responses를 직접 UPDATE할 권한이 없으므로(RLS: anon은 insert만 가능), SECURITY DEFINER
-- 함수로 device_id·cohort_id가 일치하는 행만 정확히 업데이트하게 좁혀서 내준다.
-- (사용자 요청: 답변마다 매번 공개 의향을 묻지 않고, 대화 끝에서 한 번만 확인하도록 변경)
create or replace function escalate_disclosure(
  p_device_id text,
  p_cohort_id uuid,
  p_name text,
  p_department text
)
returns void
language sql
security definer
set search_path = public
as $$
  update responses
  set disclosure_level = 'name',
      disclosed_name = p_name,
      disclosed_department = coalesce(p_department, disclosed_department)
  where device_id = p_device_id
    and cohort_id = p_cohort_id
    and disclosure_level <> 'name';
$$;

grant execute on function escalate_disclosure(text, uuid, text, text) to anon, authenticated;
