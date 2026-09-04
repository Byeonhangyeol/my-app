-- 대시보드 시연용 데모 데이터. 모든 device_id는 'demo-' 접두사로 통일해서 나중에
-- `delete from responses where device_id like 'demo-%'` 식으로 쉽게 찾아 지울 수 있게 했다.
-- 실행: npx supabase@latest db query --linked --file supabase/seed_demo_2026-09-01.sql
do $$
declare
  v_cohort_3m uuid := 'ef50665b-2f45-48a9-8d8e-4b52c5d0b2a0'; -- 2026-06-01 입사, 3개월차, 기존 기수
  v_cohort_sp uuid;
  v_resp_alert1 uuid;
  v_resp_alert2 uuid;
begin
  -- 아직 없는 Stay Point(1년 경과) 데모 기수를 하나 만든다.
  insert into cohorts (cohort_month, milestone, link_token, status)
  values ('2025-06-01', 'stay_point', 'demo-stay-point-link', 'sent')
  returning id into v_cohort_sp;

  -- 3개월 기수에 Stay Menu 응답 2건 추가 (참여자 수 증가 확인용)
  insert into responses (cohort_id, device_id, step, answer_text, disclosure_level, disclosed_department)
  values
    (v_cohort_3m, 'demo-4', 'flight_risk', '예', 'anonymous', null),
    (v_cohort_3m, 'demo-4', 'friction_map', '휴식 — 쉬는 시간이 거의 없어요', 'department', '내과병동'),
    (v_cohort_3m, 'demo-4', 'stay_menu', '나이트 전 휴게시간이 조금만 더 늘어나면 좋겠어요.', 'department', '내과병동'),
    (v_cohort_3m, 'demo-5', 'flight_risk', '아니오', 'anonymous', null),
    (v_cohort_3m, 'demo-5', 'friction_map', '교육 — 프리셉터 교육이 부족하다고 느껴요', 'anonymous', null),
    (v_cohort_3m, 'demo-5', 'stay_menu', '실수해도 괜찮다는 말을 좀 더 들었으면 해요.', 'anonymous', null);

  -- 위급 신호 데모 1건 (동의 안 함 → 익명으로만 전달되는 경우)
  insert into responses (cohort_id, device_id, step, answer_text, disclosure_level)
  values (v_cohort_3m, 'demo-6', 'friction_map', '관계 — 요즘 너무 힘들어서 다 그만두고 싶다는 생각이 자꾸 들어요', 'anonymous')
  returning id into v_resp_alert1;

  insert into emergency_alerts (response_id, cohort_id, device_id, consented, disclosed_name, reasoning, acknowledged)
  values (v_resp_alert1, v_cohort_3m, 'demo-6', false, null, '반복적인 무기력감과 극단적 표현이 감지되어 확인이 필요합니다. (데모 데이터)', false);

  -- 위급 신호 데모 2건 (동의함 → 이름과 함께 전달되는 경우)
  insert into responses (cohort_id, device_id, step, answer_text, disclosure_level, disclosed_name)
  values (v_cohort_3m, 'demo-7', 'friction_map', '업무량 — 콜이 너무 몰려서 숨 돌릴 틈이 없어요', 'name', '김민지')
  returning id into v_resp_alert2;

  insert into emergency_alerts (response_id, cohort_id, device_id, consented, disclosed_name, reasoning, acknowledged)
  values (v_resp_alert2, v_cohort_3m, 'demo-7', true, '김민지', '본인이 힘든 상황을 구체적으로 밝히며 도움을 요청해 확인이 필요합니다. (데모 데이터)', false);

  -- Stay Point 데모 응답 3건 ("선배 한마디" 큐레이션 테스트용, 하나는 다듬은 문구까지 채워둠)
  insert into responses (cohort_id, device_id, step, answer_text, advice_text, disclosure_level, disclosed_department)
  values
    (v_cohort_sp, 'demo-8', 'stay_point', '처음엔 매일 울면서 퇴근했는데, 같은 연차 동기들이랑 단톡방에서 하소연하면서 버텼어요.', null, 'anonymous', null),
    (v_cohort_sp, 'demo-9', 'stay_point', '사수 선생님이 힘들 때마다 괜찮다고, 너만 그런거 아니라고 말해준 게 진짜 힘이 됐어요.', '힘들 때 나만 그런 게 아니라는 걸 알게 해준 선배의 한마디가 큰 힘이 됐어요.', 'department', '외과병동'),
    (v_cohort_sp, 'demo-10', 'stay_point', '월급날마다 나한테 작은 선물을 사주면서 버텼어요. 소소하지만 그게 낙이었어요.', null, 'anonymous', null);
end $$;
