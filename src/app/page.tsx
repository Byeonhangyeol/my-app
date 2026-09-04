import { redirect } from "next/navigation";

// 신규간호사는 문자로 받은 기수 링크(/c/[token])로만 들어오고, 이 주소로 직접 올 일이 없다.
// 여기로 오는 사람은 행정간호사이므로 대시보드로 보낸다 — 로그인 여부는
// /admin/layout.tsx가 확인해서, 로그인 안 했으면 그쪽에서 다시 /login으로 보낸다.
export default function Home() {
  redirect("/admin");
}
