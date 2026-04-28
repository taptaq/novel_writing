"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { GraphDetailState } from "@/lib/graph-view";
import { GraphCanvasInfoBar } from "@/components/graph-canvas-info-bar";

interface GraphFullscreenDialogProps {
  isOpen: boolean;
  title: string;
  scopeLabel: string;
  selectedNodeName?: string;
  detail: GraphDetailState;
  onClose: () => void;
  children: ReactNode;
}

export function GraphFullscreenDialog({
  isOpen,
  title,
  scopeLabel,
  selectedNodeName,
  detail,
  onClose,
  children
}: GraphFullscreenDialogProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const shell = shellRef.current;
    const previousBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    shell?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !shell) {
        return;
      }

      const focusableElements = Array.from(
        shell.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);

      if (focusableElements.length === 0) {
        event.preventDefault();
        shell.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previousActiveElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="graph-fullscreen-overlay" role="dialog" aria-modal="true" aria-label="放大查看关系图">
      <div className="graph-fullscreen-backdrop" onClick={onClose} />

      <div ref={shellRef} className="graph-fullscreen-shell" tabIndex={-1}>
        <GraphCanvasInfoBar
          title={title}
          scopeLabel={scopeLabel}
          selectedNodeName={selectedNodeName}
          onClose={onClose}
        />

        <div className="graph-fullscreen-stage">{children}</div>

        {detail.kind === "node" ? (
          <div className="graph-fullscreen-detail-card">
            <strong>{detail.node.name}</strong>
            <span>{detail.node.type}</span>
            {detail.node.summary ? <p>{detail.node.summary}</p> : null}
            <ul className="plain-list compact-list">
              {detail.relations.slice(0, 3).map((item) => (
                <li key={item.edge.id}>
                  {item.target.name}
                  {item.edge.description ? ` · ${item.edge.description}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
