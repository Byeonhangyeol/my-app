-- 명단(nurses)에 담긴 개인정보(이름·전화번호)가 anon key만으로 그대로 노출되지 않도록
-- 4개 테이블 전체에 RLS(Row Level Security)를 켠다.
-- 신규간호사(anon)는 로그인이 없으므로, 대화 흐름에 꼭 필요한 최소 권한만 내준다.
alter table nurses enable row level security;
alter table cohorts enable row level security;
alter table responses enable row level security;
alter table emergency_alerts enable row level security;

-- 명단: 행정간호사(authenticated)만 전체 권한. anon은 아예 접근 불가.
create policy nurses_admin_all on nurses for all to authenticated using (true) with check (true);

-- 기수: 행정간호사만 관리(생성·발송 상태 변경). anon에게 테이블 전체 SELECT를 열어주면
-- 다른 기수의 링크 토큰까지 한꺼번에 조회할 수 있게 되므로, anon은 테이블에 직접 접근하지 못하게
-- 막고 아래 get_cohort_by_token() 함수(SECURITY DEFINER)로 자기 링크 하나만 확인하게 한다.
create policy cohorts_admin_all on cohorts for all to authenticated using (true) with check (true);

create or replace function get_cohort_by_token(token text)
returns table (id uuid, cohort_month date, milestone text, link_token text, status text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select id, cohort_month, milestone, link_token, status, created_at
  from cohorts
  where link_token = token
  limit 1;
$$;

grant execute on function get_cohort_by_token(text) to anon, authenticated;

-- 응답: 신규간호사(anon)는 새 답변만 남길 수 있고 수정·조회는 못 한다. 행정간호사는 전체 열람.
create policy responses_anon_insert on responses for insert to anon with check (true);
create policy responses_admin_all on responses for all to authenticated using (true) with check (true);

-- 위급 신호 알림: 신규간호사(anon)는 생성만, 행정간호사는 확인(acknowledged) 처리를 포함해 전체 권한.
create policy emergency_alerts_anon_insert on emergency_alerts for insert to anon with check (true);
create policy emergency_alerts_admin_all on emergency_alerts for all to authenticated using (true) with check (true);
