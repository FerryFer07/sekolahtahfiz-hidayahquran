-- Peran baru: kepala sekolah, tata usaha, bendahara. Dipakai di migrasi 0006 (nilai enum baru tidak boleh dipakai di transaksi yang sama).
alter type public.app_role add value if not exists 'kepsek';
alter type public.app_role add value if not exists 'tu';
alter type public.app_role add value if not exists 'bendahara';
