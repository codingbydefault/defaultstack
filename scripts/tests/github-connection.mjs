import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createCipheriv,createHash,randomBytes} from 'node:crypto';
import {createSessionToken} from '../../src/lib/auth/session.ts';
const secret='github-connection-regression-fixture';
process.env.DEFAULTSTACKR_SESSION_SECRET=secret;
const port=3194,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/start-standalone.mjs'],{env:{...process.env,NODE_ENV:'production',PORT:String(port),BIND_HOST:'127.0.0.1',DEFAULTSTACKR_GITHUB_CONFIG_FILE:'',DEFAULTSTACKR_GITHUB_CLIENT_ID:'Iv1_fixture',DEFAULTSTACKR_GITHUB_CLIENT_SECRET:'fixture-only-client-secret',DEFAULTSTACKR_GITHUB_APP_SLUG:'fixture-repositories',DEFAULTSTACKR_PUBLIC_URL:`http://localhost:${port}`},stdio:'ignore'});
function sealed(payload){const key=createHash('sha256').update('defaultstackr-github\0').update(secret).digest();const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([cipher.update(JSON.stringify(payload)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
try{
 let ready=false;for(let i=0;i<80;i++){try{ready=(await fetch(base+'/healthz')).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100));}assert(ready,'standalone starts');
 const session='ds_session='+await createSessionToken(secret);
 const get=(path,cookie=session)=>fetch(base+path,{headers:{Cookie:cookie,Accept:'application/json'},redirect:'manual'});
 const response=await get('/api/github/status');assert.equal(response.status,200);const status=await response.json();assert.equal(status.configured,true);assert.equal(status.connected,false);assert.equal(status.automatic,false);
 const repositories=await get('/api/github/repositories');assert.equal(repositories.status,409);assert.equal((await repositories.json()).code,'github_app_connection_required');
 for(const payload of [{accessToken:'fixture',githubId:1,login:'fixture'},{accessToken:'fixture',githubId:1,login:'fixture',portalId:'different-user'},{accessToken:'fixture',githubId:1,login:'fixture',portalId:'admin',appClientId:'different-app'}])assert.equal((await(await get('/api/github/status',session+'; ds_github='+sealed(payload))).json()).connected,false);
 const connected=await(await get('/api/github/status',session+'; ds_github='+sealed({accessToken:'fixture-app-token',githubId:1,login:'fixture',portalId:'admin',appClientId:'Iv1_fixture'}))).json();assert.equal(connected.connected,true);assert.equal(connected.automatic,false);assert.equal(connected.login,'fixture');
 console.log('PASS: real status/repository routes require a separate App cookie, reject other identities/Apps and never treat platform sign-in as repository access');
}finally{server.kill('SIGTERM');await new Promise(r=>server.exitCode!==null?r():server.once('exit',r));}
