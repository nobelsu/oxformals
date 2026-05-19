"use client";

import { useQuery } from "convex/react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/convex/_generated/api";
import {
  buildMentionBody,
  clearMentionEditor,
  filterMentionCandidates,
  normalizeDisplayName,
  serializeMentionEditor,
  type MentionParticipant,
} from "@/lib/chat/mentions";

const EDITOR_MAX_HEIGHT_PX = 128;

export type MentionComposerHandle = {
  serialize: () => ReturnType<typeof serializeMentionEditor>;
  clear: () => void;
  setPlainText: (text: string) => void;
  isEmpty: () => boolean;
  focus: () => void;
};

type MentionTrigger = {
  query: string;
  range: Range;
};

type Props = {
  /** Shown when @ is typed with no search query (e.g. the other chat participant). */
  defaultMentionUsers?: MentionParticipant[];
  disabled?: boolean;
  placeholder?: string;
  onBodyChange?: (body: string) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
  onEnter?: () => void;
};

function isInsideMentionSpan(node: Node, root: HTMLElement): boolean {
  let current: Node | null = node;
  if (current.nodeType === Node.TEXT_NODE) {
    current = current.parentElement;
  }
  while (current && current !== root) {
    if (
      current instanceof HTMLElement &&
      current.hasAttribute("data-mention-user-id")
    ) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function findTextPosition(
  root: HTMLElement,
  targetIndex: number,
): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let counted = 0;
  let textNode = walker.nextNode();
  while (textNode) {
    const len = textNode.textContent?.length ?? 0;
    if (counted + len >= targetIndex) {
      return { node: textNode, offset: targetIndex - counted };
    }
    counted += len;
    textNode = walker.nextNode();
  }
  return null;
}

function getMentionTrigger(root: HTMLElement): MentionTrigger | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const cursorRange = sel.getRangeAt(0);
  if (!cursorRange.collapsed) return null;
  if (!root.contains(cursorRange.startContainer)) return null;
  if (isInsideMentionSpan(cursorRange.startContainer, root)) return null;

  const preRange = document.createRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(cursorRange.startContainer, cursorRange.startOffset);
  const textBefore = preRange.toString();

  // Only consider @ typed in editable text — ignore @ inside completed mention chips.
  let searchEnd = textBefore.length;
  while (searchEnd > 0) {
    const atIndex = textBefore.lastIndexOf("@", searchEnd - 1);
    if (atIndex === -1) return null;

    const startPos = findTextPosition(root, atIndex);
    if (!startPos) return null;

    if (isInsideMentionSpan(startPos.node, root)) {
      searchEnd = atIndex;
      continue;
    }

    const query = textBefore.slice(atIndex + 1);
    // Spaces end mention mode — multi-word names are chosen from the list (@john → John Smith).
    if (/[\s\n]/.test(query)) return null;

    const mentionRange = document.createRange();
    mentionRange.setStart(startPos.node, startPos.offset);
    mentionRange.setEnd(
      cursorRange.startContainer,
      cursorRange.startOffset,
    );

    return { query, range: mentionRange };
  }

  return null;
}

function insertMentionSpan(
  trigger: MentionTrigger,
  user: MentionParticipant,
) {
  const label = normalizeDisplayName(user.name);
  const range = trigger.range;
  range.deleteContents();

  const span = document.createElement("span");
  span.setAttribute("data-mention-user-id", user.id);
  span.setAttribute("data-mention-label", label);
  span.contentEditable = "false";
  span.className =
    "mx-0.5 inline rounded-md bg-[var(--ink)]/10 px-1 py-0.5 font-medium text-[var(--ink)]";
  span.textContent = buildMentionBody(label);

  range.insertNode(span);

  // Trailing text node so typing after a mention stays outside the chip.
  const tail = document.createTextNode("\u00A0");
  span.after(tail);

  const sel = window.getSelection();
  if (sel) {
    const after = document.createRange();
    after.setStart(tail, tail.length);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  }
}

export const MentionComposer = forwardRef<MentionComposerHandle, Props>(
  function MentionComposer(
    {
      defaultMentionUsers = [],
      disabled = false,
      placeholder = "@ to mention someone",
      onBodyChange,
      onEmptyChange,
      onEnter,
    },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [mentionTrigger, setMentionTrigger] = useState<MentionTrigger | null>(
      null,
    );
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const mentionQuery = mentionTrigger?.query ?? "";
    const useRemoteSearch = mentionTrigger !== null && mentionQuery.length >= 1;

    const searchResults = useQuery(
      api.chat.searchUsersForMention,
      useRemoteSearch ? { query: mentionQuery } : "skip",
    );

    const candidates = useMemo((): MentionParticipant[] => {
      if (!mentionTrigger) return [];

      if (useRemoteSearch) {
        return (searchResults ?? []).map((u) => ({
          id: u.id,
          name: u.name,
          ...(u.college ? { college: u.college } : {}),
        }));
      }

      return filterMentionCandidates(mentionQuery, defaultMentionUsers);
    }, [
      mentionTrigger,
      useRemoteSearch,
      mentionQuery,
      searchResults,
      defaultMentionUsers,
    ]);

    const syncBody = useCallback(() => {
      const root = editorRef.current;
      if (!root) return;
      const { body } = serializeMentionEditor(root);
      const empty = body.trim().length === 0;
      onBodyChange?.(body);
      onEmptyChange?.(empty);
    }, [onBodyChange, onEmptyChange]);

    const updateMentionTrigger = useCallback(() => {
      const root = editorRef.current;
      if (!root) {
        setMentionTrigger(null);
        return;
      }
      setMentionTrigger(getMentionTrigger(root));
      setHighlightedIndex(0);
    }, []);

    const resizeEditor = useCallback(() => {
      const root = editorRef.current;
      if (!root) return;
      root.style.height = "auto";
      root.style.height = `${Math.min(root.scrollHeight, EDITOR_MAX_HEIGHT_PX)}px`;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        serialize: () => {
          const root = editorRef.current;
          if (!root) return { body: "", mentions: [] };
          return serializeMentionEditor(root);
        },
        clear: () => {
          const root = editorRef.current;
          if (!root) return;
          clearMentionEditor(root);
          setMentionTrigger(null);
          onBodyChange?.("");
          onEmptyChange?.(true);
          resizeEditor();
        },
        setPlainText: (text: string) => {
          const root = editorRef.current;
          if (!root) return;
          clearMentionEditor(root);
          if (text) {
            root.appendChild(document.createTextNode(text));
          }
          setMentionTrigger(null);
          const empty = text.trim().length === 0;
          onBodyChange?.(text);
          onEmptyChange?.(empty);
          resizeEditor();
        },
        isEmpty: () => {
          const root = editorRef.current;
          if (!root) return true;
          return serializeMentionEditor(root).body.trim().length === 0;
        },
        focus: () => {
          const root = editorRef.current;
          if (!root) return;
          root.focus();
          const selection = window.getSelection();
          if (!selection) return;
          const range = document.createRange();
          range.selectNodeContents(root);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        },
      }),
      [onBodyChange, onEmptyChange, resizeEditor],
    );

    useEffect(() => {
      resizeEditor();
    });

    const selectCandidate = useCallback(
      (user: MentionParticipant) => {
        if (!mentionTrigger) return;
        insertMentionSpan(mentionTrigger, user);
        setMentionTrigger(null);
        syncBody();
        resizeEditor();
        editorRef.current?.focus();
      },
      [mentionTrigger, syncBody, resizeEditor],
    );

    const handleInput = useCallback(() => {
      syncBody();
      updateMentionTrigger();
      resizeEditor();
    }, [syncBody, updateMentionTrigger, resizeEditor]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (mentionTrigger && e.key === " ") {
          setMentionTrigger(null);
          return;
        }

        if (mentionTrigger && candidates.length > 0) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((i) => (i + 1) % candidates.length);
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex(
              (i) => (i - 1 + candidates.length) % candidates.length,
            );
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const picked = candidates[highlightedIndex];
            if (picked) selectCandidate(picked);
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setMentionTrigger(null);
            return;
          }
        }

        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter?.();
        }
      },
      [
        mentionTrigger,
        candidates,
        highlightedIndex,
        selectCandidate,
        onEnter,
      ],
    );

    const showPopover = mentionTrigger !== null;
    const searchLoading = useRemoteSearch && searchResults === undefined;

    return (
      <div className="relative min-w-0 flex-1">
        {showPopover ? (
          <div
            role="listbox"
            className="absolute bottom-full left-0 z-20 mb-2 w-full max-w-xs overflow-hidden rounded-xl border-[2px] border-[var(--ink)]/20 bg-[var(--paper)] shadow-lg"
          >
            {searchLoading ? (
              <p className="px-3 py-2 text-sm text-[var(--ink-soft)]">
                Searching…
              </p>
            ) : candidates.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[var(--ink-soft)]">
                {useRemoteSearch
                  ? "No matches"
                  : "Type a name to search for someone to mention"}
              </p>
            ) : (
              <ul>
                {candidates.map((user, index) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === highlightedIndex}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectCandidate(user);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        index === highlightedIndex
                          ? "bg-[var(--ink)]/10"
                          : "hover:bg-[var(--ink)]/5"
                      }`}
                    >
                      <Avatar name={user.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        {user.college ? (
                          <p className="truncate text-xs text-[var(--ink-soft)]">
                            {user.college}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-placeholder={placeholder}
          data-placeholder={placeholder}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="mention-composer max-h-32 min-h-11 overflow-y-auto rounded-xl border-[2px] border-[var(--ink)]/20 bg-[var(--paper)] px-3 py-2.5 text-base leading-5 outline-none focus:border-[var(--ink)] md:text-sm empty:before:pointer-events-none empty:before:text-[var(--ink-soft)] empty:before:content-[attr(data-placeholder)]"
        />
      </div>
    );
  },
);
