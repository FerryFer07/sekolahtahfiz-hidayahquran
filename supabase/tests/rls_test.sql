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
-- Rujukan uji: satu disetujui (dipakai fixture ayat), satu masih usulan.
insert into public.rujukan(id, jenis, judul, status, disahkan_oleh_nama) values
  ('44444444-0000-0000-0000-000000000001', 'mushaf', 'RLS Mushaf disetujui', 'disetujui', 'Ustadz Penguji'),
  ('44444444-0000-0000-0000-000000000002', 'mushaf', 'RLS Mushaf usulan', 'usulan', '');
insert into public.quran_ayat(id, surah, ayat, juz, halaman, baris_awal, baris_akhir, teks_utsmani, rujukan_id) values
  (1, 1, 1, 1, 1, 1, 1, 'RLS teks uji 1', '44444444-0000-0000-0000-000000000001'),
  (2, 1, 2, 1, 1, 2, 2, 'RLS teks uji 2', '44444444-0000-0000-0000-000000000001')
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
             and tablename not in ('pengaturan_sekolah', 'periode', 'quran_surah', 'quran_ayat', 'kalender_sekolah', 'rujukan', 'hukum_tajwid') loop
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

-- ------------------------------------------------------------------ kalender sekolah & hari efektif
-- Pekan 19–25 Okt 2026 (Senin–Minggu) tanpa libur umum; pekan 26 Okt–1 Nov dengan libur umum Rabu 28 Okt.
-- Halaqah Y punya kegiatan khusus Kamis 22 Okt. Anak A sakit Selasa 20 Okt; Anak B alpa Rabu 21 Okt.
insert into public.kalender_sekolah(tanggal, jenis, keterangan, halaqah_id, dibuat_oleh) values
  ('2026-10-28', 'libur', 'RLS libur umum', null, '00000000-0000-0000-0000-0000000000a1'),
  ('2026-10-22', 'kegiatan', 'RLS kegiatan halaqah Y', '11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2');
insert into public.kehadiran(santri_id, tanggal, status, dicatat_oleh) values
  ('22222222-0000-0000-0000-000000000001', '2026-10-20', 'sakit', '00000000-0000-0000-0000-0000000000b1'),
  ('22222222-0000-0000-0000-000000000002', '2026-10-21', 'alpa', '00000000-0000-0000-0000-0000000000b1');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek((select count(*) from public.hari_efektif('11111111-0000-0000-0000-000000000001', '2026-10-19', '2026-10-25')) = 5,
    'hari_efektif = 5 untuk pekan normal Senin–Jumat');
  perform rls_test.cek((select count(*) from public.hari_efektif('11111111-0000-0000-0000-000000000001', '2026-10-26', '2026-11-01')) = 4,
    'hari_efektif = 4 bila ada 1 libur umum');
  perform rls_test.cek((select count(*) from public.hari_efektif('11111111-0000-0000-0000-000000000002', '2026-10-19', '2026-10-25')) = 4,
    'kegiatan khusus halaqah Y mengurangi hari efektif halaqah Y');
  perform rls_test.cek(public.hari_hadir_efektif('22222222-0000-0000-0000-000000000001', '2026-10-19', '2026-10-25') = 4,
    'santri sakit 1 hari mendapat hari_hadir_efektif 4');
  perform rls_test.cek(public.hari_hadir_efektif('22222222-0000-0000-0000-000000000002', '2026-10-19', '2026-10-25') = 5,
    'alpa tidak mengurangi hari_hadir_efektif secara bawaan');
  perform rls_test.cek(not rls_test.ditolak($q$insert into public.kalender_sekolah(tanggal, jenis, halaqah_id, dibuat_oleh)
    values ('2026-11-02', 'ujian_sekolah', null, '00000000-0000-0000-0000-0000000000a1')$q$),
    'admin dapat menambah kalender umum');
end $$;
reset role;

update public.pengaturan_sekolah set alpa_kurangi_target = true where id = 1;
insert into public.pengaturan_sekolah(id, alpa_kurangi_target) select 1, true
where not exists (select 1 from public.pengaturan_sekolah where id = 1);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(public.hari_hadir_efektif('22222222-0000-0000-0000-000000000002', '2026-10-19', '2026-10-25') = 4,
    'alpa mengurangi hari_hadir_efektif bila alpa_kurangi_target aktif');
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(not rls_test.ditolak($q$insert into public.kalender_sekolah(tanggal, jenis, halaqah_id, dibuat_oleh)
    values ('2026-11-03', 'kegiatan', '11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1')$q$),
    'ustadz X dapat menambah kegiatan halaqah X');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.kalender_sekolah(tanggal, jenis, halaqah_id, dibuat_oleh)
    values ('2026-11-03', 'kegiatan', '11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1')$q$),
    'ustadz X tidak dapat menambah kalender halaqah Y');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.kalender_sekolah(tanggal, jenis, halaqah_id, dibuat_oleh)
    values ('2026-11-03', 'libur', null, '00000000-0000-0000-0000-0000000000b1')$q$),
    'ustadz tidak dapat menambah kalender umum');
  perform rls_test.cek(rls_test.ditolak($q$delete from public.kalender_sekolah where keterangan = 'RLS kegiatan halaqah Y'$q$),
    'ustadz X tidak dapat menghapus kalender halaqah Y');
  perform rls_test.cek(rls_test.ditolak($q$delete from public.kalender_sekolah where keterangan = 'RLS libur umum'$q$),
    'ustadz tidak dapat menghapus libur umum');
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.kalender_sekolah where keterangan like 'RLS %'$q$) = 2,
    'wali dapat membaca kalender sekolah');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.kalender_sekolah(tanggal, jenis, halaqah_id, dibuat_oleh)
    values ('2026-11-04', 'libur', null, '00000000-0000-0000-0000-0000000000e1')$q$),
    'wali tidak dapat menambah kalender');
  perform rls_test.cek(public.hari_hadir_efektif('22222222-0000-0000-0000-000000000002', '2026-10-19', '2026-10-25') is null,
    'wali A tidak mendapat hari_hadir_efektif anak wali B');
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah('select 1 from public.kalender_sekolah') = -1,
    'anon tidak dapat membaca kalender sekolah');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.hari_efektif(null, '2026-10-19', '2026-10-25')$q$) = -1,
    'anon tidak dapat menjalankan hari_efektif');
end $$;
reset role;

-- ------------------------------------------------------------------ fondasi: multi-peran, kepsek, tu, rujukan & hukum tajwid
insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'rls-kepsek@example.test'),
  ('00000000-0000-0000-0000-0000000000f2', 'rls-tu@example.test'),
  ('00000000-0000-0000-0000-0000000000f3', 'rls-ustadz-wali@example.test');
insert into public.user_roles(user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'kepsek'),
  ('00000000-0000-0000-0000-0000000000f2', 'tu'),
  ('00000000-0000-0000-0000-0000000000f3', 'ustadz'),
  ('00000000-0000-0000-0000-0000000000f3', 'wali');
update public.profiles set persetujuan_data_pada = now() where id = '00000000-0000-0000-0000-0000000000f3';
-- Ustadz-wali: mengampu halaqah Y dan wali dari anak B (halaqah X).
update public.halaqah set ustadz_id = '00000000-0000-0000-0000-0000000000f3' where id = '11111111-0000-0000-0000-000000000002';
insert into public.wali_santri(wali_id, santri_id) values
  ('00000000-0000-0000-0000-0000000000f3', '22222222-0000-0000-0000-000000000002');

do $$
begin
  perform rls_test.cek(rls_test.ditolak($q$insert into public.quran_ayat(id, surah, ayat, juz, halaman, baris_awal, baris_akhir, teks_utsmani)
    values (3, 1, 3, 1, 1, 3, 3, 'RLS teks uji 3')$q$),
    'ayat tanpa rujukan ditolak (juga untuk pemilik database)');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.quran_ayat(id, surah, ayat, juz, halaman, baris_awal, baris_akhir, teks_utsmani, rujukan_id)
    values (3, 1, 3, 1, 1, 3, 3, 'RLS teks uji 3', '44444444-0000-0000-0000-000000000002')$q$),
    'ayat dengan rujukan berstatus usulan ditolak');
  perform rls_test.cek(rls_test.ditolak($q$update public.hukum_tajwid set penjelasan = 'RLS penjelasan' where kode = 'ikhafa'$q$),
    'penjelasan hukum tajwid tanpa rujukan ditolak');
  perform rls_test.cek(not rls_test.ditolak($q$update public.hukum_tajwid set penjelasan = 'RLS penjelasan', rujukan_id = '44444444-0000-0000-0000-000000000001' where kode = 'ikhafa'$q$),
    'penjelasan hukum tajwid dengan rujukan disetujui diterima');
  perform rls_test.cek(rls_test.ditolak($q$update public.rujukan set status = 'ditolak' where id = '44444444-0000-0000-0000-000000000001'$q$),
    'rujukan yang masih dipakai konten tidak dapat dibatalkan');
  perform rls_test.cek(rls_test.ditolak($q$update public.rujukan set status = 'disetujui', disahkan_oleh_nama = '' where id = '44444444-0000-0000-0000-000000000002'$q$),
    'pengesahan rujukan wajib mencantumkan nama ustadz pengesah');
  perform rls_test.cek((select disetujui_pada is not null from public.rujukan where id = '44444444-0000-0000-0000-000000000001'),
    'tanggal pengesahan rujukan terisi otomatis');
  perform rls_test.cek((select count(*) from public.hukum_tajwid where penjelasan = '' and bait_matan = '' and contoh = '' and kode <> 'ikhafa') = 16,
    'isi awal hukum tajwid tanpa penjelasan karangan');
end $$;

-- ustadz X: data referensi agama baca-saja
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah('select 1 from public.quran_ayat where id in (1, 2)') = 2, 'ustadz dapat membaca quran_ayat');
  perform rls_test.cek(rls_test.ditolak($q$update public.quran_ayat set teks_utsmani = 'diubah' where id = 1$q$),
    'ustadz tidak dapat mengubah quran_ayat');
  perform rls_test.cek(rls_test.ditolak($q$delete from public.quran_ayat where id = 2$q$), 'ustadz tidak dapat menghapus quran_ayat');
  perform rls_test.cek(rls_test.ditolak($q$update public.quran_surah set nama_latin = 'diubah' where id = 1$q$),
    'ustadz tidak dapat mengubah quran_surah');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.rujukan(jenis, judul) values ('tafsir', 'RLS usulan ustadz')$q$),
    'ustadz tidak dapat menambah rujukan');
  perform rls_test.cek(rls_test.ditolak($q$update public.rujukan set status = 'disetujui', disahkan_oleh_nama = 'x' where id = '44444444-0000-0000-0000-000000000002'$q$),
    'ustadz tidak dapat mengesahkan rujukan');
  perform rls_test.cek(rls_test.ditolak($q$update public.hukum_tajwid set warna_hex = '#000000' where kode = 'ghunnah'$q$),
    'ustadz tidak dapat mengubah hukum tajwid');
  perform rls_test.cek(rls_test.ditolak($q$select public.atur_peran_user('00000000-0000-0000-0000-0000000000b1', array['admin']::public.app_role[])$q$),
    'ustadz tidak dapat mengatur peran');
end $$;
reset role;

-- kepala sekolah: baca semua, tulis tidak
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where nis like 'RLS-%'$q$) = 4, 'kepsek membaca semua santri');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.halaqah where nama like 'RLS %'$q$) = 2, 'kepsek membaca semua halaqah');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.setoran_iqro where id::text like '33333333-%'$q$) >= 3, 'kepsek membaca semua setoran');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.kehadiran k join public.santri s on s.id = k.santri_id where s.nis like 'RLS-%'$q$) >= 3,
    'kepsek membaca semua kehadiran');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.wali_santri where santri_id::text like '22222222-%'$q$) >= 3, 'kepsek membaca relasi wali');
  perform rls_test.cek(rls_test.ditolak($q$update public.santri set catatan = 'Diubah kepsek' where nis = 'RLS-001'$q$), 'kepsek tidak dapat mengubah santri');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.kehadiran(santri_id, tanggal, status, dicatat_oleh)
    values ('22222222-0000-0000-0000-000000000001', '2026-10-20', 'hadir', '00000000-0000-0000-0000-0000000000f1')$q$),
    'kepsek tidak dapat mencatat kehadiran');
  perform rls_test.cek(rls_test.ditolak($q$update public.setoran_iqro set nilai = 'ulang' where id = '33333333-0000-0000-0000-000000000003'$q$),
    'kepsek tidak dapat mengubah nilai');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-0000000000f1', 'admin')$q$),
    'kepsek tidak dapat menaikkan perannya');
end $$;
reset role;

-- tata usaha: kelola data induk santri, tanpa akses setoran/kehadiran
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where nis like 'RLS-%'$q$) = 4, 'tu membaca semua santri');
  perform rls_test.cek(not rls_test.ditolak($q$update public.santri set nama = 'Anak Y (tu)', kelas = '2' where nis = 'RLS-003'$q$),
    'tu dapat mengubah data induk santri');
  perform rls_test.cek(not rls_test.ditolak($q$insert into public.santri(nis, nama, kelas, jalur) values ('RLS-005', 'Anak baru', '1', 'iqro')$q$),
    'tu dapat menambah santri');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.setoran_iqro where id::text like '33333333-%'$q$) = 0, 'tu tidak membaca setoran');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.kehadiran$q$) = 0, 'tu tidak membaca kehadiran');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-0000000000f2', 'admin')$q$),
    'tu tidak dapat menaikkan perannya');
  perform rls_test.cek(rls_test.ditolak($q$update public.quran_surah set nama_latin = 'diubah' where id = 1$q$), 'tu tidak dapat mengubah quran_surah');
end $$;
reset role;

-- satu akun dengan dua peran (ustadz halaqah Y + wali anak B): hak keduanya berlaku, tidak lebih
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where nis in ('RLS-002', 'RLS-003')$q$) = 2,
    'ustadz-wali melihat santri halaqahnya dan anaknya');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri where nis in ('RLS-001', 'RLS-004')$q$) = 0,
    'ustadz-wali tidak melihat santri lain');
  perform rls_test.cek(not rls_test.ditolak($q$insert into public.setoran_iqro(santri_id, tanggal, tempat, jilid, halaman_dari, halaman_sampai, disimak, diisi_oleh)
    values ('22222222-0000-0000-0000-000000000002', '2026-10-20', 'rumah', 1, 1, 2, true, '00000000-0000-0000-0000-0000000000f3')$q$),
    'ustadz-wali dapat mengisi setoran rumah anaknya');
  perform rls_test.cek(rls_test.ditolak($q$insert into public.setoran_iqro(santri_id, tanggal, tempat, jilid, halaman_dari, halaman_sampai, nilai, diisi_oleh)
    values ('22222222-0000-0000-0000-000000000002', '2026-10-20', 'sekolah', 1, 1, 2, 'lancar', '00000000-0000-0000-0000-0000000000f3')$q$),
    'ustadz-wali tidak dapat mengisi setoran sekolah untuk anaknya di halaqah lain');
  perform rls_test.cek(not rls_test.ditolak($q$insert into public.setoran_iqro(santri_id, tanggal, tempat, jilid, halaman_dari, halaman_sampai, nilai, diisi_oleh)
    values ('22222222-0000-0000-0000-000000000003', '2026-10-20', 'sekolah', 1, 1, 2, 'lancar', '00000000-0000-0000-0000-0000000000f3')$q$),
    'ustadz-wali dapat mengisi setoran sekolah di halaqahnya');
end $$;
reset role;

-- admin: atur multi-peran
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$
begin
  perform public.atur_peran_user('00000000-0000-0000-0000-0000000000f2', array['tu', 'bendahara']::public.app_role[]);
  perform rls_test.cek((select array_agg(role::text order by role::text) from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000f2') = array['bendahara', 'tu'],
    'admin dapat memberi beberapa peran sekaligus');
  perform public.atur_peran_user('00000000-0000-0000-0000-0000000000f2', array['tu']::public.app_role[]);
  perform rls_test.cek((select count(*) from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000f2') = 1,
    'admin dapat mencabut peran');
  perform rls_test.cek(rls_test.ditolak($q$select public.atur_peran_user('00000000-0000-0000-0000-0000000000a1', array['ustadz']::public.app_role[])$q$),
    'admin tidak dapat mencabut peran admin sendiri');
  perform rls_test.cek(not rls_test.ditolak($q$insert into public.rujukan(jenis, judul) values ('tafsir', 'RLS usulan admin')$q$),
    'admin dapat menambah usulan rujukan');
end $$;
reset role;

-- anon tetap tertutup untuk tabel baru
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah('select 1 from public.rujukan') = -1, 'anon tidak dapat membaca rujukan');
  perform rls_test.cek(rls_test.jumlah('select 1 from public.hukum_tajwid') = -1, 'anon tidak dapat membaca hukum tajwid');
end $$;
reset role;

-- ------------------------------------------------------------------ data induk siswa & santri_pribadi
insert into public.santri_pribadi(santri_id, nik, nama_ayah, hp_ayah, alamat, catatan_kesehatan) values
  ('22222222-0000-0000-0000-000000000001', '3174000000000001', 'RLS Ayah A', '081100000001', 'RLS alamat A', 'RLS alergi A'),
  ('22222222-0000-0000-0000-000000000002', '3174000000000002', 'RLS Ayah B', '081100000002', 'RLS alamat B', 'RLS alergi B'),
  ('22222222-0000-0000-0000-000000000003', '3174000000000003', 'RLS Ayah Y', '081100000003', 'RLS alamat Y', 'RLS alergi Y');

do $$
begin
  perform rls_test.cek(rls_test.ditolak($q$update public.santri_pribadi set nik = '123' where santri_id = '22222222-0000-0000-0000-000000000001'$q$),
    'NIK harus 16 digit');
  update public.santri set status = 'pindah' where nis = 'RLS-004';
  perform rls_test.cek((select not aktif from public.santri where nis = 'RLS-004'), 'status pindah otomatis menonaktifkan santri');
  update public.santri set status = 'aktif' where nis = 'RLS-004';
end $$;

-- ustadz X: tidak membaca tabel pribadi; kontak wali hanya untuk santri halaqahnya; tidak melihat kesehatan
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah('select 1 from public.santri_pribadi') = 0, 'ustadz tidak dapat membaca santri_pribadi (NIK, KK, alamat)');
  perform rls_test.cek(rls_test.ditolak($q$update public.santri_pribadi set alamat = 'diubah' where santri_id = '22222222-0000-0000-0000-000000000001'$q$),
    'ustadz tidak dapat mengubah santri_pribadi');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.kontak_wali_santri() where santri_id = '22222222-0000-0000-0000-000000000001' and hp_ayah = '081100000001'$q$) = 1,
    'ustadz melihat kontak wali santri halaqahnya');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.kontak_wali_santri() where santri_id = '22222222-0000-0000-0000-000000000003'$q$) = 0,
    'ustadz tidak melihat kontak wali halaqah lain');
  perform rls_test.cek(rls_test.jumlah('select 1 from public.kesehatan_santri()') = 0, 'ustadz halaqah tidak melihat catatan kesehatan');
  perform rls_test.cek(rls_test.ditolak($q$update public.santri set status = 'keluar' where nis = 'RLS-001'$q$),
    'ustadz tidak dapat mengubah status santri');
end $$;
reset role;

-- wali A: tidak membaca tabel pribadi; kontak & kesehatan hanya anaknya sendiri
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah('select 1 from public.santri_pribadi') = 0, 'wali tidak dapat membaca santri_pribadi');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.kesehatan_santri() where catatan_kesehatan = 'RLS alergi A'$q$) = 1,
    'wali melihat catatan kesehatan anaknya');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.kesehatan_santri() where santri_id <> '22222222-0000-0000-0000-000000000001'$q$) = 0,
    'wali tidak melihat catatan kesehatan anak lain');
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.kontak_wali_santri() where santri_id = '22222222-0000-0000-0000-000000000002'$q$) = 0,
    'wali tidak melihat kontak wali lain');
end $$;
reset role;

-- pengawas: tidak membaca data pribadi
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah('select 1 from public.santri_pribadi') = 0, 'pengawas tidak dapat membaca santri_pribadi');
  perform rls_test.cek(rls_test.jumlah('select 1 from public.kesehatan_santri()') = 0, 'pengawas tidak melihat catatan kesehatan');
  perform rls_test.cek(rls_test.jumlah('select 1 from public.kontak_wali_santri()') = 0, 'pengawas tidak melihat kontak wali');
end $$;
reset role;

-- tata usaha: kelola data pribadi
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri_pribadi where nama_ayah like 'RLS %'$q$) = 3, 'tu membaca santri_pribadi');
  perform rls_test.cek(not rls_test.ditolak($q$insert into public.santri_pribadi(santri_id, nama_ibu)
    values ('22222222-0000-0000-0000-000000000004', 'RLS Ibu T')$q$), 'tu dapat menambah data pribadi');
  perform rls_test.cek(not rls_test.ditolak($q$update public.santri set status = 'lulus' where nis = 'RLS-003'$q$), 'tu dapat mengubah status santri');
end $$;
reset role;

-- kepala sekolah: baca data pribadi, tidak menulis
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah($q$select 1 from public.santri_pribadi where nama_ayah like 'RLS %'$q$) = 3, 'kepsek membaca santri_pribadi');
  perform rls_test.cek(rls_test.ditolak($q$update public.santri_pribadi set alamat = 'diubah' where santri_id = '22222222-0000-0000-0000-000000000001'$q$),
    'kepsek tidak dapat mengubah santri_pribadi');
end $$;
reset role;

-- anon: fungsi kontak & kesehatan tertutup
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  perform rls_test.cek(rls_test.jumlah('select 1 from public.kontak_wali_santri()') = -1, 'anon tidak dapat memanggil kontak_wali_santri');
  perform rls_test.cek(rls_test.jumlah('select 1 from public.santri_pribadi') = -1, 'anon tidak dapat membaca santri_pribadi');
end $$;
reset role;

rollback;
