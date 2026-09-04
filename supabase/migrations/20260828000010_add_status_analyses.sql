-- 신규간호사 응답 전반에 대한 AI 분석 결과(감정·적응도·위험도·키워드·요약)를 담아
-- 통계 대시보드에서 참고할 수 있게 저장한다. 아직 이 테이블에 쓰는 기능은 구현되지 않았고,
-- 스키마만 앞서 마련되어 있던 상태다.
create table if not exists status_analyses (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id),
  device_id text not null,
  sentiment text,
  adaptation_level text,
  risk_level text,
  keywords text[] not null default '{}',
  summary_message text,
  created_at timestamptz not null default now()
);

alter table status_analyses enable row level security;

create policy status_analyses_anon_insert on status_analyses for insert to anon with check (true);
create policy status_analyses_admin_all on status_analyses for all to authenticated using (true) with check (true);
