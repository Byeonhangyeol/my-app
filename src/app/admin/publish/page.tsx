"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { displayName } from "@/lib/stats";
import { MILESTONE_LABELS } from "@/lib/cohorts";
import { LeoCharacter, SoftCard, SoftTextarea, SoftButton } from "@/components/ui";
import type { AdminAction, Cohort, CuratedQuote, CuratedQuoteCategory, GratitudeMessage, ResponseRecord } from "@/types/db";

const CURATED_LABELS: Record<CuratedQuoteCategory, string> = {
  stay_menu: "Stay Menu 응답",
  stay_point_advice: "1년을 견뎌냈던 이유",
  stay_point_needs: "후배가 1년을 견디기 위해 필요한 것",
  stay_point_letter: "1년을 견딘 선배가 남긴 말",
};

// 신규간호사에게 실제로 노출할 콘텐츠를 행정간호사가 직접 고르는 화면.
// 대시보드(/admin)는 "결과를 보는 곳"이고, 여기는 "그중 무엇을 내보낼지 정하는 곳"으로 분리했다.
// - 개선 조치 기록: 문제점/개선점을 나눠 입력하고, 기록별로 노출 여부를 고른다 (화이트리스트 4번 항목)
// - 마찰 지도: 응답 하나하나가 아니라 "기수 × 항목" 단위로 노출을 고른다 — 원래 통계가 항목별
//   퍼센트이기 때문에, 개별 응답 단위로 끄고 켜면 숫자만 남고 어떤 응답인지 알 수 없어 관리가
//   안 된다는 피드백을 반영했다.
// - Stay Menu·Stay Point 응답: 하나하나 노출 여부를 고르고, 쓸모없는 응답은 완전히 지울 수도 있다.
//   Stay Point 응답은 추가로 "1년을 견뎌냈던 이유"용으로 다듬은 문구(advice_text)를 따로 입력할 수 있다.
// 레오(입체레오 15번, 팔짱 낀 채 X 표시) — "무엇을 내보낼지 문지기처럼 고른다"는 화면 성격을 표현.

type FrictionGroup = {
  cohortId: string;
  choice: string;
  count: number;
  exposedCount: number;
  ids: string[];
};

// 섹션 전체를 접었다 펼 수 있게 감싸는 아코디언 래퍼. 접으면 설명 문구·목록까지 통째로 숨겨서
// 목록이 긴 섹션(문구 24개 등)이 화면을 다 차지하지 않게 한다.
function CollapsibleSection({
  title,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <SoftCard as="section" level={2}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between text-left">
        <h2 className="text-sm font-medium text-sky-700">{title}</h2>
        <span aria-hidden className="text-slate-400">
          {collapsed ? "▸" : "▾"}
        </span>
      </button>
      {!collapsed && <div className="mt-1">{children}</div>}
    </SoftCard>
  );
}

export default function PublishPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [actions, setActions] = useState<AdminAction[]>([]);
  const [problemText, setProblemText] = useState("");
  const [improvementText, setImprovementText] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editActionDraft, setEditActionDraft] = useState<{ problemText: string; improvementText: string } | null>(null);
  const [savingActionEdit, setSavingActionEdit] = useState(false);

  const [gratitudeMessages, setGratitudeMessages] = useState<GratitudeMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [savingMessage, setSavingMessage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageDraft, setEditMessageDraft] = useState("");
  const [savingMessageEdit, setSavingMessageEdit] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [deletingMessages, setDeletingMessages] = useState(false);

  const [cohortsById, setCohortsById] = useState<Map<string, Cohort>>(new Map());
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [adviceDrafts, setAdviceDrafts] = useState<Record<string, string>>({});
  const [savingAdviceId, setSavingAdviceId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedCohorts, setExpandedCohorts] = useState<Set<string>>(new Set());
  // 마찰 지도 항목(기수 × 선택지)별로 각자 적은 이유 서술을 펼쳐볼 수 있게 한다.
  const [expandedChoices, setExpandedChoices] = useState<Set<string>>(new Set());
  // 기본은 전부 접힌 상태로 시작 — 필요한 섹션만 눌러서 펼친다.
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(["actions", "friction", "stay_menu", "stay_point_advice", "stay_point_needs", "stay_point_letter", "gratitude"]),
  );

  const [curatedQuotes, setCuratedQuotes] = useState<CuratedQuote[]>([]);
  const [newCuratedDrafts, setNewCuratedDrafts] = useState<Record<CuratedQuoteCategory, string>>({
    stay_menu: "",
    stay_point_advice: "",
    stay_point_needs: "",
    stay_point_letter: "",
  });
  const [savingCuratedCategory, setSavingCuratedCategory] = useState<CuratedQuoteCategory | null>(null);
  const [editingCuratedId, setEditingCuratedId] = useState<string | null>(null);
  const [editCuratedDraft, setEditCuratedDraft] = useState("");
  const [savingCuratedEdit, setSavingCuratedEdit] = useState(false);
  const [deletingCuratedId, setDeletingCuratedId] = useState<string | null>(null);

  async function loadAll() {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const [actionsRes, messagesRes, cohortsRes, responsesRes, curatedRes] = await Promise.all([
      supabase
        .from("admin_actions")
        .select("id, problem_text, improvement_text, is_exposed, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("gratitude_messages").select("id, message_text, created_at").order("created_at", { ascending: false }),
      supabase.from("cohorts").select("id, cohort_month, milestone, link_token, status, created_at"),
      supabase
        .from("responses")
        .select(
          "id, cohort_id, device_id, step, answer_text, advice_text, disclosure_level, disclosed_name, disclosed_department, is_exposed, created_at",
        )
        .in("step", ["friction_map", "stay_menu", "stay_point", "stay_point_needs"])
        .order("created_at", { ascending: false }),
      supabase
        .from("curated_quotes")
        .select("id, category, quote_text, is_exposed, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (actionsRes.error || messagesRes.error || cohortsRes.error || responsesRes.error || curatedRes.error) {
      setError("데이터를 불러오지 못했어요.");
      setLoading(false);
      return;
    }

    setCuratedQuotes(
      (curatedRes.data ?? []).map((row) => ({
        id: row.id,
        category: row.category,
        quoteText: row.quote_text,
        isExposed: row.is_exposed,
        createdAt: row.created_at,
      })),
    );

    setGratitudeMessages(
      (messagesRes.data ?? []).map((row) => ({
        id: row.id,
        messageText: row.message_text,
        createdAt: row.created_at,
      })),
    );

    setActions(
      (actionsRes.data ?? []).map((row) => ({
        id: row.id,
        problemText: row.problem_text ?? "",
        improvementText: row.improvement_text ?? "",
        isExposed: row.is_exposed,
        createdAt: row.created_at,
      })),
    );

    const cohortMap = new Map<string, Cohort>();
    for (const row of cohortsRes.data ?? []) {
      cohortMap.set(row.id, {
        id: row.id,
        cohortMonth: row.cohort_month,
        milestone: row.milestone,
        linkToken: row.link_token,
        status: row.status === "sent" ? "sent" : "pending",
        createdAt: row.created_at,
      });
    }
    setCohortsById(cohortMap);

    const mapped = (responsesRes.data ?? []).map((row) => ({
      id: row.id,
      cohortId: row.cohort_id,
      deviceId: row.device_id,
      step: row.step,
      answerText: row.answer_text,
      adviceText: row.advice_text,
      disclosureLevel: row.disclosure_level,
      disclosedName: row.disclosed_name,
      disclosedDepartment: row.disclosed_department,
      isExposed: row.is_exposed,
      createdAt: row.created_at,
    })) as ResponseRecord[];
    setResponses(mapped);
    setAdviceDrafts(Object.fromEntries(mapped.map((r) => [r.id, r.adviceText ?? ""])));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, []);

  async function addAction(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !problemText.trim() || !improvementText.trim()) return;
    setSavingAction(true);
    const { data, error: insertError } = await supabase
      .from("admin_actions")
      .insert({ problem_text: problemText.trim(), improvement_text: improvementText.trim() })
      .select("id, problem_text, improvement_text, is_exposed, created_at")
      .single();
    setSavingAction(false);
    if (insertError || !data) {
      setError("등록에 실패했어요.");
      return;
    }
    setActions((prev) => [
      {
        id: data.id,
        problemText: data.problem_text,
        improvementText: data.improvement_text,
        isExposed: data.is_exposed,
        createdAt: data.created_at,
      },
      ...prev,
    ]);
    setProblemText("");
    setImprovementText("");
  }

  function startEditAction(a: AdminAction) {
    setEditingActionId(a.id);
    setEditActionDraft({ problemText: a.problemText, improvementText: a.improvementText });
  }

  function cancelEditAction() {
    setEditingActionId(null);
    setEditActionDraft(null);
  }

  async function saveEditAction() {
    if (!supabase || !editingActionId || !editActionDraft) return;
    if (!editActionDraft.problemText.trim() || !editActionDraft.improvementText.trim()) return;
    setSavingActionEdit(true);
    const { error: updateError } = await supabase
      .from("admin_actions")
      .update({
        problem_text: editActionDraft.problemText.trim(),
        improvement_text: editActionDraft.improvementText.trim(),
      })
      .eq("id", editingActionId);
    setSavingActionEdit(false);
    if (updateError) {
      setError("수정하지 못했어요.");
      return;
    }
    setActions((prev) =>
      prev.map((a) =>
        a.id === editingActionId
          ? { ...a, problemText: editActionDraft.problemText.trim(), improvementText: editActionDraft.improvementText.trim() }
          : a,
      ),
    );
    setEditingActionId(null);
    setEditActionDraft(null);
  }

  async function deleteAction(id: string) {
    if (!supabase) return;
    if (!window.confirm("이 개선 조치 기록을 삭제할까요? 되돌릴 수 없어요.")) return;
    const { error: deleteError } = await supabase.from("admin_actions").delete().eq("id", id);
    if (deleteError) {
      setError("삭제하지 못했어요.");
      return;
    }
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  async function toggleActionExposed(id: string, next: boolean) {
    if (!supabase) return;
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, isExposed: next } : a)));
    const { error: updateError } = await supabase.from("admin_actions").update({ is_exposed: next }).eq("id", id);
    if (updateError) {
      setError("노출 설정을 저장하지 못했어요.");
      setActions((prev) => prev.map((a) => (a.id === id ? { ...a, isExposed: !next } : a)));
    }
  }

  // 개선 조치 기록을 한 건씩이 아니라 전체 한 번에 노출/비노출로 바꾼다 — 여러 건을 검토한 뒤
  // 한꺼번에 켜고 싶다는 요청 반영.
  async function toggleAllActionsExposed(next: boolean) {
    if (!supabase || actions.length === 0) return;
    const ids = actions.map((a) => a.id);
    setActions((prev) => prev.map((a) => ({ ...a, isExposed: next })));
    const { error: updateError } = await supabase.from("admin_actions").update({ is_exposed: next }).in("id", ids);
    if (updateError) {
      setError("노출 설정을 저장하지 못했어요.");
      setActions((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, isExposed: !next } : a)));
    }
  }

  async function addGratitudeMessage(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !newMessageText.trim()) return;
    setSavingMessage(true);
    const { data, error: insertError } = await supabase
      .from("gratitude_messages")
      .insert({ message_text: newMessageText.trim() })
      .select("id, message_text, created_at")
      .single();
    setSavingMessage(false);
    if (insertError || !data) {
      setError("등록에 실패했어요.");
      return;
    }
    setGratitudeMessages((prev) => [{ id: data.id, messageText: data.message_text, createdAt: data.created_at }, ...prev]);
    setNewMessageText("");
  }

  function startEditMessage(m: GratitudeMessage) {
    setEditingMessageId(m.id);
    setEditMessageDraft(m.messageText);
  }

  function cancelEditMessage() {
    setEditingMessageId(null);
    setEditMessageDraft("");
  }

  async function saveEditMessage() {
    if (!supabase || !editingMessageId || !editMessageDraft.trim()) return;
    setSavingMessageEdit(true);
    const { error: updateError } = await supabase
      .from("gratitude_messages")
      .update({ message_text: editMessageDraft.trim() })
      .eq("id", editingMessageId);
    setSavingMessageEdit(false);
    if (updateError) {
      setError("수정하지 못했어요.");
      return;
    }
    setGratitudeMessages((prev) =>
      prev.map((m) => (m.id === editingMessageId ? { ...m, messageText: editMessageDraft.trim() } : m)),
    );
    setEditingMessageId(null);
    setEditMessageDraft("");
  }

  async function deleteMessage(id: string) {
    if (!supabase) return;
    if (!window.confirm("이 감사 문구를 삭제할까요? 되돌릴 수 없어요.")) return;
    const { error: deleteError } = await supabase.from("gratitude_messages").delete().eq("id", id);
    if (deleteError) {
      setError("삭제하지 못했어요.");
      return;
    }
    setGratitudeMessages((prev) => prev.filter((m) => m.id !== id));
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleMessageSelected(id: string) {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 전체 선택 상태면 전체 해제, 아니면 지금 목록 전체를 선택한다(개별 선택도 그대로 가능).
  function toggleSelectAllMessages() {
    setSelectedMessageIds((prev) => {
      if (gratitudeMessages.length > 0 && prev.size === gratitudeMessages.length) return new Set();
      return new Set(gratitudeMessages.map((m) => m.id));
    });
  }

  async function deleteSelectedMessages() {
    if (!supabase || selectedMessageIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedMessageIds.size}개 문구를 삭제할까요? 되돌릴 수 없어요.`)) return;
    setDeletingMessages(true);
    const ids = Array.from(selectedMessageIds);
    const { error: deleteError } = await supabase.from("gratitude_messages").delete().in("id", ids);
    setDeletingMessages(false);
    if (deleteError) {
      setError("삭제하지 못했어요.");
      return;
    }
    setGratitudeMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    setSelectedMessageIds(new Set());
  }

  async function addCuratedQuote(category: CuratedQuoteCategory, e: FormEvent) {
    e.preventDefault();
    const text = newCuratedDrafts[category].trim();
    if (!supabase || !text) return;
    setSavingCuratedCategory(category);
    const { data, error: insertError } = await supabase
      .from("curated_quotes")
      .insert({ category, quote_text: text })
      .select("id, category, quote_text, is_exposed, created_at")
      .single();
    setSavingCuratedCategory(null);
    if (insertError || !data) {
      setError("등록에 실패했어요.");
      return;
    }
    setCuratedQuotes((prev) => [
      { id: data.id, category: data.category, quoteText: data.quote_text, isExposed: data.is_exposed, createdAt: data.created_at },
      ...prev,
    ]);
    setNewCuratedDrafts((prev) => ({ ...prev, [category]: "" }));
  }

  async function toggleCuratedExposed(id: string, next: boolean) {
    if (!supabase) return;
    setCuratedQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, isExposed: next } : q)));
    const { error: updateError } = await supabase.from("curated_quotes").update({ is_exposed: next }).eq("id", id);
    if (updateError) {
      setError("노출 설정을 저장하지 못했어요.");
      setCuratedQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, isExposed: !next } : q)));
    }
  }

  function startEditCurated(q: CuratedQuote) {
    setEditingCuratedId(q.id);
    setEditCuratedDraft(q.quoteText);
  }

  function cancelEditCurated() {
    setEditingCuratedId(null);
    setEditCuratedDraft("");
  }

  async function saveEditCurated() {
    if (!supabase || !editingCuratedId || !editCuratedDraft.trim()) return;
    setSavingCuratedEdit(true);
    const { error: updateError } = await supabase
      .from("curated_quotes")
      .update({ quote_text: editCuratedDraft.trim() })
      .eq("id", editingCuratedId);
    setSavingCuratedEdit(false);
    if (updateError) {
      setError("수정하지 못했어요.");
      return;
    }
    setCuratedQuotes((prev) =>
      prev.map((q) => (q.id === editingCuratedId ? { ...q, quoteText: editCuratedDraft.trim() } : q)),
    );
    setEditingCuratedId(null);
    setEditCuratedDraft("");
  }

  async function deleteCuratedQuote(id: string) {
    if (!supabase) return;
    if (!window.confirm("이 문구를 삭제할까요? 되돌릴 수 없어요.")) return;
    setDeletingCuratedId(id);
    const { error: deleteError } = await supabase.from("curated_quotes").delete().eq("id", id);
    setDeletingCuratedId(null);
    if (deleteError) {
      setError("삭제하지 못했어요.");
      return;
    }
    setCuratedQuotes((prev) => prev.filter((q) => q.id !== id));
  }

  function toggleSection(id: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleExposed(id: string, next: boolean) {
    if (!supabase) return;
    setResponses((prev) => prev.map((r) => (r.id === id ? { ...r, isExposed: next } : r)));
    const { error: updateError } = await supabase.from("responses").update({ is_exposed: next }).eq("id", id);
    if (updateError) {
      setError("노출 설정을 저장하지 못했어요.");
      setResponses((prev) => prev.map((r) => (r.id === id ? { ...r, isExposed: !next } : r)));
    }
  }

  // 마찰 지도 한 항목(기수 × 선택지)에 속한 응답 전부를 한 번에 노출/비노출로 바꾼다.
  async function toggleFrictionGroup(group: FrictionGroup, next: boolean) {
    if (!supabase) return;
    setResponses((prev) => prev.map((r) => (group.ids.includes(r.id) ? { ...r, isExposed: next } : r)));
    const { error: updateError } = await supabase.from("responses").update({ is_exposed: next }).in("id", group.ids);
    if (updateError) {
      setError("노출 설정을 저장하지 못했어요.");
      setResponses((prev) => prev.map((r) => (group.ids.includes(r.id) ? { ...r, isExposed: !next } : r)));
    }
  }

  // 한 기수의 마찰 지도 항목 전부를 한 번에 노출/비노출로 바꾼다.
  async function toggleAllFrictionInCohort(groups: FrictionGroup[], next: boolean) {
    if (!supabase) return;
    const ids = groups.flatMap((g) => g.ids);
    if (ids.length === 0) return;
    setResponses((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, isExposed: next } : r)));
    const { error: updateError } = await supabase.from("responses").update({ is_exposed: next }).in("id", ids);
    if (updateError) {
      setError("노출 설정을 저장하지 못했어요.");
      setResponses((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, isExposed: !next } : r)));
    }
  }

  // Stay Menu·1년을 견뎌냈던 이유·후배가 필요한 것 목록 전부를 한 번에 노출/비노출로 바꾼다.
  async function toggleAllResponsesExposed(list: ResponseRecord[], next: boolean) {
    if (!supabase || list.length === 0) return;
    const ids = list.map((r) => r.id);
    setResponses((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, isExposed: next } : r)));
    const { error: updateError } = await supabase.from("responses").update({ is_exposed: next }).in("id", ids);
    if (updateError) {
      setError("노출 설정을 저장하지 못했어요.");
      setResponses((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, isExposed: !next } : r)));
    }
  }

  // 직접 작성 문구(카테고리 하나) 전부를 한 번에 노출/비노출로 바꾼다.
  async function toggleAllCuratedExposed(category: CuratedQuoteCategory, next: boolean) {
    if (!supabase) return;
    const ids = curatedQuotes.filter((q) => q.category === category).map((q) => q.id);
    if (ids.length === 0) return;
    setCuratedQuotes((prev) => prev.map((q) => (ids.includes(q.id) ? { ...q, isExposed: next } : q)));
    const { error: updateError } = await supabase.from("curated_quotes").update({ is_exposed: next }).in("id", ids);
    if (updateError) {
      setError("노출 설정을 저장하지 못했어요.");
      setCuratedQuotes((prev) => prev.map((q) => (ids.includes(q.id) ? { ...q, isExposed: !next } : q)));
    }
  }

  async function saveAdvice(id: string) {
    if (!supabase) return;
    setSavingAdviceId(id);
    const draft = adviceDrafts[id]?.trim() || null;
    const { error: updateError } = await supabase.from("responses").update({ advice_text: draft }).eq("id", id);
    setSavingAdviceId(null);
    if (updateError) {
      setError("저장하지 못했어요.");
      return;
    }
    setResponses((prev) => prev.map((r) => (r.id === id ? { ...r, adviceText: draft } : r)));
    setMessage("저장했어요.");
  }

  async function deleteResponse(id: string) {
    if (!supabase) return;
    if (!window.confirm("이 응답을 완전히 삭제할까요? 되돌릴 수 없어요.")) return;
    setDeletingId(id);
    const { error: deleteError } = await supabase.from("responses").delete().eq("id", id);
    setDeletingId(null);
    if (deleteError) {
      setError("삭제하지 못했어요.");
      return;
    }
    setResponses((prev) => prev.filter((r) => r.id !== id));
    setMessage("삭제했어요.");
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl">
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase 설정이 아직 안 되어 있어요.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  const stayMenuAnswers = responses.filter((r) => r.step === "stay_menu");
  const stayPointAnswers = responses.filter((r) => r.step === "stay_point");
  const stayPointNeedsAnswers = responses.filter((r) => r.step === "stay_point_needs");

  // 마찰 지도 응답을 "기수 × 선택지" 단위로 묶는다. 선택지는 답변 앞부분(" — " 앞)이다.
  const frictionGroupsMap = new Map<string, FrictionGroup>();
  for (const r of responses) {
    if (r.step !== "friction_map" || !r.answerText) continue;
    const choice = r.answerText.split(" — ")[0];
    const key = `${r.cohortId}::${choice}`;
    const group = frictionGroupsMap.get(key) ?? { cohortId: r.cohortId, choice, count: 0, exposedCount: 0, ids: [] };
    group.count += 1;
    if (r.isExposed) group.exposedCount += 1;
    group.ids.push(r.id);
    frictionGroupsMap.set(key, group);
  }
  const frictionGroups = Array.from(frictionGroupsMap.values()).sort((a, b) => {
    const cohortA = cohortsById.get(a.cohortId);
    const cohortB = cohortsById.get(b.cohortId);
    return (
      (cohortB?.cohortMonth ?? "").localeCompare(cohortA?.cohortMonth ?? "") ||
      b.count - a.count
    );
  });
  const frictionTotalsByCohort = new Map<string, number>();
  for (const g of frictionGroups) {
    frictionTotalsByCohort.set(g.cohortId, (frictionTotalsByCohort.get(g.cohortId) ?? 0) + g.count);
  }

  // 기수별로 묶어서 아코디언으로 펼쳤다 접었다 할 수 있게 한다.
  const frictionByCohort = new Map<string, FrictionGroup[]>();
  for (const g of frictionGroups) {
    const list = frictionByCohort.get(g.cohortId) ?? [];
    list.push(g);
    frictionByCohort.set(g.cohortId, list);
  }
  const frictionCohortIds = Array.from(frictionByCohort.keys()).sort((a, b) => {
    const cohortA = cohortsById.get(a);
    const cohortB = cohortsById.get(b);
    return (cohortB?.cohortMonth ?? "").localeCompare(cohortA?.cohortMonth ?? "");
  });

  function toggleCohortExpanded(cohortId: string) {
    setExpandedCohorts((prev) => {
      const next = new Set(prev);
      if (next.has(cohortId)) next.delete(cohortId);
      else next.add(cohortId);
      return next;
    });
  }

  function toggleChoiceExpanded(key: string) {
    setExpandedChoices((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // 실제 응답과 별개로 행정간호사가 직접 쓴 문구 — 세 섹션(Stay Menu 응답·1년을 견뎌냈던 이유·
  // 후배가 1년을 견디기 위해 필요한 것) 아래에 똑같은 모양으로 붙는다.
  function renderCuratedSection(category: CuratedQuoteCategory) {
    const list = curatedQuotes.filter((q) => q.category === category);
    return (
      <div className="mt-4 border-t border-sky-100 pt-3">
        <h3 className="text-xs font-semibold text-slate-500">
          직접 작성 ({list.length}개) — {CURATED_LABELS[category]}에 섞여 나가요
        </h3>
        <form onSubmit={(e) => addCuratedQuote(category, e)} className="mt-2 flex flex-col gap-2">
          <SoftTextarea
            value={newCuratedDrafts[category]}
            onChange={(e) => setNewCuratedDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
            rows={2}
            placeholder="신규간호사에게 그대로 노출할 문구를 적어주세요"
          />
          <SoftButton
            type="submit"
            shape="rect"
            variant="secondary"
            disabled={savingCuratedCategory === category || !newCuratedDrafts[category].trim()}
            className="self-end !px-3 !py-1.5 !text-xs !font-medium"
          >
            {savingCuratedCategory === category ? "등록 중..." : "등록"}
          </SoftButton>
        </form>
        {list.length > 0 && (
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={list.every((q) => q.isExposed)}
              onChange={(e) => toggleAllCuratedExposed(category, e.target.checked)}
              className="h-4 w-4"
            />
            전체 노출
          </label>
        )}
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {list.map((q) => {
            const isEditing = editingCuratedId === q.id;
            return (
              <SoftCard as="li" level={2} key={q.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={q.isExposed}
                  onChange={(e) => toggleCuratedExposed(q.id, e.target.checked)}
                  className="mt-1 h-4 w-4"
                  aria-label="노출"
                />
                {isEditing ? (
                  <div className="flex-1">
                    <SoftTextarea value={editCuratedDraft} onChange={(e) => setEditCuratedDraft(e.target.value)} rows={2} />
                    <div className="mt-1 flex gap-2">
                      <SoftButton
                        shape="rect"
                        onClick={saveEditCurated}
                        disabled={savingCuratedEdit || !editCuratedDraft.trim()}
                        className="!px-3 !py-1.5 !text-xs !font-medium"
                      >
                        {savingCuratedEdit ? "저장 중..." : "저장"}
                      </SoftButton>
                      <button type="button" onClick={cancelEditCurated} className="text-xs text-slate-500 underline">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">직접 작성</p>
                    <p className="mt-1">{q.quoteText}</p>
                    <div className="mt-1 flex gap-2">
                      <button type="button" onClick={() => startEditCurated(q)} className="text-xs text-sky-600 underline">
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCuratedQuote(q.id)}
                        disabled={deletingCuratedId === q.id}
                        className="text-xs text-red-500 underline disabled:opacity-50"
                      >
                        {deletingCuratedId === q.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </div>
                )}
              </SoftCard>
            );
          })}
          {list.length === 0 && <li className="text-slate-400">아직 직접 작성한 문구가 없어요.</li>}
        </ul>
      </div>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:max-w-4xl sm:p-8 sm:gap-10 md:max-w-5xl lg:max-w-6xl">
      <div className="flex items-center gap-3">
        <LeoCharacter n={15} size="sm" float={false} />
        <div>
          <h1 className="text-xl font-bold text-pink-600 sm:text-2xl">공개 콘텐츠 관리</h1>
          <p className="mt-1 text-sm text-slate-500">
            여기서 고른 내용만 신규간호사에게 보여요. 대시보드의 통계는 행정간호사만 보는 전체 수치예요.
          </p>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
        </div>
      </div>

      <CollapsibleSection
        title="개선 조치 기록"
        collapsed={collapsedSections.has("actions")}
        onToggle={() => toggleSection("actions")}
      >
        <p className="mt-1 text-xs text-slate-500">문제점·개선점을 한 쌍으로 여러 건 등록할 수 있고, 건별로 노출 여부를 고를 수 있어요.</p>
        <form onSubmit={addAction} className="mt-2 flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            문제점
            <SoftTextarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              rows={2}
              placeholder="예: 3교대 인력 부족으로 휴식 시간 확보가 어려움"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            개선점
            <SoftTextarea
              value={improvementText}
              onChange={(e) => setImprovementText(e.target.value)}
              rows={2}
              placeholder="예: 3교대 인력 충원 논의 시작"
            />
          </label>
          <SoftButton
            type="submit"
            shape="rect"
            disabled={savingAction || !problemText.trim() || !improvementText.trim()}
            className="self-end"
          >
            {savingAction ? "등록 중..." : "등록"}
          </SoftButton>
        </form>
        {actions.length > 0 && (
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={actions.every((a) => a.isExposed)}
              onChange={(e) => toggleAllActionsExposed(e.target.checked)}
              className="h-4 w-4"
            />
            전체 노출
          </label>
        )}
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {actions.map((a) => {
            const isEditing = editingActionId === a.id;
            return (
              <SoftCard as="li" level={2} key={a.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={a.isExposed}
                  onChange={(e) => toggleActionExposed(a.id, e.target.checked)}
                  className="mt-1 h-4 w-4"
                  aria-label="노출"
                />
                {isEditing && editActionDraft ? (
                  <div className="flex-1">
                    <SoftTextarea
                      value={editActionDraft.problemText}
                      onChange={(e) => setEditActionDraft({ ...editActionDraft, problemText: e.target.value })}
                      rows={2}
                    />
                    <SoftTextarea
                      value={editActionDraft.improvementText}
                      onChange={(e) => setEditActionDraft({ ...editActionDraft, improvementText: e.target.value })}
                      rows={2}
                      className="mt-1"
                    />
                    <div className="mt-1 flex gap-2">
                      <SoftButton
                        shape="rect"
                        onClick={saveEditAction}
                        disabled={savingActionEdit}
                        className="!px-3 !py-1.5 !text-xs !font-medium"
                      >
                        {savingActionEdit ? "저장 중..." : "저장"}
                      </SoftButton>
                      <button type="button" onClick={cancelEditAction} className="text-xs text-slate-500 underline">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleDateString("ko-KR")}</p>
                    <p className="mt-1">
                      <span className="font-medium text-slate-600">문제점</span> {a.problemText}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-slate-600">개선점</span> {a.improvementText}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <button type="button" onClick={() => startEditAction(a)} className="text-xs text-sky-600 underline">
                        수정
                      </button>
                      <button type="button" onClick={() => deleteAction(a.id)} className="text-xs text-red-500 underline">
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </SoftCard>
            );
          })}
          {actions.length === 0 && <li className="text-slate-400">아직 기록이 없어요.</li>}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection
        title="마찰 지도 노출 항목"
        collapsed={collapsedSections.has("friction")}
        onToggle={() => toggleSection("friction")}
      >
        <p className="mt-1 text-xs text-slate-500">
          기수를 펼치면 이유별 항목이 나와요. 체크 해제하면 그 항목에 속한 응답 전부가 통계 카드에서 빠져요.
        </p>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {frictionCohortIds.map((cohortId) => {
            const cohort = cohortsById.get(cohortId);
            const groups = frictionByCohort.get(cohortId) ?? [];
            const total = frictionTotalsByCohort.get(cohortId) ?? 0;
            const expanded = expandedCohorts.has(cohortId);
            return (
              <SoftCard as="li" level={2} key={cohortId}>
                <button
                  type="button"
                  onClick={() => toggleCohortExpanded(cohortId)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="font-medium text-slate-700">
                    {cohort ? `${cohort.cohortMonth.slice(0, 7)} 입사 · ${MILESTONE_LABELS[cohort.milestone]}` : ""}
                    <span className="ml-2 text-xs text-slate-400">({total}건)</span>
                  </span>
                  <span aria-hidden className="text-slate-400">
                    {expanded ? "▾" : "▸"}
                  </span>
                </button>
                {expanded && (
                  <>
                    <label
                      className="mt-2 flex items-center gap-2 text-xs text-slate-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={groups.every((g) => g.exposedCount === g.count)}
                        onChange={(e) => toggleAllFrictionInCohort(groups, e.target.checked)}
                        className="h-4 w-4"
                      />
                      전체 노출
                    </label>
                    <ul className="mt-2 flex flex-col gap-2 border-t border-sky-100 pt-2">
                    {groups
                      .sort((a, b) => b.count - a.count)
                      .map((g) => {
                        const pct = total > 0 ? Math.round((g.count / total) * 100) : 0;
                        const allExposed = g.exposedCount === g.count;
                        const choiceKey = `${g.cohortId}::${g.choice}`;
                        const choiceExpanded = expandedChoices.has(choiceKey);
                        // "선택지 — 이유" 형식으로 저장된 응답만 이유가 있다(교대근무 등 일부는
                        // 자유 서술 없이 바로 저장돼 이유가 없다).
                        const reasons = g.ids
                          .map((id) => responses.find((r) => r.id === id))
                          .filter((r): r is ResponseRecord => !!r && !!r.answerText?.includes(" — "))
                          .map((r) => ({
                            id: r.id,
                            name: displayName(r),
                            reason: r.answerText!.split(" — ").slice(1).join(" — "),
                          }));
                        return (
                          <li key={g.choice} className="flex flex-col gap-1 pl-1">
                            <div className="flex items-center justify-between gap-3">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={allExposed}
                                  onChange={(e) => toggleFrictionGroup(g, e.target.checked)}
                                  className="h-4 w-4"
                                />
                                <span className="text-slate-700">{g.choice}</span>
                              </label>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-xs text-slate-500">
                                  {g.count}명 ({pct}%)
                                </span>
                                {reasons.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleChoiceExpanded(choiceKey)}
                                    className="text-xs text-sky-600 underline"
                                  >
                                    {choiceExpanded ? "이유 접기" : `이유 보기 (${reasons.length})`}
                                  </button>
                                )}
                              </div>
                            </div>
                            {choiceExpanded && (
                              <ul className="ml-6 flex flex-col gap-1 border-l border-sky-100 pl-3">
                                {reasons.map((r) => (
                                  <li key={r.id} className="text-xs text-slate-600">
                                    <span className="text-slate-400">{r.name}</span> — {r.reason}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </SoftCard>
            );
          })}
          {frictionCohortIds.length === 0 && <li className="text-slate-400">아직 응답이 없어요.</li>}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection
        title={`Stay Menu 응답 (${stayMenuAnswers.length}건)`}
        collapsed={collapsedSections.has("stay_menu")}
        onToggle={() => toggleSection("stay_menu")}
      >
        <p className="mt-1 text-xs text-slate-500">
          체크 해제하면 같은 기수 참여자 수·이전 기수 공유 인용문에서 빠져요. 쓸모없는 응답은 삭제할 수 있어요.
        </p>
        {stayMenuAnswers.length > 0 && (
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={stayMenuAnswers.every((r) => r.isExposed)}
              onChange={(e) => toggleAllResponsesExposed(stayMenuAnswers, e.target.checked)}
              className="h-4 w-4"
            />
            전체 노출
          </label>
        )}
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {stayMenuAnswers.map((r) => (
            <SoftCard as="li" level={2} key={r.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={r.isExposed}
                onChange={(e) => toggleExposed(r.id, e.target.checked)}
                className="mt-1 h-4 w-4"
                aria-label="노출"
              />
              <div className="flex-1">
                <p className="text-xs text-slate-500">{displayName(r)}</p>
                <p className="mt-1">{r.answerText}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteResponse(r.id)}
                disabled={deletingId === r.id}
                className="shrink-0 rounded-full px-3 py-1 text-xs text-red-600 disabled:opacity-50"
                style={{ background: "linear-gradient(150deg, #fff 0%, #fee2e2 100%)", boxShadow: "var(--shadow-sm)" }}
              >
                {deletingId === r.id ? "삭제 중..." : "삭제"}
              </button>
            </SoftCard>
          ))}
          {stayMenuAnswers.length === 0 && <li className="text-slate-400">아직 응답이 없어요.</li>}
        </ul>
        {renderCuratedSection("stay_menu")}
      </CollapsibleSection>

      <CollapsibleSection
        title={`1년을 견뎌냈던 이유 (Stay Point 응답 ${stayPointAnswers.length}건)`}
        collapsed={collapsedSections.has("stay_point_advice")}
        onToggle={() => toggleSection("stay_point_advice")}
      >
        <p className="mt-1 text-xs text-slate-500">
          체크한 응답 중에서 무작위로 골라 신규간호사에게 &quot;1년을 견뎌냈던 이유&quot;로 보여줘요. 다듬은 문구를 적으면 원문
          대신 그 문구가 나가요. 쓸모없는 응답은 삭제할 수 있어요.
        </p>
        {stayPointAnswers.length > 0 && (
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={stayPointAnswers.every((r) => r.isExposed)}
              onChange={(e) => toggleAllResponsesExposed(stayPointAnswers, e.target.checked)}
              className="h-4 w-4"
            />
            전체 노출
          </label>
        )}
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {stayPointAnswers.map((r) => (
            <SoftCard as="li" level={2} key={r.id} className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={r.isExposed}
                  onChange={(e) => toggleExposed(r.id, e.target.checked)}
                  className="mt-1 h-4 w-4"
                  aria-label="노출"
                />
                <div className="flex-1">
                  <p className="text-xs text-slate-500">{displayName(r)}</p>
                  <p className="mt-1">원문: {r.answerText}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteResponse(r.id)}
                  disabled={deletingId === r.id}
                  className="shrink-0 rounded-full px-3 py-1 text-xs text-red-600 disabled:opacity-50"
                  style={{ background: "linear-gradient(150deg, #fff 0%, #fee2e2 100%)", boxShadow: "var(--shadow-sm)" }}
                >
                  {deletingId === r.id ? "삭제 중..." : "삭제"}
                </button>
              </div>
              <div className="ml-7 flex flex-col gap-1">
                <SoftTextarea
                  value={adviceDrafts[r.id] ?? ""}
                  onChange={(e) => setAdviceDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  rows={2}
                  placeholder="다듬은 문구 (비워두면 원문 그대로 노출돼요)"
                />
                <SoftButton
                  shape="rect"
                  variant="secondary"
                  onClick={() => saveAdvice(r.id)}
                  disabled={savingAdviceId === r.id}
                  className="self-end !px-3 !py-1.5 !text-xs !font-medium"
                >
                  {savingAdviceId === r.id ? "저장 중..." : "문구 저장"}
                </SoftButton>
              </div>
            </SoftCard>
          ))}
          {stayPointAnswers.length === 0 && <li className="text-slate-400">아직 응답이 없어요.</li>}
        </ul>
        {renderCuratedSection("stay_point_advice")}
      </CollapsibleSection>

      <CollapsibleSection
        title={`후배가 1년을 견디기 위해 필요한 것 (Stay Point 응답 ${stayPointNeedsAnswers.length}건)`}
        collapsed={collapsedSections.has("stay_point_needs")}
        onToggle={() => toggleSection("stay_point_needs")}
      >
        <p className="mt-1 text-xs text-slate-500">
          &quot;후배 간호사들이 선생님과 같이 견디게 하려면 무엇이 필요한가요?&quot; 질문의 답변이에요. 노출을 고르거나
          쓸모없는 응답은 삭제할 수 있어요.
        </p>
        {stayPointNeedsAnswers.length > 0 && (
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={stayPointNeedsAnswers.every((r) => r.isExposed)}
              onChange={(e) => toggleAllResponsesExposed(stayPointNeedsAnswers, e.target.checked)}
              className="h-4 w-4"
            />
            전체 노출
          </label>
        )}
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {stayPointNeedsAnswers.map((r) => (
            <SoftCard as="li" level={2} key={r.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={r.isExposed}
                onChange={(e) => toggleExposed(r.id, e.target.checked)}
                className="mt-1 h-4 w-4"
                aria-label="노출"
              />
              <div className="flex-1">
                <p className="text-xs text-slate-500">{displayName(r)}</p>
                <p className="mt-1">{r.answerText}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteResponse(r.id)}
                disabled={deletingId === r.id}
                className="shrink-0 rounded-full px-3 py-1 text-xs text-red-600 disabled:opacity-50"
                style={{ background: "linear-gradient(150deg, #fff 0%, #fee2e2 100%)", boxShadow: "var(--shadow-sm)" }}
              >
                {deletingId === r.id ? "삭제 중..." : "삭제"}
              </button>
            </SoftCard>
          ))}
          {stayPointNeedsAnswers.length === 0 && <li className="text-slate-400">아직 응답이 없어요.</li>}
        </ul>
        {renderCuratedSection("stay_point_needs")}
      </CollapsibleSection>

      <CollapsibleSection
        title="1년을 견딘 선배가 남긴 말"
        collapsed={collapsedSections.has("stay_point_letter")}
        onToggle={() => toggleSection("stay_point_letter")}
      >
        <p className="mt-1 text-xs text-slate-500">
          실제 응답이 아니라 전부 행정간호사가 직접 쓴 글이에요. Stay Point 대화 끝 무렵 무작위로 하나씩 보여줘요.
        </p>
        {renderCuratedSection("stay_point_letter")}
      </CollapsibleSection>

      <CollapsibleSection
        title={`1년 근속 축하 선물 문구 (${gratitudeMessages.length}개)`}
        collapsed={collapsedSections.has("gratitude")}
        onToggle={() => toggleSection("gratitude")}
      >
        <p className="mt-1 text-xs text-slate-500">
          Stay Point(1년 경과) 대화 끝 선물상자 카드에서 무작위로 하나씩 보여주는 감사 문구예요. 자유롭게 추가·수정·삭제할
          수 있어요.
        </p>
        <form onSubmit={addGratitudeMessage} className="mt-2 flex flex-col gap-2">
          <SoftTextarea
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            rows={2}
            placeholder="예: 지난 1년, 정말 애 많이 쓰셨어요."
          />
          <SoftButton type="submit" shape="rect" disabled={savingMessage || !newMessageText.trim()} className="self-end">
            {savingMessage ? "등록 중..." : "등록"}
          </SoftButton>
        </form>

        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={gratitudeMessages.length > 0 && selectedMessageIds.size === gratitudeMessages.length}
              onChange={toggleSelectAllMessages}
              className="h-4 w-4"
            />
            전체 선택
          </label>
          <button
            type="button"
            onClick={deleteSelectedMessages}
            disabled={selectedMessageIds.size === 0 || deletingMessages}
            className="rounded-full px-3 py-1 text-xs text-red-600 disabled:opacity-40"
            style={{ background: "linear-gradient(150deg, #fff 0%, #fee2e2 100%)", boxShadow: "var(--shadow-sm)" }}
          >
            {deletingMessages ? "삭제 중..." : `선택한 문구 삭제 (${selectedMessageIds.size})`}
          </button>
        </div>

        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {gratitudeMessages.map((m) => {
            const isEditing = editingMessageId === m.id;
            return (
              <SoftCard as="li" level={2} key={m.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedMessageIds.has(m.id)}
                  onChange={() => toggleMessageSelected(m.id)}
                  className="mt-1 h-4 w-4"
                  aria-label="선택"
                />
                {isEditing ? (
                  <div className="flex-1">
                    <SoftTextarea value={editMessageDraft} onChange={(e) => setEditMessageDraft(e.target.value)} rows={2} />
                    <div className="mt-1 flex gap-2">
                      <SoftButton
                        shape="rect"
                        onClick={saveEditMessage}
                        disabled={savingMessageEdit || !editMessageDraft.trim()}
                        className="!px-3 !py-1.5 !text-xs !font-medium"
                      >
                        {savingMessageEdit ? "저장 중..." : "저장"}
                      </SoftButton>
                      <button type="button" onClick={cancelEditMessage} className="text-xs text-slate-500 underline">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <p>{m.messageText}</p>
                    <div className="mt-1 flex gap-2">
                      <button type="button" onClick={() => startEditMessage(m)} className="text-xs text-sky-600 underline">
                        수정
                      </button>
                      <button type="button" onClick={() => deleteMessage(m.id)} className="text-xs text-red-500 underline">
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </SoftCard>
            );
          })}
          {gratitudeMessages.length === 0 && <li className="text-slate-400">아직 등록된 문구가 없어요.</li>}
        </ul>
      </CollapsibleSection>
    </main>
  );
}
