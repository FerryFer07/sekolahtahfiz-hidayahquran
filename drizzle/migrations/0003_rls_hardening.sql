-- Audit RLS: lihat docs/rls-matrix.md
-- 1. Anon tidak boleh punya hak apa pun di schema public (sebelumnya hanya ditahan RLS lewat grant bawaan Supabase).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- 2. Ustadz/badal hanya boleh mengubah posisi hafalan dan catatan santri; data induk tetap milik admin.
create function public.guard_santri_update() returns trigger language plpgsql set search_path=public as $$begin if auth.uid() is not null and not public.has_role(auth.uid(),'admin') and (to_jsonb(new)-array['posisi_hafalan_ayat_id','catatan']) is distinct from (to_jsonb(old)-array['posisi_hafalan_ayat_id','catatan']) then raise exception 'Ustadz hanya dapat mengubah posisi hafalan dan catatan santri';
end if;
return new;
end$$;
revoke all on function public.guard_santri_update() from public,anon;
create trigger guard_santri_update before update on public.santri for each row execute function public.guard_santri_update();

-- 3. Paraf wali hanya sekali; wali tidak dapat menimpa paraf yang sudah ada.
create or replace function public.validate_entry() returns trigger language plpgsql set search_path=public as $$declare first_verse public.quran_ayat;
 last_verse public.quran_ayat;
 child_jalur text;
begin select jalur into child_jalur from public.santri where id=new.santri_id;
 if (tg_table_name='setoran' and child_jalur<>'tahfidz') or (tg_table_name='setoran_iqro' and child_jalur<>'iqro') then raise exception 'Jalur santri tidak sesuai';
end if;
 if tg_op='UPDATE' and not public.has_role(auth.uid(),'admin') then if public.owns_child(old.santri_id) and not public.can_teach_santri(old.santri_id) then if (to_jsonb(new)-array['diparaf_oleh','diparaf_pada']) is distinct from (to_jsonb(old)-array['diparaf_oleh','diparaf_pada']) then raise exception 'Wali hanya dapat mengisi paraf';
end if;
 if old.diparaf_pada is not null then raise exception 'Setoran sudah diparaf';
end if;
 if new.diparaf_oleh is distinct from auth.uid() or new.diparaf_pada is null then raise exception 'Paraf tidak sah';
end if;
new.diparaf_pada=now();
else if new.santri_id<>old.santri_id or new.diisi_oleh<>old.diisi_oleh or new.tempat<>old.tempat or new.diparaf_oleh is distinct from old.diparaf_oleh or new.diparaf_pada is distinct from old.diparaf_pada then raise exception 'Kolom terlindungi';
end if;
end if;
end if;
if tg_table_name='setoran' then select * into first_verse from public.quran_ayat where id=new.dari_ayat_id;
select * into last_verse from public.quran_ayat where id=new.sampai_ayat_id;
if first_verse.id is null or last_verse.id is null then raise exception 'Referensi ayat tidak ditemukan';
end if;
new.jumlah_baris=(last_verse.halaman-first_verse.halaman)*15+last_verse.baris_akhir-first_verse.baris_awal+1;
if new.jumlah_baris<1 then raise exception 'Rentang ayat tidak sah';
end if;
end if;
return new;
end$$;
