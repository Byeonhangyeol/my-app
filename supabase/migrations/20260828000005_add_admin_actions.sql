-- 행정간호사가 직접 입력하는 개선 조치 기록 (공유 화이트리스트 4번 항목: "행정에서 실제로
-- 개선·조치한 결과"). 신규간호사에게도 그대로 보여줄 내용이라 anon도 조회는 가능하게 하고,
-- 작성·수정·삭제는 행정간호사만 한다.
create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_at timestamptz not null default now()
);

alter table admin_actions enable row level security;

create policy admin_actions_anon_select on admin_actions for select to anon using (true);
create policy admin_actions_admin_all on admin_actions for all to authenticated using (true) with check (true);
