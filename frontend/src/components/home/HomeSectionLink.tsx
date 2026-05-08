"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";

type HomeSectionLinkProps = {
  sectionId: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
};

export default function HomeSectionLink({
  sectionId,
  className,
  children,
  onNavigate,
}: HomeSectionLinkProps) {
  const href = `/#${sectionId}`;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onNavigate?.();

    if (window.location.pathname !== "/") return;

    event.preventDefault();
    window.history.pushState(null, "", href);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
