-- 마찰 지도 서술 답변에서 위급 신호(자·타해 등)가 감지됐을 때의 판단 근거와
-- 자기공개 동의 결과를 저장한다. 행정간호사 화면에 실제로 띄우는 알림 연동은
-- 16번 작업에서 이어서 만든다 — acknowledged는 그때 "확인함" 처리에 쓴다.
create table if not exists emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id),
  cohort_id uuid not null references cohorts(id),
  device_id text not null,
  consented boolean not null, -- 신원과 함께 알리는 것에 동의했는지
  disclosed_name text, -- 동의한 경우 본인이 알려준 이름
  reasoning text, -- AI가 위급 신호로 판단한 근거
  acknowledged boolean not null default false, -- 행정간호사가 확인했는지 (16번 작업에서 사용)
  created_at timestamptz not null default now()
);

create index if not exists emergency_alerts_cohort_id_idx on emergency_alerts(cohort_id);
