-- Data induk siswa. Lihat docs/rls-matrix.md.
-- Identitas sekolah (terlihat oleh siapa pun yang boleh melihat santri) tetap di santri;
-- data pribadi (identitas kependudukan, alamat, orang tua, kesehatan) di santri_pribadi.

-- 1. Identitas sekolah di santri. status menggantikan aktif sebagai sumber kebenaran; aktif diturunkan otomatis.
alter table public.santri add column nisn text not null default '';
alter table public.santri add column nama_panggilan text not null default '';
alter table public.santri add column jenis_kelamin text check(jenis_kelamin in('L','P'));
alter table public.santri add column tanggal_masuk date;
alter table public.santri add column foto_path text;
alter table public.santri add column status text not null default 'aktif' check(status in('aktif','pindah','lulus','keluar'));
update public.santri set status='keluar' where not aktif;
create unique index santri_nisn_key on public.santri(nisn) where nisn<>'';

create function public.sync_santri_aktif() returns trigger language plpgsql set search_path=public as $$begin new.aktif=new.status='aktif';
return new;
end$$;
revoke all on function public.sync_santri_aktif() from public,anon;
create trigger sync_santri_aktif before insert or update on public.santri for each row execute function public.sync_santri_aktif();

-- 2. Data pribadi: hanya admin, tu (kelola) dan kepsek (baca).
create table public.santri_pribadi(
  santri_id uuid primary key references public.santri(id) on delete cascade,
  nik text not null default '' check(nik ~ '^([0-9]{16})?$'),
  no_kk text not null default '' check(no_kk ~ '^([0-9]{16})?$'),
  tempat_lahir text not null default '',
  tanggal_lahir date,
  anak_ke integer check(anak_ke>0),
  jumlah_saudara integer check(jumlah_saudara>=0),
  alamat text not null default '',
  rt text not null default '',
  rw text not null default '',
  kelurahan text not null default '',
  kecamatan text not null default '',
  kota text not null default '',
  asal_sekolah text not null default '',
  nama_ayah text not null default '',
  pekerjaan_ayah text not null default '',
  pendidikan_ayah text not null default '',
  hp_ayah text not null default '',
  nama_ibu text not null default '',
  pekerjaan_ibu text not null default '',
  pendidikan_ibu text not null default '',
  hp_ibu text not null default '',
  nama_wali_lain text not null default '',
  hubungan_wali text not null default '',
  hp_wali text not null default '',
  kontak_darurat_nama text not null default '',
  kontak_darurat_hp text not null default '',
  catatan_kesehatan text not null default '',
  diperbarui_pada timestamptz not null default now()
);
grant select,insert,update,delete on public.santri_pribadi to authenticated;
grant all on public.santri_pribadi to service_role;
alter table public.santri_pribadi enable row level security;
create policy staff_manage on public.santri_pribadi for all to authenticated using(public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'tu')) with check(public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'tu'));
create policy kepsek_read on public.santri_pribadi for select to authenticated using(public.has_role(auth.uid(),'kepsek'));

create function public.touch_diperbarui_pada() returns trigger language plpgsql set search_path=public as $$begin new.diperbarui_pada=now();
return new;
end$$;
revoke all on function public.touch_diperbarui_pada() from public,anon;
create trigger touch_diperbarui_pada before update on public.santri_pribadi for each row execute function public.touch_diperbarui_pada();

-- 3. Akses sempit tanpa membuka tabel: kontak wali (pengampu halaqah, wali sendiri, staf)
--    dan catatan kesehatan (wali sendiri, staf). Wali kelas menyusul bersama rombel.
create function public.kontak_wali_santri() returns table(santri_id uuid,nama_ayah text,hp_ayah text,nama_ibu text,hp_ibu text,nama_wali_lain text,hubungan_wali text,hp_wali text,kontak_darurat_nama text,kontak_darurat_hp text) language sql stable security definer set search_path=public as $$select p.santri_id,p.nama_ayah,p.hp_ayah,p.nama_ibu,p.hp_ibu,p.nama_wali_lain,p.hubungan_wali,p.hp_wali,p.kontak_darurat_nama,p.kontak_darurat_hp from public.santri_pribadi p where auth.uid() is not null and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'tu') or public.has_role(auth.uid(),'kepsek') or public.can_teach_santri(p.santri_id) or public.owns_child(p.santri_id))$$;
create function public.kesehatan_santri() returns table(santri_id uuid,catatan_kesehatan text) language sql stable security definer set search_path=public as $$select p.santri_id,p.catatan_kesehatan from public.santri_pribadi p where auth.uid() is not null and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'tu') or public.has_role(auth.uid(),'kepsek') or public.owns_child(p.santri_id))$$;
revoke all on function public.kontak_wali_santri(),public.kesehatan_santri() from public,anon;
grant execute on function public.kontak_wali_santri(),public.kesehatan_santri() to authenticated;
