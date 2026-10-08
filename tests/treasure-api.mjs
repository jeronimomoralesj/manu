// Isolated HTTP integration: synthetic Supabase only; never production data.
import http from 'node:http'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
const stamp = '2026-01-01T00:00:00Z'
const state = { enabled: true, cracks: [0,1,2,3].map(index=>({index,revealed_at:null,opened_at:null,solved_at:null})), completed_at:null, completion_seen_at:null }
const questions = [0,1,2,3,4].map(index=>({id:`00000000-0000-4000-8000-00000000000${index}`, question:`Synthetic ${index}`, options:['Synthetic correct','Synthetic wrong'],correct_option_index:0,points_reward:20,is_answered:false}))
const config = { id:1,enabled:true,reward_title:'PRIVATE SYNTHETIC TITLE',reward_message:'PRIVATE SYNTHETIC MESSAGE',audio_path:'PRIVATE-SYNTHETIC-PATH',audio_content_type:'audio/mpeg',notification_email:'owner@example.invalid' }
const ledger = new Map()
let points=0
const mock = http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json')
  let raw='';for await(const part of req)raw+=part
  const body=raw?JSON.parse(raw):{}
  if(url.pathname==='/auth/v1/user'){
    if(!['Bearer test-admin','Bearer test-reader'].includes(req.headers.authorization)){res.statusCode=401;return res.end('{}')}
    return res.end(JSON.stringify({id:'synthetic-admin',email:'owner@example.invalid',email_confirmed_at:stamp,app_metadata:{letters_admin:req.headers.authorization==='Bearer test-admin'}}))
  }
  const rpc=url.pathname.split('/rpc/')[1]
  if(rpc){
    let result
    if(rpc==='treasure_state')result=state
    if(rpc==='treasure_answer'){
      const q=questions.find(q=>q.id===body.p_question_id)
      if(!q){res.statusCode=404;return res.end(JSON.stringify({code:'P0002'}))}
      const duplicate=ledger.has(q.id),correct=duplicate?ledger.get(q.id):body.p_selected_index===q.correct_option_index
      if(!duplicate){ledger.set(q.id,correct);q.is_answered=true;if(correct){points+=q.points_reward;const crack=state.cracks.find(c=>!c.revealed_at);if(crack)crack.revealed_at=stamp}}
      result={correct,correct_option_index:q.correct_option_index,points_earned:!duplicate&&correct?q.points_reward:0,already_answered:duplicate,treasure:state}
    }
    if(rpc==='treasure_open'){const c=state.cracks[body.p_index];if(!c?.revealed_at){res.statusCode=400;return res.end(JSON.stringify({code:'P0001',message:'TREASURE_NOT_REVEALED'}))}c.opened_at??=stamp;result=state}
    if(rpc==='treasure_validate'){const c=state.cracks[body.p_index];if(!c?.opened_at){res.statusCode=400;return res.end(JSON.stringify({code:'P0001',message:'TREASURE_NOT_OPENED'}))}const ok=body.p_code===`TEST-${body.p_index}`;if(ok)c.solved_at??=stamp;if(state.cracks.every(c=>c.solved_at))state.completed_at??=stamp;result={ok,state,...(!ok?{error:'wrong_code'}:{})}}
    if(rpc==='treasure_ack_completion'){state.completion_seen_at??=stamp;result=state}
    if(rpc==='treasure_claim_notification')result=null
    if(rpc==='treasure_configure'){config.reward_title=body.p_reward_title;config.reward_message=body.p_reward_message;config.enabled=body.p_enabled;result=state}
    return res.end(JSON.stringify(result??{}))
  }
  if(url.pathname.startsWith('/storage/v1/object/')){res.setHeader('Content-Type','audio/mpeg');return res.end('SYNTHETIC AUDIO BYTES')}
  const table=url.pathname.split('/rest/v1/')[1]
  let rows=table==='trivia_questions'?questions:table==='secret_dates'?[]:table==='user_gamification'?[{id:1,total_points:points,unlocked_level:1}]:table==='treasure_config'?[config]:table==='treasure_cracks'?state.cracks.map(c=>({crack_index:c.index,code_hash:'PRIVATE_SYNTHETIC_HASH'})):table==='treasure_completion_outbox'?[]:table==='treasure_answers'?[...ledger.keys()].map(question_id=>({question_id})):null
  if(!rows){res.statusCode=404;return res.end('{}')}
  const select=url.searchParams.get('select');if(select&&select!=='*')rows=rows.map(row=>Object.fromEntries(select.split(',').map(key=>[key,row[key]])))
  res.end(JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object')?rows[0]??null:rows))
})
await new Promise(resolve=>mock.listen(54401,'127.0.0.1',resolve))
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--port','3150','--hostname','127.0.0.1'],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54401',SUPABASE_SECRET_KEY:'test-only',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-only',RESEND_API_KEY:'',TREASURE_EMAIL_FROM:'',CRON_SECRET:''},stdio:'inherit'})
const base='http://127.0.0.1:3150'
async function request(path,method='GET',body,token,headers={}){return fetch(base+path,{signal:AbortSignal.timeout(30000),method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})})}
if (process.env.TREASURE_PREVIEW === '1') {
  state.cracks.forEach(crack => { crack.revealed_at = stamp })
  console.log('Synthetic preview at http://127.0.0.1:3150/trivia; test-only corner codes TEST-0 through TEST-3. No production connection.')
  await new Promise(() => {})
}
try{
 const deadline=Date.now()+90000;while(true){try{await request('/api/treasure');break}catch{if(Date.now()>deadline)throw new Error('Test app failed to start');await new Promise(r=>setTimeout(r,500))}}
 let res=await request('/api/trivia'),data=await res.json();assert.equal(res.status,200);assert.equal(JSON.stringify(data).includes('correct_option_index'),false)
 assert.equal((await request('/api/trivia?admin=1')).status,401)
 assert.equal((await request('/api/trivia?admin=1','GET',undefined,'test-reader')).status,403)
 res=await request('/api/trivia?admin=1','GET',undefined,'test-admin');assert.equal((await res.json()).questions[0].correct_option_index,0)
 for(const method of ['POST','PATCH','DELETE'])assert.equal((await request('/api/trivia',method,method==='DELETE'?undefined:{question:'unauthorized'})).status,401)
 assert.equal((await request('/api/admin/treasure')).status,401)
 assert.equal((await request('/api/admin/treasure','GET',undefined,'test-reader')).status,403)
 assert.equal((await request('/api/admin/treasure/audio','POST',{fake:true})).status,401)
 assert.equal((await request('/api/admin/treasure/notify','POST',{})).status,401)
 assert.equal((await request('/api/cron/treasure-notify')).status,401)
 res=await request('/api/admin/treasure','GET',undefined,'test-admin');data=await res.json();assert.deepEqual(data.codes_configured,[true,true,true,true]);assert.equal(data.notification_configured,false);assert.equal(JSON.stringify(data).includes('HASH'),false);assert.equal(JSON.stringify(data).includes('PATH'),false)
 assert.equal((await request('/api/admin/treasure','PATCH',{enabled:true,codes:['','','',''],title:'Title',message:'Message'},'test-admin')).status,409)
 assert.equal((await request('/api/treasure/reward')).status,423);assert.equal((await request('/api/treasure/audio')).status,423)
 assert.equal((await request('/api/treasure','POST',{action:'open',index:0})).status,409)
 assert.equal((await request('/api/treasure','POST',{action:'open',index:9})).status,400)
 assert.equal((await request('/api/treasure','POST',{action:'open',index:0},undefined,{Origin:'https://evil.example'})).status,403)
 const answer=i=>request('/api/trivia','POST',{_action:'answer',questionId:questions[i].id,selectedIndex:0})
 await answer(0);await answer(0);assert.equal(points,20)
 res=await request('/api/treasure');data=await res.json();assert.equal(data.cracks.filter(c=>c.revealed_at).length,1);assert.equal(JSON.stringify(data).includes('PRIVATE'),false);assert.equal(res.headers.get('cache-control'),'private, no-store')
 await request('/api/treasure','POST',{action:'open',index:0});res=await request('/api/treasure','POST',{action:'validate',index:0,code:'WRONG'});assert.equal((await res.json()).correct,false)
 assert.equal((await request('/api/treasure/reward')).status,423)
 await request('/api/treasure','POST',{action:'validate',index:0,code:'test-0'})
 for(let i=1;i<4;i++){await answer(i);await request('/api/treasure','POST',{action:'open',index:i});await request('/api/treasure','POST',{action:'validate',index:i,code:`TEST-${i}`})}
 res=await request('/api/treasure');data=await res.json();assert.equal(data.cracks.filter(c=>c.solved_at).length,4);assert.ok(data.completed_at)
 res=await request('/api/treasure/reward');data=await res.json();assert.equal(data.title,config.reward_title);assert.equal(data.audio_url,'/api/treasure/audio');assert.equal(JSON.stringify(data).includes('PATH'),false)
 res=await request('/api/treasure/audio');assert.equal(res.status,200);assert.equal(await res.text(),'SYNTHETIC AUDIO BYTES')
 await request('/api/treasure','POST',{action:'ack'});data=await(await request('/api/treasure')).json();assert.ok(data.completion_seen_at)
 await answer(4);assert.equal(state.cracks.length,4)
 console.log('PASS: HTTP redaction/auth, locked audio/reward, config fail-closed, persistent corner states, replay protection, incorrect codes, completion acknowledgment. Transaction concurrency is verified separately against local PostgreSQL.')
}finally{app.kill('SIGTERM');mock.close()}
