-- Fondasi lanjutan: multi-peran, akses kepsek/tu, rujukan agama, hukum tajwid. Lihat docs/rls-matrix.md.

-- 1. Multi-peran: admin mengganti seluruh peran user sekaligus.
create function public.atur_peran_user(_user uuid,_roles public.app_role[]) returns void language plpgsql security definer set search_path=public as $$begin if not public.has_role(auth.uid(),'admin') then raise exception 'Akses admin diperlukan';
end if;
if _user=auth.uid() and not ('admin'=any(_roles)) then raise exception 'Admin tidak dapat mencabut peran admin sendiri';
end if;
delete from public.user_roles where user_id=_user and not (role=any(_roles));
insert into public.user_roles(user_id,role) select _user,r from unnest(_roles) r on conflict do nothing;
end$$;
revoke all on function public.atur_peran_user(uuid,public.app_role[]) from public,anon;
grant execute on function public.atur_peran_user(uuid,public.app_role[]) to authenticated;

-- 2. Kepala sekolah: baca-saja seluruh data sekolah.
create or replace function public.can_read_halaqah(_halaqah uuid) returns boolean language sql stable security definer set search_path=public as $$select public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'kepsek') or public.teaches_halaqah(_halaqah) or (public.has_role(auth.uid(),'pengawas') and exists(select 1 from public.halaqah where id=_halaqah and pengawas_id=auth.uid())) or (public.has_role(auth.uid(),'wali') and public.consent_ready() and exists(select 1 from public.santri s join public.wali_santri w on w.santri_id=s.id where s.halaqah_id=_halaqah and w.wali_id=auth.uid()))$$;
create or replace function public.can_read_santri(_santri uuid) returns boolean language sql stable security definer set search_path=public as $$select public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'kepsek') or public.owns_child(_santri) or exists(select 1 from public.santri s where s.id=_santri and (public.teaches_halaqah(s.halaqah_id) or (public.has_role(auth.uid(),'pengawas') and exists(select 1 from public.halaqah h where h.id=s.halaqah_id and h.pengawas_id=auth.uid()))))$$;
do $$declare t text;
begin foreach t in array array['profiles','user_roles','penugasan_badal','wali_santri'] loop execute format('create policy kepsek_read on public.%I for select to authenticated using(public.has_role(auth.uid(),''kepsek''))',t);
end loop;
end$$;

-- 3. Tata usaha: kelola data induk santri dan relasi wali (bukan setoran/kehadiran).
create policy tu_manage on public.santri for all to authenticated using(public.has_role(auth.uid(),'tu')) with check(public.has_role(auth.uid(),'tu'));
create policy tu_manage on public.wali_santri for all to authenticated using(public.has_role(auth.uid(),'tu')) with check(public.has_role(auth.uid(),'tu'));
create policy tu_read on public.halaqah for select to authenticated using(public.has_role(auth.uid(),'tu'));
create policy tu_read on public.profiles for select to authenticated using(public.has_role(auth.uid(),'tu'));
create policy tu_read on public.user_roles for select to authenticated using(public.has_role(auth.uid(),'tu'));
create or replace function public.guard_santri_update() returns trigger language plpgsql set search_path=public as $$begin if auth.uid() is not null and not public.has_role(auth.uid(),'admin') and not public.has_role(auth.uid(),'tu') and (to_jsonb(new)-array['posisi_hafalan_ayat_id','catatan']) is distinct from (to_jsonb(old)-array['posisi_hafalan_ayat_id','catatan']) then raise exception 'Ustadz hanya dapat mengubah posisi hafalan dan catatan santri';
end if;
return new;
end$$;

-- 4. Rujukan agama: hanya rujukan berstatus 'disetujui' yang boleh dipakai konten.
create table public.rujukan(
  id uuid primary key default gen_random_uuid(),
  jenis text not null check(jenis in('mushaf','terjemah','tafsir','hadits','tajwid','lainnya')),
  judul text not null,
  penulis text not null default '',
  pentahqiq text not null default '',
  penerbit text not null default '',
  edisi text not null default '',
  lisensi_atau_izin text not null default '',
  status text not null default 'usulan' check(status in('usulan','disetujui','ditolak')),
  disahkan_oleh_nama text not null default '',
  disetujui_pada timestamptz,
  catatan text not null default '',
  created_at timestamptz not null default now()
);
grant select,insert,update,delete on public.rujukan to authenticated;
grant all on public.rujukan to service_role;
alter table public.rujukan enable row level security;
create policy rujukan_read on public.rujukan for select to authenticated using(true);
create policy admin_manage on public.rujukan for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));

create function public.validasi_rujukan() returns trigger language plpgsql set search_path=public as $$begin if new.status='disetujui' then if trim(new.disahkan_oleh_nama)='' then raise exception 'Nama ustadz pengesah wajib diisi';
end if;
if tg_op='INSERT' or old.status<>'disetujui' then new.disetujui_pada=now();
end if;
else new.disetujui_pada=null;
end if;
if tg_op='UPDATE' and old.status='disetujui' and new.status<>'disetujui' and (exists(select 1 from public.quran_ayat where rujukan_id=old.id) or exists(select 1 from public.hukum_tajwid where rujukan_id=old.id)) then raise exception 'Rujukan masih dipakai konten; ganti rujukan konten terlebih dahulu';
end if;
return new;
end$$;

-- 5. Hukum tajwid: kode cocok dengan kelas markup teks_tajwid; penjelasan diisi asatidzah.
create table public.hukum_tajwid(
  kode text primary key check(kode ~ '^[a-z_]+$'),
  nama text not null,
  kelompok text not null check(kelompok in('mad','nun_mim_sukun','ghunnah','qalqalah','lam','lainnya')),
  warna_hex text not null check(warna_hex ~ '^#[0-9a-fA-F]{6}$'),
  penjelasan text not null default '',
  bait_matan text not null default '',
  contoh text not null default '',
  rujukan_id uuid references public.rujukan(id)
);
grant select,insert,update,delete on public.hukum_tajwid to authenticated;
grant all on public.hukum_tajwid to service_role;
alter table public.hukum_tajwid enable row level security;
create policy hukum_tajwid_read on public.hukum_tajwid for select to authenticated using(true);
create policy admin_manage on public.hukum_tajwid for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
-- Isi awal: kode kelas markup tajwid umum, nama, kelompok, dan warna. Penjelasan, bait matan, dan contoh sengaja kosong.
insert into public.hukum_tajwid(kode,nama,kelompok,warna_hex) values
  ('ham_wasl','Hamzah washl','lainnya','#AAAAAA'),
  ('slnt','Huruf tidak dibaca','lainnya','#AAAAAA'),
  ('laam_shamsiyah','Lam syamsiyah','lam','#AAAAAA'),
  ('madda_normal','Mad thabi''i','mad','#537FFF'),
  ('madda_permissible','Mad jaiz munfashil','mad','#4050FF'),
  ('madda_obligatory','Mad wajib muttashil','mad','#000EBC'),
  ('madda_necessary','Mad lazim','mad','#000EBC'),
  ('qalaqah','Qalqalah','qalqalah','#DD0008'),
  ('ikhafa','Ikhfa'' haqiqi','nun_mim_sukun','#9400A8'),
  ('ikhafa_shafawi','Ikhfa'' syafawi','nun_mim_sukun','#D500B7'),
  ('iqlab','Iqlab','nun_mim_sukun','#26BFFD'),
  ('idgham_ghunnah','Idgham bighunnah','nun_mim_sukun','#169777'),
  ('idgham_wo_ghunnah','Idgham bilaghunnah','nun_mim_sukun','#169200'),
  ('idgham_shafawi','Idgham mimi','nun_mim_sukun','#58B800'),
  ('idgham_mutajanisayn','Idgham mutajanisain','lainnya','#A1A1A1'),
  ('idgham_mutaqaribayn','Idgham mutaqaribain','lainnya','#A1A1A1'),
  ('ghunnah','Ghunnah','ghunnah','#FF7E1E');

-- 6. Mushaf: teks bermarkup tajwid dan rujukan per ayat; preferensi tampilan tajwid per akun.
alter table public.quran_ayat add column teks_tajwid text not null default '';
alter table public.quran_ayat add column rujukan_id uuid references public.rujukan(id);
alter table public.profiles add column tampilkan_tajwid boolean not null default true;

-- quran_ayat wajib punya rujukan disetujui; hukum_tajwid wajib bila penjelasan/bait/contoh diisi.
create function public.wajib_rujukan_disetujui() returns trigger language plpgsql set search_path=public as $$begin if new.rujukan_id is null then if tg_table_name='quran_ayat' then raise exception 'Konten agama wajib memakai rujukan yang disetujui';
end if;
if trim(new.penjelasan||new.bait_matan||new.contoh)<>'' then raise exception 'Penjelasan hukum tajwid wajib memakai rujukan yang disetujui';
end if;
return new;
end if;
if not exists(select 1 from public.rujukan where id=new.rujukan_id and status='disetujui') then raise exception 'Rujukan belum disetujui asatidzah';
end if;
return new;
end$$;

revoke all on function public.validasi_rujukan() from public,anon;
revoke all on function public.wajib_rujukan_disetujui() from public,anon;
create trigger validasi_rujukan before insert or update on public.rujukan for each row execute function public.validasi_rujukan();
create trigger wajib_rujukan_disetujui before insert or update on public.quran_ayat for each row execute function public.wajib_rujukan_disetujui();
create trigger wajib_rujukan_disetujui before insert or update on public.hukum_tajwid for each row execute function public.wajib_rujukan_disetujui();
create index quran_ayat_rujukan_idx on public.quran_ayat(rujukan_id);
