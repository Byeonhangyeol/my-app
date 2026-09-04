-- 20260901000005에서 upsert(ON CONFLICT DO UPDATE)를 쓰려고 anon에게 UPDATE 정책을 열어줬는데,
-- 확인해보니 Postgres는 ON CONFLICT DO UPDATE에 SELECT 가시성도 함께 요구해서(충돌 여부를
-- 확인해야 하므로) 결국 anon에게 SELECT까지 열어줘야 동작한다 — 그러면 "신규간호사는 다른
-- 사람 응답을 못 읽는다"는 익명성 설계가 깨진다. 그래서 upsert 방식을 접고 대신 클라이언트가
-- "이미 저장된 경우(23505) 에러로 취급하지 않고 다음 단계로 넘어가는" 방식으로 바꿨다.
-- 더 이상 쓰지 않는 UPDATE 정책은 없애서, anon이 임의로 남의 응답을 덮어쓸 길도 남기지 않는다.
drop policy if exists responses_anon_update on responses;
