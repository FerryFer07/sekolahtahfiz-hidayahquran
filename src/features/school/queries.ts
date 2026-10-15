import {queryOptions} from '@tanstack/react-query';
import {schoolData} from './data.functions';
export const schoolQuery = queryOptions({queryKey:['school'],queryFn:()=>schoolData()});
