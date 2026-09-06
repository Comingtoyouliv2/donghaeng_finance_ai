"use client";

import { useState } from "react";
import type { MouseEvent } from "react";

type WorkspaceView = "admin" | "interview";

interface WorkspaceTopbarProps {
  active: WorkspaceView;
}

export default function WorkspaceTopbar({ active }: WorkspaceTopbarProps) {
  const [movingTo, setMovingTo] = useState<WorkspaceView | null>(null);
  const visualActive = movingTo ?? active;

  function navigate(event: MouseEvent<HTMLAnchorElement>, destination: string) {
    event.preventDefault();
    window.location.assign(destination);
  }

  function navigateWorkspace(event: MouseEvent<HTMLAnchorElement>, destination: string, target: WorkspaceView) {
    event.preventDefault();
    if (movingTo || target === active) return;
    setMovingTo(target);
    window.setTimeout(() => window.location.assign(destination), 400);
  }

  return (
    <header className="workspace-topbar">
      <a href="/" className="workspace-topbar-brand" onClick={(event) => navigate(event, "/")}>
        동행금융
      </a>
      <nav
        aria-label="주요 화면"
        data-active={visualActive}
        data-moving-to={movingTo ?? undefined}
        aria-busy={Boolean(movingTo)}
      >
        <span className="workspace-nav-indicator" aria-hidden="true" />
        <a
          href="/admin"
          aria-current={active === "admin" ? "page" : undefined}
          onClick={(event) => navigateWorkspace(event, "/admin", "admin")}
        >
          관리자 대시보드
        </a>
        <a
          href="/demo"
          aria-current={active === "interview" ? "page" : undefined}
          onClick={(event) => navigateWorkspace(event, "/demo", "interview")}
        >
          인터뷰 화면
        </a>
      </nav>
    </header>
  );
}
