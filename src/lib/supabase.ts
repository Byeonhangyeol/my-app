import { createClient } from "@supabase/supabase-js";

// 로그인·비밀번호 재설정에 필요한 Supabase 접속 정보.
// 아직 Supabase 프로젝트를 만들기 전이라 .env에 값이 없을 수 있으므로,
// 없을 때는 앱이 멈추지 않고 supabase를 null로 두어 화면에서 안내만 하도록 한다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
