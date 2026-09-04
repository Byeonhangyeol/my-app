-- 기수에 실제로 누가 속해 있는지(대상자 명단)를 행정간호사가 확인할 수 있게 하는 연결 테이블.
-- 신규간호사 응답 흐름(anon)에는 전혀 쓰이지 않는, 행정간호사 전용 참고용 데이터다 — 익명
-- 응답 수집이나 링크 접속 로직과는 무관하다.
create table if not exists cohort_nurses (
  cohort_id uuid not null references cohorts(id) on delete cascade,
  nurse_id uuid not null references nurses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cohort_id, nurse_id)
);

alter table cohort_nurses enable row level security;
create policy cohort_nurses_admin_all on cohort_nurses for all to authenticated using (true) with check (true);

-- 명단에서 직접 선택한 인원으로 만든 "수동" 기수인지 표시 — 입사일 기준 자동 계산 기수와
-- 화면에서 구분해서 보여주기 위함이다 (수동 기수는 cohort_month가 대표 입사월이 아니라
-- 생성한 날짜라서 라벨을 다르게 보여줘야 한다).
alter table cohorts add column if not exists is_manual boolean not null default false;
