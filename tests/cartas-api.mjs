// Isolated HTTP integration test. Uses an in-memory fake Supabase, never production.
import http from 'node:http'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
let rows = [
  { id: 'future', title: 'Future test', body: 'SECRET FUTURE', image_base64: 'SECRET IMAGE', unlock_at:'2099-10-08T05:00:00Z', sent_at:null, created_at:'2026-01-01T00:00:00Z', is_read:false },
  { id: 'past', title: 'Past test', body: 'OPEN BODY', image_base64:null, unlock_at:'2020-01-01T05:00:00Z', sent_at:null, created_at:'2020-01-01T00:00:00Z', is_read:false },
]
const mock = http.createServer(async (req,res) => {
  res.setHeader('Content-Type','application/json')
  const url = new URL(req.url,'http://localhost')
  if (url.pathname === '/auth/v1/user') {
    const token = req.headers.authorization
    if (token !== 'Bearer test-admin' && token !== 'Bearer test-reader') { res.statusCode=401; return res.end(JSON.stringify({message:'Invalid test token'})) }
    return res.end(JSON.stringify({ id:'test-user', app_metadata:{ letters_admin:token === 'Bearer test-admin' }, user_metadata:{} }))
  }
  if (url.pathname !== '/rest/v1/cartas') { res.statusCode=404; return res.end('{}') }
  let body='';for await (const part of req) body+=part
  const id=url.searchParams.get('id')?.replace(/^eq\./,'')
  let selected=rows.filter(r=>!id||r.id===id)
  if(url.searchParams.has('or')) selected=selected.filter(r=>!r.unlock_at||Date.parse(r.unlock_at)<=Date.now())
  if(req.method==='POST') { const row={...JSON.parse(body),id:'created',created_at:new Date().toISOString()}; rows.push(row);selected=[row] }
  if(req.method==='PATCH') selected.forEach(r=>Object.assign(r,JSON.parse(body)))
  if(req.method==='DELETE') { rows=rows.filter(r=>!selected.includes(r)); return res.end('{}') }
  if(url.searchParams.get('select')==='id') selected=selected.map(r=>({id:r.id}))
  if(req.headers.accept?.includes('vnd.pgrst.object')) return res.end(JSON.stringify(selected[0]??null))
  res.end(JSON.stringify(selected))
})
await new Promise(resolve=>mock.listen(54399,'127.0.0.1',resolve))
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port','3148','--hostname','127.0.0.1'],{
  env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54399',SUPABASE_SECRET_KEY:'test-only-not-a-real-key',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-only-not-a-real-key'},stdio:'inherit'})
const base='http://127.0.0.1:3148'
async function request(path,method='GET',body,token) { return fetch(base+path,{signal:AbortSignal.timeout(20000),method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})}) }
try {
  const deadline=Date.now()+60000;while(true) { try { await fetch(base+'/api/cartas', {signal:AbortSignal.timeout(15000)});break } catch { if(Date.now()>deadline)throw new Error('Test server did not start');await new Promise(r=>setTimeout(r,400)) } }
  let res=await request('/api/cartas');let data=await res.json();assert.equal(res.status,200);assert.equal(data.find(r=>r.id==='future').body,null);assert.equal(JSON.stringify(data).includes('SECRET'),false);assert.equal(data.find(r=>r.id==='past').body,'OPEN BODY');assert.equal(res.headers.get('cache-control'),'no-store')
  assert.equal((await request('/api/cartas/future')).status,423)
  assert.equal((await request('/api/cartas/future','PATCH',{is_read:true})).status,423)
  assert.equal((await request('/api/cartas/past','PATCH',{is_read:true,unlock_at:null})).status,400)
  assert.equal((await request('/api/admin/cartas')).status,401)
  assert.equal((await request('/api/admin/cartas','GET',null,'test-reader')).status,403)
  assert.equal((await request('/api/cartas','POST',{title:'Unauthorized'})).status,401)
  assert.equal((await request('/api/cartas?id=past','DELETE')).status,401)
  res=await request('/api/admin/cartas','GET',null,'test-admin');assert.equal(res.status,200);data=await res.json();assert.equal(data.find(r=>r.id==='future').body,'SECRET FUTURE')
  res=await request('/api/admin/cartas','POST',{title:'Created',body:'Synthetic only',unlock_date:'2099-12-25'},'test-admin');assert.equal(res.status,201);data=await res.json();assert.equal(data.unlock_at,'2099-12-25T05:00:00.000Z')
  res=await request('/api/admin/cartas/created','PATCH',{title:'Edited',body:'Synthetic edit',unlock_date:'2020-01-01'},'test-admin');assert.equal(res.status,200)
  res=await request('/api/cartas/created');data=await res.json();assert.equal(data.body,'Synthetic edit');assert.equal(data.title,'Edited')
  res=await request('/api/cartas/created','PATCH',{is_read:true});assert.deepEqual(await res.json(),{ok:true})
  res=await request('/api/admin/cartas','GET',null,'test-admin');data=await res.json();assert.equal(data.find(r=>r.id==='created').is_read,true)
  res=await request('/api/admin/cartas?id=created','DELETE',null,'test-admin');assert.equal(res.status,200)
  console.log('PASS: HTTP APIs redact future text/images, block early open/read, enforce admin auth, preserve date timezone, persist create/edit/read/delete in isolated test store.')
} finally { app.kill('SIGTERM');mock.close(); }
