-- Kalender sekolah dan perhitungan hari efektif. Lihat docs/rls-matrix.md.
alter table public.pengaturan_sekolah add column alpa_kurangi_target boolean not null default false;

create table public.kalender_sekolah(
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  jenis text not null check(jenis in('libur','ujian_sekolah','kegiatan')),
  keterangan text not null default '',
  halaqah_id uuid references public.halaqah(id) on delete cascade,
  dibuat_oleh uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index kalender_sekolah_tanggal_idx on public.kalender_sekolah(tanggal);
grant select,insert,update,delete on public.kalender_sekolah to authenticated;
grant all on public.kalender_sekolah to service_role;
alter table public.kalender_sekolah enable row level security;

-- Kalender bukan data pribadi: semua user login boleh membaca.
create policy calendar_read on public.kalender_sekolah for select to authenticated using(true);
create policy calendar_admin on public.kalender_sekolah for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
-- Ustadz hanya mengelola baris untuk halaqah yang ia ampu (bukan kalender umum, bukan halaqah lain).
create policy calendar_ustadz on public.kalender_sekolah for all to authenticated
  using(halaqah_id is not null and public.has_role(auth.uid(),'ustadz') and exists(select 1 from public.halaqah h where h.id=halaqah_id and h.ustadz_id=auth.uid()))
  with check(halaqah_id is not null and dibuat_oleh=auth.uid() and public.has_role(auth.uid(),'ustadz') and exists(select 1 from public.halaqah h where h.id=halaqah_id and h.ustadz_id=auth.uid()));

-- Tanggal di rentang yang termasuk hari sekolah dan tidak ada di kalender (umum atau untuk halaqah itu).
create function public.hari_efektif(p_halaqah_id uuid,p_mulai date,p_selesai date) returns setof date language sql stable set search_path=public as $$
  select d::date from generate_series(p_mulai,p_selesai,interval '1 day') d
  where exists(
    select 1 from unnest(coalesce((select hari_sekolah from public.pengaturan_sekolah where id=1),array['Senin','Selasa','Rabu','Kamis','Jumat'])) h
    where lower(trim(h))=(array['senin','selasa','rabu','kamis','jumat','sabtu','minggu'])[extract(isodow from d)::int]
  )
  and not exists(
    select 1 from public.kalender_sekolah k
    where k.tanggal=d::date and (k.halaqah_id is null or k.halaqah_id=p_halaqah_id)
  )
  order by 1
$$;

-- Hari efektif dikurangi hari sakit/izin (dan alpa bila pengaturan_sekolah.alpa_kurangi_target).
-- NULL bila santri tidak terlihat oleh pemanggil (RLS).
create function public.hari_hadir_efektif(p_santri_id uuid,p_mulai date,p_selesai date) returns integer language sql stable set search_path=public as $$
  select (
    select count(*) from public.hari_efektif(s.halaqah_id,p_mulai,p_selesai) d
    where not exists(
      select 1 from public.kehadiran k
      where k.santri_id=s.id and k.tanggal=d
        and (k.status in('sakit','izin') or (k.status='alpa' and coalesce((select alpa_kurangi_target from public.pengaturan_sekolah where id=1),false)))
    )
  )::integer
  from public.santri s where s.id=p_santri_id
$$;

revoke all on function public.hari_efektif(uuid,date,date) from public,anon;
revoke all on function public.hari_hadir_efektif(uuid,date,date) from public,anon;
grant execute on function public.hari_efektif(uuid,date,date) to authenticated,service_role;
grant execute on function public.hari_hadir_efektif(uuid,date,date) to authenticated,service_role;
