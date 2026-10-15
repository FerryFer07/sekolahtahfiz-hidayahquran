import {createFileRoute} from '@tanstack/react-router';
import {HistoryView} from '@/features/school/views';
import {schoolQuery} from '@/features/school/queries';
import {pageHead} from '@/features/school/constants';
export const Route=createFileRoute('/_authenticated/riwayat')({head:()=>pageHead('Riwayat santri','Riwayat hafalan dan kehadiran santri STHQ.'),loader:({context})=>context.queryClient.ensureQueryData(schoolQuery),component:HistoryView});

