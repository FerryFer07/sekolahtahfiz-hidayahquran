import {createFileRoute} from '@tanstack/react-router';
import {HomeView} from '@/features/school/views';
import {schoolQuery} from '@/features/school/queries';
import {pageHead} from '@/features/school/constants';
export const Route=createFileRoute('/_authenticated/beranda')({head:()=>pageHead('Beranda','Kehadiran dan setoran santri STHQ hari ini.'),loader:({context})=>context.queryClient.ensureQueryData(schoolQuery),component:HomeView});

