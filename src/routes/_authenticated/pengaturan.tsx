import {createFileRoute} from '@tanstack/react-router';
import {AccountView} from '@/features/school/views';
import {schoolQuery} from '@/features/school/queries';
import {pageHead} from '@/features/school/constants';
export const Route=createFileRoute('/_authenticated/pengaturan')({head:()=>pageHead('Pengaturan akun','Pengaturan profil dan ukuran teks Quran STHQ.'),loader:({context})=>context.queryClient.ensureQueryData(schoolQuery),component:AccountView});

