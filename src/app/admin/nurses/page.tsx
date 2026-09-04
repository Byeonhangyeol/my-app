"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { MILESTONE_LABELS } from "@/lib/cohorts";
import { LeoCharacter, SoftCard, SoftButton } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/departments";
import type { Milestone, Nurse } from "@/types/db";

const SEND_MILESTONES: Milestone[] = ["3m", "6m", "9m", "stay_point"];

// 명단 관리 화면. 엑셀 업로드 → nurses 테이블 저장, 퇴사 여부는 표에서 바로 토글한다.
// (DESIGN.md "명단 관리" 화면 참고, PLAN.md 3번 작업)

// 엑셀 제목 칸의 순서나 정확한 표기는 신경 쓰지 않고, 칸 이름이 아래 중 하나와
// 겹치기만 하면 그 칸을 해당 정보로 읽는다 (칸 순서 무관, 흔히 쓰는 다른 표현도 허용).
const FIELD_SYNONYMS = {
  name: ["이름", "성명"],
  phone: ["전화번호", "휴대폰번호", "핸드폰번호", "연락처"],
  hireDate: ["입사일", "입사일자", "입사날짜", "발령일", "발령날짜"],
  department: ["부서", "부서명", "소속", "소속부서"],
  employeeNumber: ["사번", "사원번호", "직원번호"],
} as const;

type ExcelRow = Record<string, unknown>;

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "");
}

// row의 실제 제목 칸들 중, 별칭 목록의 단어가 포함된 첫 번째 칸의 값을 가져온다.
// "본인 연락처", "배치부서"처럼 앞뒤에 다른 말이 붙어 있어도 알아보도록 완전히 같은지가
// 아니라 포함 관계로 비교한다.
function pickField(row: ExcelRow, synonyms: readonly string[]): unknown {
  const normalizedTargets = synonyms.map(normalizeHeader);
  for (const [header, value] of Object.entries(row)) {
    const normalizedHeader = normalizeHeader(header);
    if (normalizedTargets.some((target) => normalizedHeader.includes(target))) return value;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value).trim();
}

// 엑셀 날짜 칸은 Date 객체, 문자열, 숫자로 올 수 있어 하나로 통일한다.
// xlsx 라이브러리가 날짜를 "이 브라우저의 현재 시간대 기준 자정"으로 만들어주므로,
// UTC 기준(toISOString)이 아니라 이 컴퓨터의 지역 날짜(getFullYear 등)로 읽어야
// 엑셀에 적힌 날짜와 하루 어긋나지 않는다.
function toDateString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).trim();
}

type SortKey = "employeeNumber" | "name" | "department" | "hireDate" | "phone";
type GroupBy = "none" | "hireMonth" | "department";

// 전체 선택 체크박스 — 일부만 선택됐을 때는 indeterminate(대시) 상태로 보여준다.
function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} />;
}

// 표 제목 줄 — 그룹별 아코디언과 전체 표에서 그대로 재사용한다.
function TableHeadRow({
  sortKey,
  sortAsc,
  onSort,
  allSelected,
  someSelected,
  onToggleAll,
}: {
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
}) {
  return (
    <thead>
      <tr className="border-b border-sky-200 bg-sky-50 text-left text-sky-700">
        <th className="w-8 py-2 pl-3">
          <SelectAllCheckbox checked={allSelected} indeterminate={someSelected && !allSelected} onChange={onToggleAll} label="전체 선택" />
        </th>
        {(
          [
            ["employeeNumber", "사번"],
            ["name", "이름"],
            ["department", "부서"],
            ["hireDate", "입사일"],
            ["phone", "전화번호"],
          ] as [SortKey, string][]
        ).map(([key, label]) => (
          <th key={key} className="py-2 pr-2">
            <button
              type="button"
              onClick={() => onSort(key)}
              className="flex items-center gap-1 font-medium hover:underline"
            >
              {label}
              {sortKey === key && <span aria-hidden>{sortAsc ? "▲" : "▼"}</span>}
            </button>
          </th>
        ))}
        <th className="py-2">퇴사</th>
        <th className="py-2">관리</th>
      </tr>
    </thead>
  );
}

// 명단 행 하나 — 그룹별 아코디언과 전체 표에서 그대로 재사용한다.
function NurseRow({
  n,
  isEditing,
  editDraft,
  onEditDraftChange,
  savingEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleResigned,
  onStartEdit,
  onDeleteNurse,
  selected,
  onToggleSelect,
}: {
  n: Nurse;
  isEditing: boolean;
  editDraft: Nurse | null;
  onEditDraftChange: (draft: Nurse) => void;
  savingEdit: boolean;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggleResigned: (id: string, next: boolean) => void;
  onStartEdit: (n: Nurse) => void;
  onDeleteNurse: (id: string, name: string) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <tr className="border-b border-sky-100">
      <td className="py-2 pl-3">
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(n.id)} aria-label={`${n.name} 선택`} />
      </td>
      {isEditing && editDraft ? (
        <>
          <td className="py-2 pr-2">
            <input
              value={editDraft.employeeNumber}
              onChange={(e) => onEditDraftChange({ ...editDraft, employeeNumber: e.target.value })}
              className="w-20 rounded border border-sky-200 px-1 py-0.5"
            />
          </td>
          <td className="py-2 pr-2">
            <input
              value={editDraft.name}
              onChange={(e) => onEditDraftChange({ ...editDraft, name: e.target.value })}
              className="w-20 rounded border border-sky-200 px-1 py-0.5"
            />
          </td>
          <td className="py-2 pr-2">
            <select
              value={editDraft.department}
              onChange={(e) => onEditDraftChange({ ...editDraft, department: e.target.value })}
              className="w-28 rounded border border-sky-200 px-1 py-0.5"
            >
              {/* 엑셀 업로드 등으로 이미 들어와 있는, 고정 목록에 없는 값도 고르는 즉시 사라지지
                  않도록 선택지에 그대로 포함해둔다. */}
              {editDraft.department && !(DEPARTMENTS as readonly string[]).includes(editDraft.department) && (
                <option value={editDraft.department}>{editDraft.department}</option>
              )}
              <option value="">부서 선택</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </td>
          <td className="py-2 pr-2">
            <input
              type="date"
              value={editDraft.hireDate}
              onChange={(e) => onEditDraftChange({ ...editDraft, hireDate: e.target.value })}
              className="rounded border border-sky-200 px-1 py-0.5"
            />
          </td>
          <td className="py-2 pr-2">
            <input
              value={editDraft.phone}
              onChange={(e) => onEditDraftChange({ ...editDraft, phone: e.target.value })}
              className="w-28 rounded border border-sky-200 px-1 py-0.5"
            />
          </td>
          <td className="py-2">
            <input
              type="checkbox"
              checked={editDraft.resigned}
              onChange={(e) => onEditDraftChange({ ...editDraft, resigned: e.target.checked })}
            />
          </td>
          <td className="py-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={savingEdit}
                className="rounded-full bg-pink-400 px-2 py-1 text-xs text-white disabled:opacity-50"
              >
                {savingEdit ? "저장 중..." : "저장"}
              </button>
              <button type="button" onClick={onCancelEdit} className="text-xs text-slate-500 underline">
                취소
              </button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="py-2 pr-2">{n.employeeNumber}</td>
          <td className="py-2 pr-2">{n.name}</td>
          <td className="py-2 pr-2">{n.department}</td>
          <td className="py-2 pr-2">{n.hireDate}</td>
          <td className="py-2 pr-2">{n.phone}</td>
          <td className="py-2">
            <input type="checkbox" checked={n.resigned} onChange={(e) => onToggleResigned(n.id, e.target.checked)} />
          </td>
          <td className="py-2">
            <div className="flex gap-2">
              <button type="button" onClick={() => onStartEdit(n)} className="text-xs text-sky-600 underline">
                수정
              </button>
              <button type="button" onClick={() => onDeleteNurse(n.id, n.name)} className="text-xs text-red-500 underline">
                삭제
              </button>
            </div>
          </td>
        </>
      )}
    </tr>
  );
}

export default function NursesPage() {
  const router = useRouter();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortKey, setSortKey] = useState<SortKey>("hireDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Nurse | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingCohort, setSendingCohort] = useState(false);

  async function loadNurses() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("nurses")
      .select("id, name, phone, hire_date, department, employee_number, resigned, created_at")
      .order("hire_date", { ascending: false });
    if (error) {
      setError("명단을 불러오지 못했어요.");
      return;
    }
    setNurses(
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        hireDate: row.hire_date,
        department: row.department,
        employeeNumber: row.employee_number,
        resigned: row.resigned,
        createdAt: row.created_at,
      })),
    );
  }

  useEffect(() => {
    // 최초 진입 시 명단을 불러온다. loadNurses 내부에서 비동기로 setState하므로 안전하다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNurses();
  }, []);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

      const records = rows
        .map((row) => ({
          name: asString(pickField(row, FIELD_SYNONYMS.name)),
          phone: asString(pickField(row, FIELD_SYNONYMS.phone)),
          hire_date: toDateString(pickField(row, FIELD_SYNONYMS.hireDate)),
          department: asString(pickField(row, FIELD_SYNONYMS.department)),
          employee_number: asString(pickField(row, FIELD_SYNONYMS.employeeNumber)),
        }))
        .filter(
          (r): r is {
            name: string;
            phone: string;
            hire_date: string;
            department: string;
            employee_number: string;
          } => Boolean(r.name && r.phone && r.hire_date && r.department && r.employee_number),
        );

      if (records.length === 0) {
        setError(
          "엑셀에서 이름·전화번호·입사일·부서·사번에 해당하는 칸을 찾지 못했어요. 제목 칸에 이 5가지 정보가 모두 있는지 확인해주세요.",
        );
        return;
      }

      const { error: insertError } = await supabase.from("nurses").insert(records);
      if (insertError) {
        setError("업로드에 실패했어요.");
        return;
      }

      setMessage(`${records.length}명을 명단에 등록했어요.`);
      await loadNurses();
    } catch {
      setError("엑셀 파일을 읽지 못했어요. .xlsx 파일이 맞는지 확인해주세요.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function toggleResigned(id: string, next: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from("nurses").update({ resigned: next }).eq("id", id);
    if (error) {
      setError("변경에 실패했어요.");
      return;
    }
    setNurses((prev) => prev.map((n) => (n.id === id ? { ...n, resigned: next } : n)));
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const sortedNurses = [...nurses].sort((a, b) => {
    const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), "ko");
    return sortAsc ? cmp : -cmp;
  });

  // 입사월 또는 부서 단위로 묶어서 아코디언으로 펼쳤다 접었다 할 수 있게 한다.
  function groupKeyOf(n: Nurse): string {
    if (groupBy === "hireMonth") return n.hireDate.slice(0, 7) || "미상";
    if (groupBy === "department") return n.department || "미상";
    return "";
  }
  const groupedNurses = new Map<string, Nurse[]>();
  if (groupBy !== "none") {
    for (const n of sortedNurses) {
      const key = groupKeyOf(n);
      const list = groupedNurses.get(key) ?? [];
      list.push(n);
      groupedNurses.set(key, list);
    }
  }
  const groupKeys = Array.from(groupedNurses.keys()).sort((a, b) => b.localeCompare(a, "ko"));

  // "YYYY-MM" 형태의 입사월 그룹 키를 오늘 기준 몇 개월차인지로 바꾼다. 입사일을 못 읽어
  // "미상"으로 묶인 그룹 등 형식이 다르면 계산하지 않는다.
  function monthsSinceHireMonth(key: string): number | null {
    const match = /^(\d{4})-(\d{2})$/.exec(key);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const now = new Date();
    const diff = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
    return diff >= 0 ? diff : null;
  }

  function toggleGroupExpanded(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startEdit(n: Nurse) {
    setEditingId(n.id);
    setEditDraft({ ...n });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit() {
    if (!supabase || !editDraft) return;
    setSavingEdit(true);
    setError(null);
    const { error } = await supabase
      .from("nurses")
      .update({
        name: editDraft.name,
        department: editDraft.department,
        hire_date: editDraft.hireDate,
        phone: editDraft.phone,
        employee_number: editDraft.employeeNumber,
      })
      .eq("id", editDraft.id);
    setSavingEdit(false);
    if (error) {
      setError("수정에 실패했어요.");
      return;
    }
    setNurses((prev) => prev.map((n) => (n.id === editDraft.id ? editDraft : n)));
    setEditingId(null);
    setEditDraft(null);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 표(또는 그룹) 하나에 보이는 인원 전체를 한 번에 선택/해제한다.
  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  // 선택한 인원만으로 새 기수(발송 대상)를 만들어 기수·발송 관리로 넘긴다.
  // 입사일 기준 자동 기수와 구분하기 위해 is_manual=true로 표시한다.
  async function sendSelectedToCohort(milestone: Milestone) {
    if (!supabase || selectedIds.size === 0) return;
    setSendingCohort(true);
    setError(null);

    // 같은 시점(milestone)에 이미 대상자로 들어가 있는 사람과 겹치면 막는다 — 같은 사람에게
    // 같은 단계 링크가 두 번(자동 기수 한 번, 수동 기수 한 번 등) 나가는 걸 방지한다.
    const { data: milestoneCohorts, error: cohortsErr } = await supabase
      .from("cohorts")
      .select("id")
      .eq("milestone", milestone);
    if (cohortsErr) {
      setSendingCohort(false);
      setError("중복 확인에 실패했어요.");
      return;
    }
    const cohortIds = (milestoneCohorts ?? []).map((c) => c.id);
    let alreadyTargetedIds = new Set<string>();
    if (cohortIds.length > 0) {
      const { data: memberRows, error: memberCheckErr } = await supabase
        .from("cohort_nurses")
        .select("nurse_id")
        .in("cohort_id", cohortIds);
      if (memberCheckErr) {
        setSendingCohort(false);
        setError("중복 확인에 실패했어요.");
        return;
      }
      alreadyTargetedIds = new Set((memberRows ?? []).map((r) => r.nurse_id));
    }
    const overlapping = Array.from(selectedIds).filter((id) => alreadyTargetedIds.has(id));
    if (overlapping.length > 0) {
      setSendingCohort(false);
      const names = overlapping.map((id) => nurses.find((n) => n.id === id)?.name ?? id).join(", ");
      setError(`${names}님은 이미 ${MILESTONE_LABELS[milestone]} 기수에 포함돼 있어요. 선택에서 빼고 다시 시도해주세요.`);
      return;
    }

    const linkToken = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const cohortMonth = new Date().toISOString().slice(0, 10);
    const { data, error: insertError } = await supabase
      .from("cohorts")
      .insert({ cohort_month: cohortMonth, milestone, link_token: linkToken, status: "pending", is_manual: true })
      .select("id")
      .single();
    if (insertError || !data) {
      setSendingCohort(false);
      setError("기수 생성에 실패했어요.");
      return;
    }
    const memberRows = Array.from(selectedIds).map((nurseId) => ({ cohort_id: data.id, nurse_id: nurseId }));
    const { error: memberError } = await supabase.from("cohort_nurses").insert(memberRows);
    setSendingCohort(false);
    if (memberError) {
      setError("대상자 등록에 실패했어요.");
      return;
    }
    setSelectedIds(new Set());
    router.push("/admin/cohorts");
  }

  async function deleteNurse(id: string, name: string) {
    if (!supabase) return;
    if (!window.confirm(`${name}님을 명단에서 삭제할까요? 이 작업은 되돌릴 수 없어요.`)) return;
    const { error } = await supabase.from("nurses").delete().eq("id", id);
    if (error) {
      setError("삭제에 실패했어요.");
      return;
    }
    setNurses((prev) => prev.filter((n) => n.id !== id));
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl">
        <h1 className="text-xl font-bold text-pink-600 sm:text-2xl">명단 관리</h1>
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase 설정이 아직 안 되어 있어요.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6 sm:max-w-4xl sm:p-8 md:max-w-5xl">
      <div className="flex items-center gap-3">
        <LeoCharacter n={16} size="sm" float={false} />
        <div>
          <h1 className="text-xl font-bold text-pink-600 sm:text-2xl">명단 관리</h1>
          <p className="mt-1 text-sm text-slate-600">
            엑셀 제목 칸에 이름·전화번호·입사일·부서·사번 정보가 있으면, 순서나 다른 칸이 더
            있어도 상관없이 알아서 읽어요. 왼쪽 체크박스로 몇 명만 골라 기수·발송 관리로 보낼 수도 있어요.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        disabled={loading}
        className="hidden"
      />
      <SoftButton shape="rect" onClick={() => fileInputRef.current?.click()} disabled={loading} className="mt-4">
        {loading ? "처리 중..." : "엑셀 파일 업로드"}
      </SoftButton>

      {loading && <p className="mt-2 text-sm text-slate-500">처리 중...</p>}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <span>묶어보기</span>
        {(
          [
            ["none", "없음"],
            ["hireMonth", "입사월별"],
            ["department", "부서별"],
          ] as [GroupBy, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setGroupBy(key)}
            className="rounded-full px-3 py-1 transition-all duration-200"
            style={
              groupBy === key
                ? { background: "linear-gradient(155deg, var(--pink-strong) 0%, var(--pink) 100%)", boxShadow: "var(--shadow-inset)", color: "#fff" }
                : { background: "linear-gradient(150deg, #fff 0%, var(--surface-bg-2) 100%)", boxShadow: "var(--shadow-sm)", color: "var(--text-body-color)" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <SoftCard level={2} className="mt-3 flex flex-wrap items-center gap-2 !py-3 text-sm">
          <span className="font-medium text-pink-600">{selectedIds.size}명 선택됨</span>
          <span className="text-slate-400">→ 기수로 보내기:</span>
          {SEND_MILESTONES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => sendSelectedToCohort(m)}
              disabled={sendingCohort}
              className="rounded-full px-3 py-1.5 text-xs text-sky-700 disabled:opacity-50"
              style={{ background: "linear-gradient(150deg, #fff 0%, var(--surface-bg-2) 100%)", boxShadow: "var(--shadow-sm)" }}
            >
              {MILESTONE_LABELS[m]}
            </button>
          ))}
          <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 underline">
            선택 해제
          </button>
        </SoftCard>
      )}

      {groupBy === "none" ? (
        <SoftCard level={2} className="mt-3 !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <TableHeadRow
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={handleSort}
              allSelected={sortedNurses.length > 0 && sortedNurses.every((n) => selectedIds.has(n.id))}
              someSelected={sortedNurses.some((n) => selectedIds.has(n.id))}
              onToggleAll={() => toggleSelectAll(sortedNurses.map((n) => n.id))}
            />
            <tbody>
              {sortedNurses.map((n) => (
                <NurseRow
                  key={n.id}
                  n={n}
                  isEditing={editingId === n.id}
                  editDraft={editDraft}
                  onEditDraftChange={setEditDraft}
                  savingEdit={savingEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  onToggleResigned={toggleResigned}
                  onStartEdit={startEdit}
                  onDeleteNurse={deleteNurse}
                  selected={selectedIds.has(n.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
              {nurses.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400">
                    아직 등록된 명단이 없어요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SoftCard>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {groupKeys.map((key) => {
            const list = groupedNurses.get(key) ?? [];
            const expanded = expandedGroups.has(key);
            return (
              <SoftCard level={2} key={key} className="!p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroupExpanded(key)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-sky-700"
                >
                  <span>
                    {key}{" "}
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      ({list.length}명
                      {groupBy === "hireMonth" && monthsSinceHireMonth(key) !== null && `, ${monthsSinceHireMonth(key)}개월차`}
                      )
                    </span>
                  </span>
                  <span aria-hidden>{expanded ? "▾" : "▸"}</span>
                </button>
                {expanded && (
                  <table className="w-full text-sm">
                    <TableHeadRow
                      sortKey={sortKey}
                      sortAsc={sortAsc}
                      onSort={handleSort}
                      allSelected={list.length > 0 && list.every((n) => selectedIds.has(n.id))}
                      someSelected={list.some((n) => selectedIds.has(n.id))}
                      onToggleAll={() => toggleSelectAll(list.map((n) => n.id))}
                    />
                    <tbody>
                      {list.map((n) => (
                        <NurseRow
                          key={n.id}
                          n={n}
                          isEditing={editingId === n.id}
                          editDraft={editDraft}
                          onEditDraftChange={setEditDraft}
                          savingEdit={savingEdit}
                          onSaveEdit={saveEdit}
                          onCancelEdit={cancelEdit}
                          onToggleResigned={toggleResigned}
                          onStartEdit={startEdit}
                          onDeleteNurse={deleteNurse}
                          selected={selectedIds.has(n.id)}
                          onToggleSelect={toggleSelect}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </SoftCard>
            );
          })}
          {groupKeys.length === 0 && <p className="text-sm text-slate-400">아직 등록된 명단이 없어요.</p>}
        </div>
      )}
    </main>
  );
}
