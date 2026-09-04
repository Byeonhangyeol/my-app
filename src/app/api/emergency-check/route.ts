import { NextResponse } from "next/server";

// 마찰 지도 서술 답변에 자·타해 등 위급 신호가 있는지 AI가 맥락으로 판단한다.
// 고정된 키워드 목록이 아니라 매번 모델에게 문맥 판단을 맡긴다.
// OPENAI_API_KEY는 서버에서만 쓰고 클라이언트에 노출하지 않는다.
// (PRD.md 위급 처리, PLAN.md 13번 작업)

const SYSTEM_PROMPT = `당신은 병원 신규간호사의 익명 설문 서술 답변을 검토하는 안전 담당자입니다.
아래 답변에 자해·자살·타해 등 즉각적인 위급 신호가 담겨 있는지 문맥으로 판단하세요.
단순히 힘들다·지친다·그만두고 싶다는 정도의 표현만으로는 위급 신호로 보지 마세요.
고정된 단어 목록이 아니라 전체 맥락과 어조를 근거로 판단하세요.
반드시 아래 JSON 형식으로만 답하세요: {"isEmergency": boolean, "reasoning": string}`;

export async function POST(request: Request) {
  const body = await request.json();
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ isEmergency: false, reasoning: "" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ isEmergency: false, reasoning: "OPENAI_API_KEY 미설정" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ isEmergency: false, reasoning: "판단 요청 실패" });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";

    let parsed: { isEmergency?: boolean; reasoning?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      isEmergency: parsed.isEmergency === true,
      reasoning: parsed.reasoning ?? "",
    });
  } catch {
    return NextResponse.json({ isEmergency: false, reasoning: "판단 요청 실패" });
  }
}
