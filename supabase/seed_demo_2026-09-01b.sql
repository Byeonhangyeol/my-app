-- 대시보드의 6개월·9개월 탭도 비어 보이지 않도록 데모 기수·응답을 추가한다.
-- 모든 device_id는 'demo-' 접두사, 모든 데모 기수의 link_token도 'demo-' 접두사로 통일해서
-- supabase/cleanup_demo_data.sql 한 번으로 전부 지울 수 있게 했다.
-- 실행: npx supabase@latest db query --linked --file supabase/seed_demo_2026-09-01b.sql
do $$
declare
  v_cohort_6m uuid;
  v_cohort_9m uuid;
begin
  insert into cohorts (cohort_month, milestone, link_token, status)
  values ('2026-03-01', '6m', 'demo-6m-link', 'sent')
  returning id into v_cohort_6m;

  insert into cohorts (cohort_month, milestone, link_token, status)
  values ('2025-12-01', '9m', 'demo-9m-link', 'sent')
  returning id into v_cohort_9m;

  insert into responses (cohort_id, device_id, step, answer_text, disclosure_level, disclosed_department)
  values
    (v_cohort_6m, 'demo-11', 'flight_risk', '예', 'anonymous', null),
    (v_cohort_6m, 'demo-11', 'friction_map', '업무강도 — 신규 티가 나서 그런지 일이 계속 몰려요', 'anonymous', null),
    (v_cohort_6m, 'demo-11', 'stay_menu', '나이트 다음날 하루는 꼭 쉬게 해주면 좋겠어요.', 'anonymous', null),
    (v_cohort_6m, 'demo-12', 'flight_risk', '아니오', 'anonymous', null),
    (v_cohort_6m, 'demo-12', 'friction_map', '교대근무', 'department', '외과병동'),
    (v_cohort_6m, 'demo-12', 'stay_menu', '조금씩 적응되는 것 같아서 버틸만해요.', 'department', '외과병동'),
    (v_cohort_9m, 'demo-13', 'flight_risk', '아니오', 'anonymous', null),
    (v_cohort_9m, 'demo-13', 'friction_map', '대인관계 — 선배들 눈치 보는 게 아직도 힘들어요', 'anonymous', null),
    (v_cohort_9m, 'demo-13', 'stay_menu', '이제 후배도 들어와서 마음이 좀 편해졌어요.', 'anonymous', null),
    (v_cohort_9m, 'demo-14', 'flight_risk', '예', 'anonymous', null),
    (v_cohort_9m, 'demo-14', 'friction_map', '본인이 부족한거 같다는 감정 — 아직도 실수할까봐 불안해요', 'anonymous', null),
    (v_cohort_9m, 'demo-14', 'stay_menu', '실수해도 같이 되짚어봐 주는 선배가 있었으면 해요.', 'anonymous', null);
end $$;
