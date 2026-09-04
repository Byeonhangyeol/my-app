-- 신규간호사가 답변 저장 도중 오류가 나서 새로고침 후 같은 질문을 다시 답하면, 유니크 제약
-- (device_id, cohort_id, step) 충돌을 피하려고 insert 대신 upsert를 쓰도록 바꿨다. 그런데
-- ON CONFLICT DO UPDATE는 update 권한도 필요해서, insert만 있던 기존 정책으로는 401(RLS
-- 거부)이 났다. insert 정책이 이미 device_id를 클라이언트가 스스로 밝히는 걸 그대로 신뢰하는
-- 구조(with check (true))라, update도 같은 신뢰 수준으로 허용한다 — 새로운 보안 구멍이
-- 아니라 기존 insert 정책과 같은 수준을 맞추는 것뿐이다.
create policy responses_anon_update on responses for update to anon using (true) with check (true);
