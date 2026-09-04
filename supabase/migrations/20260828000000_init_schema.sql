-- PRD.md "개발 단위" 1번: 명단 / 응답 / 기수 구조 정의
-- PRD.md에서 아직 확정하지 않은 항목(예: 부서)은 넣지 않고, 현재 합의된 필드만 정의한다.

-- 명단: 신규간호사 기본 정보
create table if not exists nurses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  hire_date date not null,
  resigned boolean not null default false, -- 퇴사 표시 (true면 이후 알림 대상에서 제외)
  created_at timestamptz not null default now()
);

-- 기수: 같은 입사월로 묶인 그룹 하나당, 시점(3/6/12개월, 1년경과 Stay Point)별로 링크 하나
create table if not exists cohorts (
  id uuid primary key default gen_random_uuid(),
  cohort_month date not null, -- 그 기수의 대표 입사월 (예: 2026-06-01)
  milestone text not null check (milestone in ('3m', '6m', '12m', 'stay_point')),
  link_token text not null unique, -- 신규간호사에게 문자로 전달할 링크의 식별 코드
  status text not null default 'pending' check (status in ('pending', 'sent')),
  created_at timestamptz not null default now()
);

-- 응답: 신규간호사가 대화에서 남긴 답변 (기기 식별자 기준, 로그인 없음)
create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id),
  device_id text not null, -- 브라우저에 남는 식별자 (같은 값 = 같은 사람으로 간주)
  step text not null check (step in ('flight_risk', 'friction_map', 'stay_menu', 'stay_point')),
  answer_text text,
  disclosure_level text not null default 'anonymous' check (disclosure_level in ('anonymous', 'department', 'name')),
  disclosed_name text, -- disclosure_level = 'name'일 때만 채워짐
  disclosed_department text, -- disclosure_level = 'department' 이상일 때만 채워짐
  created_at timestamptz not null default now()
);

create index if not exists responses_cohort_id_idx on responses(cohort_id);
create index if not exists responses_device_id_idx on responses(device_id);
