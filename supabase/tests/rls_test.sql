-- Uji skenario RLS Mutaba'ah Tahfidz.
-- Menjalankan: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- (atau otomatis lewat `npm test`, lihat src/test/rls-sql.test.ts).
-- Seluruh skrip berjalan dalam satu transaksi dan di-ROLLBACK di akhir, jadi aman di database mana pun.
-- Skenario gagal menghentikan skrip dengan pesan 'GAGAL: ...'.
begin;

-- ------------------------------------------------------------------ helper
create schema rls_test;
grant usage on schema rls_test to anon, authenticated;

create function rls_test.cek(ok boolean, pesan text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'GAGAL: %', pesan; end if;
  raise notice 'LULUS: %', pesan;
end $$;

-- Jumlah baris yang terlihat; -1 bila query ditolak (mis. permission denied).
create function rls_test.jumlah(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) x', q) into n;
  return n;
exception when others then return -1;
end $$;

-- true bila perintah tulis ditolak: error, atau tidak ada baris yang tersentuh.
create function rls_test.ditolak(q text) returns boolean language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return n = 0;
exception when others then return true;
end $$;

grant execute on all functions in schema rls_test to anon, authenticated;

-- ------------------------------------------------------------------ fixture
insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'rls-admin@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'rls-ustadz-x@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'rls-ustadz-y@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'rls-badal-aktif@example.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'rls-badal-selesai@example.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'rls-pengawas@example.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'rls-wali-a@example.test'),
  ('00000000-0000-0000-0000-0000000000e2', 'rls-wali-b@example.test');

insert into public.user_roles(user_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin'),
  ('00000000-0000-0000-0000-0000000000b1', 'ustadz'),
  ('00000000-0000-0000-0000-0000000000b2', 'ustadz'),
  ('00000000-0000-0000-0000-0000000000c1', 'badal'),
  ('00000000-0000-0000-0000-0000000000c2', 'badal'),
  ('00000000-0000-0000-0000-0000000000d1', 'pengawas'),
  ('00000000-0000-0000-0000-0000000000e1', 'wali'),
  ('00000000-0000-0000-0000-0000000000e2', 'wali');

update public.profiles set persetujuan_data_pada = now()
where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');

insert into public.halaqah(id, nama, ustadz_id, pengawas_id, tahun_ajaran) values
  ('11111111-0000-0000-0000-000000000001', 'RLS Halaqah X', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', '2026/2027'),
  ('11111111-0000-0000-0000-000000000002', 'RLS Halaqah Y', '00000000-0000-0000-0000-0000000000b2', null, '2026/2027');

-- Badal aktif (hari ini dalam masa tugas) dan badal yang masa tugasnya berakhir kemarin, keduanya di halaqah Y.
insert into public.penugasan_badal(halaqah_id, ustadz_id, mulai, selesai) values
  ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c1',
   (now() at time zone 'Asia/Jakarta')::date - 1, (now() at time zone 'Asia/Jakarta')::date + 1),
  ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c2',
   (now() at time zone 'Asia/Jakarta')::date - 10, (now() at time zone 'Asia/Jakarta')::date - 1);

insert into public.quran_surah(id, nama_latin, nama_arab, jumlah_ayat) values (1, 'Al-Fatihah', 'الفاتحة', 7)
on conflict (id) do nothing;
insert into public.quran_ayat(id, surah, ayat, juz, halaman, baris_awal, baris_akhir, teks_utsmani) values
  (1, 1, 1, 1, 1, 1, 1, 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'),
  (2, 1, 2, 1, 1, 2, 2, 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ')
on conflict (id) do nothing;

-- anak A & anak T milik wali A; anak B milik wali B (ketiganya di halaqah X); anak Y di halaqah Y.
insert into public.santri(id, nis, nama, kelas, halaqah_id, jalur) values
  ('22222222-0000-0000-0000-000000000001', 'RLS-001', 'Anak A', '1', '11111111-0000-0000-0000-000000000001', 'iqro'),
  ('22222222-0000-0000-0000-000000000002', 'RLS-002', 'Anak B', '1', '11111111-0000-0000-0000-000000000001', 'iqro'),
  ('22222222-0000-0000-0000-000000000003', 'RLS-003', 'Anak Y', '1', '11111111-0000-0000-0000-000000000002', 'iqro'),
  ('22222222-0000-0000-0000-000000000004', 'RLS-004', 'Anak T', '1', '11111111-0000-0000-0000-000000000001', 'tahfidz');

insert into public.wali_santri(wali_id, santri_id) values
  ('00000000-0000-0000-0000-0000000000e1', '22222222-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000e1', '22222222-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-0000000000e2', '22222222-0000-0000-0000-000000000002');

insert into public.setoran_iqro(id, santri_id, tanggal, tempat, jilid, halaman_dari, halaman_sampai, nilai, diisi_oleh) values
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '2026-10-15', 'sekolah', 1, 1, 2, 'lancar', '00000000-0000-0000-0000-0000000000b1'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', '2026-10-15', 'sekolah', 1, 1, 2, 'lancar', '00000000-0000-0000-0000-0000000000b1'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', '2026-10-15', 'sekolah', 1, 1, 2, 'lancar', '00000000-0000-0000-0000-0000000000b2');

insert into public.kehadiran(santri_id, tanggal, status, dicatat_oleh) values
  ('22222222-0000-0000-0000-000000000001', '2026-10-15', 'hadir', '00000000-0000-0000-0000-0000000000b1'),
  ('22222222-0000-0000-0000-000000000002', '2026-10-15', 'sakit', '00000000-0000-0000-0000-0000000000b1'),
  ('22222222-0000-0000-0000-000000000003', '2026-10-15', 'hadir', '00000000-0000-0000-0000-0000000000b2');

-- ------------------------------------------------------------------ struktur (dijalankan sebagai pemilik)
do $$
declare
  t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    perform rls_test.cek(false, format('RLS aktif pada public.%s', t));
  end loop;
  perform rls_test.cek(true, 'RLS aktif pada semua tabel public');

  for t in select tablename || '.' || policyname from pg_policies
           where schemaname = 'public' and (qual = 'true' or with_check = 'true')
             and tablename not in ('pengaturan_sekolah', 'periode', 'quran_surah', 'quran_ayat') loop
    perform rls_test.cek(false, format('tidak ada policy USING(true) di luar data referensi: %s', t));
  end loop;
  perform rls_test.cek(true, 'policy USING(true) hanya pada data referensi (baca, authenticated)');

  for t in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef
             and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') loop
    perform rls_test.cek(false, format('SECURITY DEFINER %s punya search_path', t));
  end loop;
  perform rls_test.cek(true, 'semua fungsi SECURITY DEFINER mengunci search_path');

  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
             and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert')
               or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete')) loop
    perform rls_test.cek(false, format('anon tidak punya hak tabel pada public.%s', t));
  end loop;
  perform rls_test.cek(true, 'anon tidak punya hak tabel apa pun di public');

  for t in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute') loop
    perform rls_test.cek(false, format('anon tidak dapat menjalankan %s', t));
  end loop;
  perform rls_test.cek(true, 'anon tidak dapat menjalankan fungsi SECURITY DEFINER');
end $$;

-- ------------------------------------------------------------------ anon
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare
  t text;
begin
  foreach t in array array['profiles','user_roles','pengaturan_sekolah','periode','halaqah','penugasan_badal',
    'quran_surah','quran_ayat','santri','wali_santri','setoran','setoran_iqro','kehadiran'] loop
    perform rls_test.cek(rls_test.jumlah(format('select 1 from public.%I', t)) <= 0,
      format('anon tidak dapat membaca public.%s', t));
  end loop;
  perform rls_test.cek(rls_test.jumlah('select 1 from storage.objects') <= 0, 'anon tidak dapat membaca storage.objects');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.kehadiran(santri_id, tanggal, status, dicatat_oleh)
    values ('22222222-0000-0000-0000-000000000001', '2026-10-16', 'hadir', '00000000-0000-0000-0000-0000000000b1')$q$),
    'anon tidak dapat menulis kehadiran');
end $$;
reset role;

-- ------------------------------------------------------------------ wali A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where nis like 'RLS-%'$q$) = 2,
    'wali A hanya melihat 2 anaknya sendiri');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where id = '22222222-0000-0000-0000-000000000002'$q$) = 0,
    'wali A tidak melihat santri anak wali B');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.setoran_iqro where santri_id = '22222222-0000-0000-0000-000000000002'$q$) = 0,
    'wali A tidak melihat setoran anak wali B');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.kehadiran where santri_id = '22222222-0000-0000-0000-000000000002'$q$) = 0,
    'wali A tidak melihat kehadiran anak wali B');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.wali_santri where wali_id = '00000000-0000-0000-0000-0000000000e2'$q$) = 0,
    'wali A tidak melihat relasi wali B');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000e2'$q$) = 0,
    'wali A tidak melihat profil wali B');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.setoran_iqro where santri_id = '22222222-0000-0000-0000-000000000001'$q$) = 1,
    'wali A melihat setoran anaknya sendiri');

  perform rls_test.cek(rls_test.ditolak($q$insert into public.setoran_iqro(santri_id, tanggal, tempat, jilid, halaman_dari, halaman_sampai, diisi_oleh)
    values ('22222222-0000-0000-0000-000000000001', '2026-10-16', 'sekolah', 1, 1, 2, '00000000-0000-0000-0000-0000000000e1')$q$),
    'wali tidak dapat insert setoran Iqro tempat=sekolah');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.setoran(santri_id, tanggal, jenis, tempat, dari_ayat_id, sampai_ayat_id, diisi_oleh)
    values ('22222222-0000-0000-0000-000000000004', '2026-10-16', 'sabaq', 'sekolah', 1, 2, '00000000-0000-0000-0000-0000000000e1')$q$),
    'wali tidak dapat insert setoran tahfidz tempat=sekolah');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.setoran_iqro(santri_id, tanggal, tempat, jilid, halaman_dari, halaman_sampai, diisi_oleh)
    values ('22222222-0000-0000-0000-000000000002', '2026-10-16', 'rumah', 1, 1, 2, '00000000-0000-0000-0000-0000000000e1')$q$),
    'wali tidak dapat insert setoran rumah untuk anak wali lain');
  perform rls_test.cek(not rls_test.ditolak($q$insert into public.setoran_iqro(santri_id, tanggal, tempat, jilid, halaman_dari, halaman_sampai, disimak, diisi_oleh)
    values ('22222222-0000-0000-0000-000000000001', '2026-10-16', 'rumah', 1, 1, 2, true, '00000000-0000-0000-0000-0000000000e1')$q$),
    'wali dapat insert setoran rumah untuk anaknya sendiri');

  perform rls_test.cek(rls_test.ditolak($q$update public.setoran_iqro set nilai = 'ulang'
    where id = '33333333-0000-0000-0000-000000000001'$q$),
    'wali tidak dapat mengubah nilai setoran sekolah');
  perform rls_test.cek(rls_test.ditolak($q$update public.setoran_iqro set catatan = 'diubah wali'
    where id = '33333333-0000-0000-0000-000000000002'$q$),
    'wali tidak dapat mengubah setoran anak wali lain');
  perform rls_test.cek(rls_test.ditolak($q$delete from public.setoran_iqro where id = '33333333-0000-0000-0000-000000000001'$q$),
    'wali tidak dapat menghapus setoran');
  perform rls_test.cek(rls_test.ditolak($q$update public.kehadiran set status = 'hadir'
    where santri_id = '22222222-0000-0000-0000-000000000001'$q$),
    'wali tidak dapat mengubah kehadiran');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.user_roles(user_id, role)
    values ('00000000-0000-0000-0000-0000000000e1', 'admin')$q$),
    'wali tidak dapat menaikkan perannya sendiri');

  perform rls_test.cek(not rls_test.ditolak($q$update public.setoran_iqro
    set diparaf_oleh = '00000000-0000-0000-0000-0000000000e1', diparaf_pada = now()
    where id = '33333333-0000-0000-0000-000000000001'$q$),
    'wali dapat memaraf setoran sekolah anaknya');
  perform rls_test.cek(rls_test.ditolak($q$update public.setoran_iqro
    set diparaf_oleh = '00000000-0000-0000-0000-0000000000e1', diparaf_pada = now()
    where id = '33333333-0000-0000-0000-000000000001'$q$),
    'wali tidak dapat menimpa paraf yang sudah ada');
end $$;
reset role;

-- ------------------------------------------------------------------ wali sebelum persetujuan data
update public.profiles set persetujuan_data_pada = null where id = '00000000-0000-0000-0000-0000000000e2';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where nis like 'RLS-%'$q$) = 0,
    'wali B tanpa persetujuan data tidak melihat santri mana pun');
end $$;
reset role;

-- ------------------------------------------------------------------ ustadz halaqah X
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.halaqah where id = '11111111-0000-0000-0000-000000000002'$q$) = 0,
    'ustadz X tidak melihat halaqah Y');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where nis like 'RLS-%'$q$) = 3,
    'ustadz X hanya melihat 3 santri halaqah X');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where id = '22222222-0000-0000-0000-000000000003'$q$) = 0,
    'ustadz X tidak melihat santri halaqah Y');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.setoran_iqro where santri_id = '22222222-0000-0000-0000-000000000003'$q$) = 0,
    'ustadz X tidak melihat setoran halaqah Y');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.kehadiran where santri_id = '22222222-0000-0000-0000-000000000003'$q$) = 0,
    'ustadz X tidak melihat kehadiran halaqah Y');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.kehadiran(santri_id, tanggal, status, dicatat_oleh)
    values ('22222222-0000-0000-0000-000000000003', '2026-10-16', 'hadir', '00000000-0000-0000-0000-0000000000b1')$q$),
    'ustadz X tidak dapat mencatat kehadiran halaqah Y');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.setoran_iqro(santri_id, tanggal, tempat, jilid, halaman_dari, halaman_sampai, nilai, diisi_oleh)
    values ('22222222-0000-0000-0000-000000000003', '2026-10-16', 'sekolah', 1, 1, 2, 'lancar', '00000000-0000-0000-0000-0000000000b1')$q$),
    'ustadz X tidak dapat insert setoran halaqah Y');
  perform rls_test.cek(not rls_test.ditolak($q$insert into public.kehadiran(santri_id, tanggal, status, dicatat_oleh)
    values ('22222222-0000-0000-0000-000000000001', '2026-10-16', 'hadir', '00000000-0000-0000-0000-0000000000b1')$q$),
    'ustadz X dapat mencatat kehadiran halaqah X');
  perform rls_test.cek(rls_test.ditolak($q$update public.santri set nama = 'Diubah ustadz'
    where id = '22222222-0000-0000-0000-000000000001'$q$),
    'ustadz tidak dapat mengubah data induk santri');
  perform rls_test.cek(rls_test.ditolak($q$update public.santri set halaqah_id = '11111111-0000-0000-0000-000000000002'
    where id = '22222222-0000-0000-0000-000000000001'$q$),
    'ustadz tidak dapat memindahkan santri ke halaqah lain');
  perform rls_test.cek(not rls_test.ditolak($q$update public.santri set catatan = 'Lancar'
    where id = '22222222-0000-0000-0000-000000000001'$q$),
    'ustadz dapat memperbarui catatan santri halaqahnya');
end $$;
reset role;

-- ------------------------------------------------------------------ badal aktif vs. masa tugas selesai
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where id = '22222222-0000-0000-0000-000000000003'$q$) = 1,
    'badal aktif melihat santri halaqah tugasnya');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where halaqah_id = '11111111-0000-0000-0000-000000000001'$q$) = 0,
    'badal aktif tidak melihat halaqah lain');
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.halaqah where id = '11111111-0000-0000-0000-000000000002'$q$) = 0,
    'badal setelah masa tugas tidak melihat halaqah');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where nis like 'RLS-%'$q$) = 0,
    'badal setelah masa tugas tidak melihat santri');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.setoran_iqro where santri_id = '22222222-0000-0000-0000-000000000003'$q$) = 0,
    'badal setelah masa tugas tidak melihat setoran');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.kehadiran(santri_id, tanggal, status, dicatat_oleh)
    values ('22222222-0000-0000-0000-000000000003', '2026-10-17', 'hadir', '00000000-0000-0000-0000-0000000000c2')$q$),
    'badal setelah masa tugas tidak dapat mencatat kehadiran');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.setoran_iqro(santri_id, tanggal, tempat, jilid, halaman_dari, halaman_sampai, nilai, diisi_oleh)
    values ('22222222-0000-0000-0000-000000000003', '2026-10-17', 'sekolah', 1, 1, 2, 'lancar', '00000000-0000-0000-0000-0000000000c2')$q$),
    'badal setelah masa tugas tidak dapat insert setoran');
end $$;
reset role;

-- ------------------------------------------------------------------ pengawas
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where nis like 'RLS-%'$q$) = 3,
    'pengawas hanya melihat santri halaqah yang diawasinya');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.setoran_iqro(santri_id, tanggal, tempat, jilid, halaman_dari, halaman_sampai, nilai, diisi_oleh)
    values ('22222222-0000-0000-0000-000000000001', '2026-10-17', 'sekolah', 1, 1, 2, 'lancar', '00000000-0000-0000-0000-0000000000d1')$q$),
    'pengawas tidak dapat insert setoran');
  perform rls_test.cek(rls_test.ditolak($q$update public.setoran_iqro set nilai = 'ulang'
    where id = '33333333-0000-0000-0000-000000000001'$q$),
    'pengawas tidak dapat mengubah nilai');
end $$;
reset role;

-- ------------------------------------------------------------------ admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where nis like 'RLS-%'$q$) = 4,
    'admin melihat semua santri');
  perform rls_test.cek(not rls_test.ditolak($q$update public.santri set nama = 'Anak A (admin)'
    where id = '22222222-0000-0000-0000-000000000001'$q$),
    'admin dapat mengubah data induk santri');
end $$;
reset role;

rollback;
