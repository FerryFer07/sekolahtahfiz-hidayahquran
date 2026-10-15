import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Eye,
  EyeOff,
  BookOpen,
  ShieldCheck,
  Heart,
  ArrowUpRight,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/sthq-logo.png.asset.json";
export function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reset, setReset] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/beranda" });
    });
  }, [navigate]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (reset) {
        const r = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (r.error) throw r.error;
        setSent(true);
      } else {
        const r = await supabase.auth.signInWithPassword({ email, password });
        if (r.error) throw r.error;
        await navigate({ to: "/beranda" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat masuk. Coba kembali.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link to="/" className="auth-brand">
          <img src={logo.url} alt="Logo Sekolah Tahfidz Hidayah Qur'an" />
          <span>
            SEKOLAH TAHFIDZ
            <br />
            <strong>Hidayah Qur’an</strong>
          </span>
        </Link>
        <Link to="/tentang" className="about-link">
          Tentang STHQ <ArrowUpRight size={16} />
        </Link>
      </header>
      <main className="auth-main">
        <section className="auth-intro">
          <span className="auth-kicker">
            <span />
            RUANG TUMBUH GENERASI QUR’ANI
          </span>
          <h1>
            Mutaba’ah
            <br />
            <span>Tahfidz.</span>
          </h1>
          <p className="auth-description">
            Setiap ayat, setiap langkah.
            <br />
            Bersama mendampingi perjalanan hafalan ananda.
          </p>
          <div className="intro-divider" />
          <div className="school-identity">
            <BookOpen size={24} />
            <div>
              <strong>Sekolah Tahfidz Hidayah Qur’an</strong>
              <span>Jakarta Barat · Sekolah Dasar non-asrama</span>
            </div>
          </div>
          <blockquote>
            “Terwujudnya generasi Hafidz Al-Qur’an yang paham agama dan berkarakter Qur’ani.”
            <span>VISI STHQ</span>
          </blockquote>
          <div className="auth-values">
            <span>
              <Heart size={16} />
              Pendampingan bersama
            </span>
            <span>
              <ShieldCheck size={16} />
              Data ananda terlindungi
            </span>
          </div>
        </section>
        <section className="auth-form-area">
          <div className="form-emblem">
            <BookOpen size={27} />
          </div>
          <p className="eyebrow">BISMILLAHIRRAHMANIRRAHIM</p>
          <h2>{reset ? "Lupa kata sandi?" : "Assalamu’alaikum."}</h2>
          <p className="auth-form-subtitle">
            {reset
              ? "Kami akan mengirim tautan untuk mengganti kata sandi."
              : "Masuk untuk melanjutkan mutaba’ah hari ini."}
          </p>
          {sent ? (
            <div className="success-note">
              <Mail />
              <h3>Periksa email Anda</h3>
              <p>Tautan penggantian kata sandi telah dikirim. Periksa juga folder spam.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              {!reset && (
                <label>
                  <span className="password-label">
                    Kata sandi
                    <Button type="button" variant="link" onClick={() => setReset(true)}>
                      Lupa kata sandi?
                    </Button>
                  </span>
                  <span className="password-input">
                    <input
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      autoComplete="current-password"
                      required
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff /> : <Eye />}
                    </Button>
                  </span>
                </label>
              )}
              {error && (
                <p className="error-note" role="alert">
                  {error}
                </p>
              )}
              <Button size="lg" className="login-submit" disabled={busy}>
                {busy ? "Mohon tunggu…" : reset ? "Kirim tautan" : "Masuk ke mutaba’ah"}
                <ArrowRight size={18} />
              </Button>
            </form>
          )}
          {reset ? (
            <Button
              variant="link"
              onClick={() => {
                setReset(false);
                setSent(false);
              }}
            >
              Kembali ke halaman masuk
            </Button>
          ) : (
            <div className="account-note">
              <ShieldCheck size={18} />
              <p>
                Akun diberikan oleh pihak sekolah.
                <br />
                <span>Belum memiliki akun? Hubungi admin STHQ.</span>
              </p>
            </div>
          )}
          <div className="form-footer">Satu ikhtiar kecil, untuk hafalan yang terjaga.</div>
        </section>
      </main>
      <footer className="auth-footer">
        <span>© 2026 STHQ Jakarta</span>
        <span>Al-Qur’an di hati, akhlak dalam keseharian.</span>
        <span>Mutaba’ah Tahfidz</span>
      </footer>
    </div>
  );
}
