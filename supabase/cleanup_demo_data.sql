-- supabase/seed_demo_2026-09-01*.sql 로 넣은 데모 데이터를 지우는 스크립트.
-- 실행: npx supabase@latest db query --linked --file supabase/cleanup_demo_data.sql
delete from emergency_alerts where device_id like 'demo-%';
delete from responses where device_id like 'demo-%';
delete from cohorts where link_token like 'demo-%';
