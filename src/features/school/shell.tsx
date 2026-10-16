import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  BookOpen,
  House,
  History,
  Settings,
  Users,
  ShieldCheck,
  LogOut,
  ArrowUpRight,
  Menu,
  X,
  CalendarDays,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/sthq-logo.png";
import { schoolQuery } from "./queries";
export function SchoolShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string | undefined;
}) {
  const { data } = useSuspenseQuery(schoolQuery);
  const [menu, setMenu] = useState(false);
  const me = data.profiles.find((p) => p.id === data.userId);
  const role = data.roles.find((r) => r.user_id === data.userId)?.role;
  const nav = [
    { to: "/beranda", label: "Beranda", icon: House },
    { to: "/setoran", label: "Input setoran", icon: BookOpen },
    { to: "/riwayat", label: "Riwayat santri", icon: History },
    { to: "/pengaturan", label: "Pengaturan akun", icon: Settings },
  ] as const;
  return (
    <div className="school-app">
      <aside className={`school-sidebar ${menu ? "is-open" : ""}`}>
        <Link to="/beranda" className="school-brand">
          <img src={logoUrl} alt="Logo STHQ" />
          <span>
            Mutaba’ah<span>Tahfidz Hidayah Qur’an</span>
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="close-menu"
          onClick={() => setMenu(false)}
          aria-label="Tutup menu"
        >
          <X />
        </Button>
        <div className="sidebar-label">RUANG MUTABA’AH</div>
        <nav>
          {nav
            .filter((n) => n.to != "/setoran" || role !== "pengawas")
            .map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeProps={{ className: "active" }}
                onClick={() => setMenu(false)}
              >
                <n.icon size={19} />
                {n.label}
              </Link>
            ))}
          {(role === "admin" || role === "ustadz") && (
            <Link
              to="/kalender"
              activeProps={{ className: "active" }}
              onClick={() => setMenu(false)}
            >
              <CalendarDays size={19} />
              Kalender Sekolah
            </Link>
          )}
          {role === "admin" && (
            <Link to="/admin" activeProps={{ className: "active" }}>
              <Users size={19} />
              Administrasi
            </Link>
          )}
          {(role === "pengawas" || role === "admin") && (
            <Link to="/pengawas" activeProps={{ className: "active" }}>
              <ShieldCheck size={19} />
              Pengawasan
            </Link>
          )}
        </nav>
        <div className="sidebar-school">
          <img src={logoUrl} alt="" />
          <p>
            Sekolah Tahfidz
            <br />
            Hidayah Qur’an
          </p>
          <Link to="/tentang">
            Tentang sekolah <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="sidebar-person">
          <span className="avatar">{me?.nama?.slice(0, 1) || "A"}</span>
          <span>
            {me?.nama || "Akun sekolah"}
            <small>{role || "Menunggu peran"}</small>
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Keluar"
            title="Keluar"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            <LogOut size={17} />
          </Button>
        </div>
      </aside>
      <div className="school-main">
        <header className="topbar">
          <Button
            variant="ghost"
            size="icon"
            className="menu-button"
            onClick={() => setMenu(true)}
            aria-label="Buka menu"
          >
            <Menu />
          </Button>
          <span>
            Sekolah Tahfidz Hidayah Qur’an <span className="topbar-tag">STHQ Jakarta</span>
          </span>
          <span className="topbar-status">
            <i />
            Tahun ajaran {data.periods[0]?.tahun_ajaran || "—"}
          </span>
        </header>
        <main className="page-content">
          <div className="page-title">
            <div>
              <p className="eyebrow">MUTABA’AH TAHFIDZ</p>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <span className="date-label">
              {new Intl.DateTimeFormat("id-ID", {
                dateStyle: "full",
                timeZone: "Asia/Jakarta",
              }).format(new Date())}
            </span>
          </div>
          {children}
        </main>
        <footer className="app-footer">
          STHQ Jakarta <span>Menumbuhkan generasi Qur’ani.</span>
        </footer>
      </div>
    </div>
  );
}
