-- 대화 끝 FinalDisclosureStep에서 "도움을 받아보고 싶어요"를 직접 고른 경우에도
-- emergency_alerts에 남긴다(행정간호사가 같은 "위급 신호 알림" 목록에서 확인할 수 있게).
-- 이 경우는 AI가 특정 서술 답변(response)을 위급 신호로 판단한 게 아니라 대화 끝에서
-- 스스로 요청한 것이라 특정 response 행에 묶이지 않으므로, response_id를 null로 허용한다.
alter table emergency_alerts alter column response_id drop not null;
