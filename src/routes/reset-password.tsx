import {createFileRoute,Link} from '@tanstack/react-router';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {supabase} from '@/integrations/supabase/client';
import {pageHead} from '@/features/school/constants';
import logo from '@/assets/sthq-logo.png.asset.json';
export const Route=createFileRoute('/reset-password')({head:()=>pageHead('Ganti kata sandi','Atur ulang kata sandi akun Mutaba’ah STHQ.'),component:Reset});
function Reset(){const [password,setPassword]=useState('');const [message,setMessage]=useState('');return <main className="reset-page"><form onSubmit={async e=>{e.preventDefault();const r=await supabase.auth.updateUser({password});setMessage(r.error?r.error.message:'Kata sandi berhasil diganti.')}}><img src={logo.url} alt="Logo STHQ"/><h1>Kata sandi baru</h1><label>Kata sandi<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/></label>{message&&<p role="status" className="feedback-note">{message}</p>}<Button>Simpan kata sandi</Button><Button variant="link" asChild><Link to="/">Kembali masuk</Link></Button></form></main>}
