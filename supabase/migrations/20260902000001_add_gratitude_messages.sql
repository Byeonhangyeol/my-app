-- 1년 근속(Stay Point) 축하 선물상자 카드에서 무작위로 보여줄 감사 문구 모음.
-- 행정간호사가 /admin/publish에서 추가·수정·삭제할 수 있고, 신규간호사 쪽(anon)은 읽기만 한다.
create table if not exists gratitude_messages (
  id uuid primary key default gen_random_uuid(),
  message_text text not null,
  created_at timestamptz not null default now()
);

alter table gratitude_messages enable row level security;

create policy gratitude_messages_anon_select on gratitude_messages for select to anon using (true);
create policy gratitude_messages_admin_all on gratitude_messages for all to authenticated using (true) with check (true);

insert into gratitude_messages (message_text) values
  ('처음이라 더 어려웠을 텐데, 1년을 잘 걸어와 주셔서 감사합니다.'),
  ('낯설었던 하루들이 쌓여 어느덧 1년이 되었습니다. 함께해 주셔서 감사합니다.'),
  ('쉽지 않은 첫 1년을 함께해 주셔서 진심으로 감사합니다.'),
  ('지난 1년, 묵묵히 자신의 자리를 지켜주셔서 감사합니다.'),
  ('서툴렀던 시작부터 지금까지, 꾸준히 성장해 주셔서 감사합니다.'),
  ('환자 곁을 지켜온 지난 365일에 감사드립니다.'),
  ('힘든 순간에도 한 걸음씩 나아가 주셔서 감사합니다.'),
  ('처음의 긴장과 걱정을 견디고 여기까지 와주셔서 감사합니다.'),
  ('당신의 첫 1년을 우리와 함께해 주셔서 감사합니다.'),
  ('지난 1년 동안 보여준 노력과 성장을 기억하겠습니다.'),
  ('어느새 ''신규''라는 이름보다 ''간호사''라는 이름이 더 잘 어울리는 시간이 되었습니다.'),
  ('처음보다 단단해진 당신의 1년을 응원합니다.'),
  ('매일 조금씩 성장해 온 당신의 시간을 축하합니다.'),
  ('완벽하지 않아도 괜찮습니다. 지난 1년 동안 충분히 잘해왔습니다.'),
  ('당신이 견뎌낸 하루하루가 우리 병원의 소중한 1년이 되었습니다.'),
  ('당신의 첫 1년이 우리에게도 참 고마운 시간이었습니다.'),
  ('365일 전의 당신보다 훨씬 단단해진 지금을 축하합니다.'),
  ('수많은 처음을 지나 이제는 누군가에게 든든한 동료가 되어주셔서 감사합니다.'),
  ('당신이 있어 지난 1년이 더 든든했습니다.'),
  ('첫 1년을 잘 마친 당신에게 박수를 보냅니다.'),
  ('잘 버텨줘서 고맙습니다. 그리고 함께해줘서 더 고맙습니다.'),
  ('당신이 버틴 365일은 결코 당연하지 않았습니다.'),
  ('오늘까지 와준 것만으로도 충분히 고맙습니다.'),
  ('처음의 당신에게 지금의 당신을 보여줄 수 있다면, 분명 많이 자랑스러워할 겁니다.');
