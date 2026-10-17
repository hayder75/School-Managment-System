import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { Button } from "../components/ui/button";
import {
  ArrowLeft, BookOpen, Search, ChevronDown, ChevronRight,
  Printer, Download, CornerUpLeft,
} from "lucide-react";

const ROLE_ORDER = [
  "owner", "admin", "general_manager", "principal", "vice_principal", "quality_director",
  "hr", "finance", "accountant", "cashier", "teacher", "librarian", "security_head",
  "general_services", "shift_coordinator", "student", "parent",
];

function appliesTo(chapter, role) {
  if (!role) return true;
  if (chapter.roles === "*") return true;
  return Array.isArray(chapter.roles) && chapter.roles.includes(role);
}

function Block({ b }) {
  if (b.t === "p") return <p className="text-[13px] leading-relaxed text-neutral-700 mb-3">{b.text}</p>;
  if (b.t === "h" || b.t === "h2")
    return <h3 className="text-[15px] font-semibold text-neutral-900 mt-6 mb-2.5">{b.text}</h3>;
  if (b.t === "ul")
    return (
      <ul className="mb-3 space-y-1.5">
        {b.items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-neutral-700">
            <span className="mt-[7px] w-1 h-1 rounded-full bg-neutral-400 flex-shrink-0" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    );
  if (b.t === "steps")
    return (
      <ol className="mb-4 space-y-2">
        {b.items.map((it, i) => (
          <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-neutral-700">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-semibold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ol>
    );
  if (b.t === "note")
    return (
      <div className="border-l-2 border-neutral-900 bg-neutral-50 px-3.5 py-2.5 rounded-r-lg mb-4">
        <p className="text-[12.5px] leading-relaxed text-neutral-700">{b.text}</p>
      </div>
    );
  if (b.t === "table")
    return (
      <div className="mb-4 overflow-x-auto border border-neutral-200 rounded-lg">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-neutral-50">
              {b.head.map((c, i) => (
                <th key={i} className="text-left font-semibold text-neutral-900 px-3 py-2 border-b border-neutral-200 whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r, ri) => (
              <tr key={ri} className={ri % 2 ? "bg-white" : "bg-neutral-50/40"}>
                {r.map((c, ci) => (
                  <td key={ci} className="px-3 py-2 text-neutral-700 border-b border-neutral-100 align-top">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return null;
}

export default function HelpPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role || null;
  const isSignedIn = !!user;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [picked, setPicked] = useState(role || "");
  const [q, setQ] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    fetch("/api/help/manual")
      .then((r) => r.json())
      .then((res) => setData(res?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  // default to the signed-in user's role chapter
  useEffect(() => {
    if (!data) return;
    if (role && !picked) setPicked(role);
    const all = data.parts.flatMap((p) => p.chapters);
    const first =
      all.find((c) => c.slug === "introduction") || all[0];
    setActive(first?.slug || null);
  }, [data, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const roleLabel = useMemo(() => {
    if (!data || !picked) return null;
    return data.roleLabels?.[picked] || picked;
  }, [data, picked]);

  const chapters = useMemo(() => {
    if (!data) return [];
    return data.parts
      .map((part) => ({ part: part.part, short: part.short, chapters: part.chapters }))
      .map((g) => ({
        ...g,
        chapters: g.chapters.map((c) => ({ ...c, show: appliesTo(c, picked), match: matchChapter(c, q) })),
      }));
  }, [data, picked, q]);

  const current = useMemo(() => {
    if (!data) return null;
    for (const g of chapters) {
      const c = g.chapters.find((x) => x.slug === active);
      if (c) return c;
    }
    return null;
  }, [chapters, active]);

  const visibleCount = chapters.reduce((n, g) => n + g.chapters.filter((c) => c.show).length, 0);

  function backToSystem() {
    // Opened in a new tab from inside the app — close it, else go back.
    if (window.opener) {
      window.close();
      return;
    }
    if (isSignedIn) navigate("/dashboard");
    else navigate("/auth/login");
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-neutral-100"
            aria-label="Contents"
          >
            <BookOpen size={18} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen size={16} className="text-neutral-900 flex-shrink-0" />
            <span className="text-[13px] font-semibold truncate">School Management System</span>
            <span className="hidden sm:inline text-[12px] text-neutral-400 truncate">User Manual</span>
          </div>
          <div className="flex-1" />
          {isSignedIn && (
            <span className="hidden sm:inline text-[12px] text-neutral-500">
              Viewing as <span className="font-medium text-neutral-800">{roleLabel || role}</span>
            </span>
          )}
          <Button size="sm" onClick={backToSystem} data-testid="back-to-system">
            {isSignedIn ? <CornerUpLeft size={14} className="mr-1.5" /> : <ArrowLeft size={14} className="mr-1.5" />}
            Back to system
          </Button>
        </div>
      </header>

      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 flex gap-8">
        {/* sidebar nav */}
        <aside className={`${navOpen ? "block" : "hidden"} lg:block w-full lg:w-[248px] flex-shrink-0`}>
          <div className="lg:sticky lg:top-20">
            {/* role picker */}
            <div className="mb-4">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 block mb-1.5">
                {isSignedIn ? "Your role" : "I am a"}
              </label>
              <div className="relative">
                <select
                  value={picked}
                  onChange={(e) => setPicked(e.target.value)}
                  className="w-full appearance-none border border-neutral-200 rounded-lg pl-3 pr-8 py-2 text-[12.5px] bg-white focus:outline-none focus:border-neutral-900"
                >
                  <option value="">Everyone — show all roles</option>
                  {ROLE_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {data?.roleLabels?.[r] || r}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1.5 leading-snug">
                {picked
                  ? `Showing the ${visibleCount} chapters that apply to this role.`
                  : `Showing all ${visibleCount} chapters.`}
              </p>
            </div>

            {/* search */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search the manual"
                className="w-full border border-neutral-200 rounded-lg pl-8 pr-2.5 py-2 text-[12.5px] focus:outline-none focus:border-neutral-900"
              />
            </div>

            <nav className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {loading && <p className="text-[12px] text-neutral-400">Loading…</p>}
              {chapters.map((g) => {
                const list = g.chapters.filter((c) => c.show);
                if (!list.length) return null;
                return (
                  <div key={g.part}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 px-2 mb-1.5">
                      {g.short || g.part}
                    </p>
                    {list.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => { setActive(c.slug); setNavOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-[12.5px] transition-colors flex items-center gap-1.5 ${
                          active === c.slug
                            ? "bg-neutral-900 text-white font-medium"
                            : "text-neutral-600 hover:bg-neutral-100"
                        }`}
                      >
                        <ChevronRight size={12} className="flex-shrink-0 opacity-60" />
                        <span className="truncate">{c.title}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* content */}
        <main className="flex-1 min-w-0">
          {loading ? (
            <p className="text-sm text-neutral-400">Loading the manual…</p>
          ) : !current ? (
            <p className="text-sm text-neutral-400">Select a chapter from the contents.</p>
          ) : (
            <article>
              <p className="text-[11px] uppercase tracking-wider text-neutral-400 mb-2">
                {chapters.find((g) => g.chapters.some((c) => c.slug === current.slug))?.part}
              </p>
              <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight leading-tight">{current.title}</h1>
              <div className="h-[2px] w-12 bg-neutral-900 my-4" />
              <div className="flex flex-wrap gap-2 mb-6">
                {Array.isArray(current.roles) && current.roles.length > 0 && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">
                    Roles: {current.roles.map((r) => data?.roleLabels?.[r] || r).join(", ")}
                  </span>
                )}
                {current.roles === "*" && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">
                    Applies to every role
                  </span>
                )}
              </div>
              <div>
                {current.blocks.map((b, i) => (
                  <Block key={i} b={b} />
                ))}
              </div>

              <div className="mt-10 pt-5 border-t border-neutral-200 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer size={14} className="mr-1.5" /> Print this chapter
                </Button>
                <a href="/SMS_User_Manual.pdf" download>
                  <Button variant="outline" size="sm">
                    <Download size={14} className="mr-1.5" /> Download full manual (PDF)
                  </Button>
                </a>
                <Button size="sm" onClick={backToSystem}>
                  Back to system
                </Button>
              </div>
            </article>
          )}
        </main>
      </div>
    </div>
  );
}

function matchChapter(chapter, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (chapter.title.toLowerCase().includes(needle)) return true;
  return JSON.stringify(chapter.blocks).toLowerCase().includes(needle);
}