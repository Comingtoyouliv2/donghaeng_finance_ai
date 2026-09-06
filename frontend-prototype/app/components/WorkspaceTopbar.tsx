"use client";

import type { MouseEvent } from "react";

interface WorkspaceTopbarProps {
  active: "admin" | "interview";
}

export default function WorkspaceTopbar({ active }: WorkspaceTopbarProps) {
  function navigate(event: MouseEvent<HTMLAnchorElement>, destination: string) {
    event.preventDefault();
    window.location.assign(destination);
  }

  return (
    <header className="workspace-topbar">
      <a href="/" className="workspace-topbar-brand" onClick={(event) => navigate(event, "/")}>
        동행금융
      </a>
      <nav aria-label="주요 화면">
        <a
          href="/admin"
          aria-current={active === "admin" ? "page" : undefined}
          onClick={(event) => navigate(event, "/admin")}
        >
          관리자 대시보드
        </a>
        <a
          href="/demo"
          aria-current={active === "interview" ? "page" : undefined}
          onClick={(event) => navigate(event, "/demo")}
        >
          인터뷰 화면
        </a>
      </nav>
    </header>
  );
}
