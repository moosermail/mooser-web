"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { PinIcon, FlagIcon } from "@/components/Icons";

export interface EmailWithState {
  id: string;
  from: string;
  subject: string;
  created_at: string;
  text?: string;
  is_read:    boolean;
  is_pinned:  boolean;
  is_hidden:  boolean;
  is_flagged: boolean;
}

type DateFilter = "all" | "today" | "week" | "month" | "flagged" | "hidden" | "custom";

interface Props {
  emails:        EmailWithState[];
  isHiddenView?: boolean;
  unreadStyle?:  string;
  unreadColor?:  string;
}

function formatDate(iso: string): string {
  try {
    const d   = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch { return iso; }
}

function inDateRange(iso: string, filter: DateFilter, customFrom?: string, customTo?: string): boolean {
  if (filter === "all" || filter === "flagged") return true;
  if (filter === "custom") {
    const d = new Date(iso).getTime();
    const f = customFrom ? new Date(customFrom).getTime() : 0;
    const t = customTo   ? new Date(customTo + "T23:59:59").getTime() : Date.now();
    return d >= f && d <= t;
  }
  const diff = Date.now() - new Date(iso).getTime();
  if (filter === "today") return diff < 86_400_000;
  if (filter === "week")  return diff < 7  * 86_400_000;
  if (filter === "month") return diff < 30 * 86_400_000;
  return true;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(59,130,246,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

async function patchState(emailId: string, patch: Record<string, unknown>) {
  await fetch("/api/email-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email_id: emailId, ...patch }),
  });
}

// ── Swipe hook ──────────────────────────────────────────

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove:  (e: React.TouchEvent) => void;
  onTouchEnd:   () => void;
  style: React.CSSProperties;
  swipeClass: string;
}

function useSwipe(
  onSwipeLeft:  () => void,
  onSwipeRight: () => void,
  threshold = 80
): SwipeHandlers {
  const startX  = useRef(0);
  const offsetX = useRef(0);
  const [dx, setDx]           = useState(0);
  const [swiping, setSwiping] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    offsetX.current = 0;
    setSwiping(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const delta = e.touches[0].clientX - startX.current;
    offsetX.current = delta;
    setDx(delta);
  }, [swiping]);

  const onTouchEnd = useCallback(() => {
    setSwiping(false);
    if (offsetX.current < -threshold) onSwipeLeft();
    else if (offsetX.current > threshold) onSwipeRight();
    setDx(0);
    offsetX.current = 0;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  const clamped = Math.max(-120, Math.min(120, dx));
  const style: React.CSSProperties = {
    transform: clamped !== 0 ? `translateX(${clamped}px)` : undefined,
    transition: swiping ? "none" : "transform .2s ease-out",
  };

  const swipeClass = clamped < -30 ? "swiping-left" : clamped > 30 ? "swiping-right" : "";

  return { onTouchStart, onTouchMove, onTouchEnd, style, swipeClass };
}

// ── Swipeable row ───────────────────────────────────────

function SwipeableRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel,
  rightLabel,
}: {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  leftLabel: string;
  rightLabel: string;
}) {
  const { onTouchStart, onTouchMove, onTouchEnd, style, swipeClass } = useSwipe(
    onSwipeLeft,
    onSwipeRight
  );

  return (
    <div className={`swipe-container ${swipeClass}`}>
      <div className="swipe-bg swipe-bg-left">{leftLabel}</div>
      <div className="swipe-bg swipe-bg-right">{rightLabel}</div>
      <div
        className="swipe-content"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────

export default function InboxClient({
  emails: init,
  isHiddenView = false,
  unreadStyle  = "dot",
  unreadColor  = "#3b82f6",
}: Props) {
  const [emails,     setEmails]     = useState(init);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  function markRead(id: string) {
    setEmails(p => p.map(e => e.id === id ? { ...e, is_read: true } : e));
    patchState(id, { is_read: true });
  }

  function toggleRead(id: string) {
    const cur = emails.find(e => e.id === id);
    if (!cur) return;
    setEmails(p => p.map(e => e.id === id ? { ...e, is_read: !e.is_read } : e));
    patchState(id, { is_read: !cur.is_read });
  }

  function togglePin(id: string) {
    const cur = emails.find(e => e.id === id);
    if (!cur) return;
    setEmails(p => p.map(e => e.id === id ? { ...e, is_pinned: !e.is_pinned } : e));
    patchState(id, { is_pinned: !cur.is_pinned });
  }

  function toggleFlag(id: string) {
    const cur = emails.find(e => e.id === id);
    if (!cur) return;
    setEmails(p => p.map(e => e.id === id ? { ...e, is_flagged: !e.is_flagged } : e));
    patchState(id, { is_flagged: !cur.is_flagged });
  }

  function toggleHide(id: string) {
    setEmails(p => p.filter(e => e.id !== id));
    patchState(id, { is_hidden: !isHiddenView });
  }

  // ── Selection ─────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map(e => e.id)));
  }

  function clearSelection() {
    setSelected(new Set());
    setSelectMode(false);
  }

  // ── Bulk actions ──────────────────────────────────────

  function bulkMarkRead() {
    setEmails(p => p.map(e => selected.has(e.id) ? { ...e, is_read: true } : e));
    selected.forEach(id => patchState(id, { is_read: true }));
    clearSelection();
  }

  function bulkMarkUnread() {
    setEmails(p => p.map(e => selected.has(e.id) ? { ...e, is_read: false } : e));
    selected.forEach(id => patchState(id, { is_read: false }));
    clearSelection();
  }

  function bulkHide() {
    setEmails(p => p.filter(e => !selected.has(e.id)));
    selected.forEach(id => patchState(id, { is_hidden: true }));
    clearSelection();
  }

  function bulkFlag() {
    setEmails(p => p.map(e => selected.has(e.id) ? { ...e, is_flagged: true } : e));
    selected.forEach(id => patchState(id, { is_flagged: true }));
    clearSelection();
  }

  function bulkUnhide() {
    setEmails(p => p.filter(e => !selected.has(e.id)));
    selected.forEach(id => patchState(id, { is_hidden: false }));
    clearSelection();
  }

  // ── Filtering / sorting ──────────────────────────────

  const sorted = [...emails].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filtered = sorted.filter(e => {
    if (dateFilter === "hidden") return e.is_hidden;
    if (dateFilter === "flagged") return e.is_flagged && !e.is_hidden;
    // Default views exclude hidden
    if (e.is_hidden) return false;
    if (!inDateRange(e.created_at, dateFilter, customFrom, customTo)) return false;
    if (unreadOnly && e.is_read) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const from = (e.from || "").toLowerCase();
      const subject = (e.subject || "").toLowerCase();
      const text = (e.text || "").toLowerCase();
      if (!from.includes(q) && !subject.includes(q) && !text.includes(q)) return false;
    }
    return true;
  });

  const unreadCount  = emails.filter(e => !e.is_read && !e.is_hidden).length;
  const flaggedCount = emails.filter(e => e.is_flagged && !e.is_hidden).length;

  // Pagination
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const hiddenCount = emails.filter(e => e.is_hidden).length;

  const DATE_FILTERS: { key: DateFilter; label: string }[] = [
    { key: "all",     label: "ALL"     },
    { key: "today",   label: "TODAY"   },
    { key: "week",    label: "WEEK"    },
    { key: "month",   label: "MONTH"   },
    { key: "flagged", label: "FLAGGED" },
    { key: "hidden",  label: `HIDDEN${hiddenCount > 0 ? ` (${hiddenCount})` : ""}` },
    { key: "custom",  label: "CUSTOM"  },
  ];

  const styleClass = `inbox-unread-${unreadStyle}`;
  const wrapperStyle = {
    "--unread-color": unreadColor,
    "--unread-bg":    hexToRgba(unreadColor, 0.09),
  } as React.CSSProperties;

  return (
    <div style={wrapperStyle}>
      <div className="toolbar">
        {selectMode ? (
          <>
            <button className="inbox-filter-btn active" onClick={clearSelection} style={{ marginRight: ".5rem" }}>
              CANCEL
            </button>
            <span className="toolbar-title">{selected.size} SELECTED</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: ".35rem" }}>
              <button className="email-action-btn" onClick={selectAll}>ALL</button>
              <button className="email-action-btn" onClick={bulkMarkRead}>READ</button>
              <button className="email-action-btn" onClick={bulkMarkUnread}>UNREAD</button>
              <button className="email-action-btn" onClick={bulkFlag}>FLAG</button>
              {isHiddenView ? (
                <button className="email-action-btn" onClick={bulkUnhide}>SHOW</button>
              ) : (
                <button className="email-action-btn email-action-hide" onClick={bulkHide}>HIDE</button>
              )}
            </div>
          </>
        ) : (
          <>
            <span className="toolbar-title">{isHiddenView ? "HIDDEN" : "INBOX"}</span>
            {unreadCount > 0 && !isHiddenView && (
              <span className="badge badge-count" style={{ marginLeft: ".5rem", fontSize: ".6rem" }}>
                {unreadCount} NEW
              </span>
            )}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: ".5rem" }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => { if (!searchQuery) setSearchFocused(false); }}
                style={{
                  background: "var(--mid)", border: "none", borderRadius: 100,
                  padding: ".4rem .85rem", fontSize: ".8rem", color: "var(--fg)",
                  outline: "none",
                  width: searchFocused || searchQuery ? 260 : 90,
                  transition: "width .25s ease",
                  fontFamily: "'Space Grotesk', sans-serif",
                  flexShrink: 0,
                }}
              />
              <button className="inbox-filter-btn" onClick={() => setSelectMode(true)}>SELECT</button>
              <span className="badge">{filtered.length}</span>
            </div>
          </>
        )}
      </div>

      <div className="inbox-filters">
        <div className="inbox-filter-group">
          {DATE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              className={`inbox-filter-btn${dateFilter === key ? " active" : ""}`}
              onClick={() => { setDateFilter(key); setPage(0); }}
            >
              {label}
            </button>
          ))}
        </div>
        {!isHiddenView && (
          <button
            className={`inbox-filter-btn${unreadOnly ? " active" : ""}`}
            onClick={() => { setUnreadOnly(v => !v); setPage(0); }}
          >
            UNREAD
          </button>
        )}
      </div>

      {dateFilter === "custom" && (
        <div className="inbox-custom-range">
          <label className="inbox-custom-label">FROM</label>
          <input
            type="date"
            className="inbox-date-input"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
          />
          <label className="inbox-custom-label">TO</label>
          <input
            type="date"
            className="inbox-date-input"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: "3rem 1rem" }}>
          <h2 style={{ fontSize: "1.4rem" }}>NOTHING HERE</h2>
          <p>No emails match your filters.</p>
        </div>
      ) : (
        <ul className={`email-list ${styleClass}`}>
          {paginated.map(email => (
            <li
              key={email.id}
              className={[
                "email-list-item",
                !email.is_read  ? "unread"  : "",
                email.is_pinned ? "pinned"  : "",
                email.is_flagged ? "flagged" : "",
                selected.has(email.id) ? "selected" : "",
              ].filter(Boolean).join(" ")}
            >
              <SwipeableRow
                onSwipeLeft={() => toggleHide(email.id)}
                onSwipeRight={() => toggleRead(email.id)}
                leftLabel={isHiddenView ? "SHOW" : "HIDE"}
                rightLabel={email.is_read ? "UNREAD" : "READ"}
              >
                <div className="email-row-inner">
                  {selectMode && (
                    <button
                      className={`select-checkbox${selected.has(email.id) ? " checked" : ""}`}
                      onClick={(e) => { e.preventDefault(); toggleSelect(email.id); }}
                      aria-label="Select email"
                    />
                  )}

                  <Link
                    href={selectMode ? "#" : `/inbox/${email.id}`}
                    className="email-item"
                    onClick={(e) => {
                      if (selectMode) {
                        e.preventDefault();
                        toggleSelect(email.id);
                      } else {
                        markRead(email.id);
                      }
                    }}
                  >
                    <div className="email-meta">
                      <div style={{ display: "flex", alignItems: "center", gap: ".35rem", minWidth: 0 }}>
                        {!email.is_read && unreadStyle !== "bold" && (
                          <span className="unread-dot" />
                        )}
                        {email.is_pinned  && <span className="pin-icon"  title="Pinned"><PinIcon  size={11} /></span>}
                        {email.is_flagged && <span className="flag-icon" title="Flagged"><FlagIcon size={11} /></span>}
                        <span className="email-from">{email.from}</span>
                      </div>
                      <span className="email-date">{formatDate(email.created_at)}</span>
                    </div>
                    <span className="email-subject" style={{ fontWeight: email.is_read ? 400 : 700 }}>
                      {email.subject || "(no subject)"}
                    </span>
                    {email.text && (
                      <span className="email-preview">{email.text.slice(0, 120)}</span>
                    )}
                  </Link>

                  <div className="email-actions">
                    <button
                      className="email-action-btn"
                      onClick={() => toggleRead(email.id)}
                      title={email.is_read ? "Mark unread" : "Mark read"}
                    >
                      {email.is_read ? "UNREAD" : "READ"}
                    </button>
                    <button
                      className="email-action-btn"
                      onClick={() => togglePin(email.id)}
                      title={email.is_pinned ? "Unpin" : "Pin"}
                    >
                      {email.is_pinned ? "UNPIN" : "PIN"}
                    </button>
                    <button
                      className={`email-action-btn${email.is_flagged ? " email-action-flagged" : ""}`}
                      onClick={() => toggleFlag(email.id)}
                      title={email.is_flagged ? "Unflag" : "Flag"}
                    >
                      {email.is_flagged ? "UNFLAG" : "FLAG"}
                    </button>
                    <button
                      className="email-action-btn email-action-hide"
                      onClick={() => toggleHide(email.id)}
                      title={isHiddenView ? "Unhide" : "Hide"}
                    >
                      {isHiddenView ? "SHOW" : "HIDE"}
                    </button>
                  </div>
                </div>
              </SwipeableRow>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", padding: "1rem", borderTop: "1px solid var(--mid)" }}>
          <button className="inbox-filter-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>PREV</button>
          <span style={{ fontSize: ".8rem", color: "var(--grey)" }}>{page + 1} / {totalPages}</span>
          <button className="inbox-filter-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>NEXT</button>
        </div>
      )}

      {dateFilter === "flagged" && flaggedCount === 0 && (
        <div className="empty-state" style={{ padding: "3rem 1rem" }}>
          <h2 style={{ fontSize: "1.4rem" }}>NO FLAGGED EMAILS</h2>
          <p>Flag emails using the FLAG button on hover.</p>
        </div>
      )}
    </div>
  );
}
