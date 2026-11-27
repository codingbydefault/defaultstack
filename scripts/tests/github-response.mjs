import assert from 'node:assert/strict';
import {githubResponse} from '../../src/lib/github/response.mjs';
import {repositoryConnection} from '../../src/lib/github/repository-connection.mjs';
import {canDeployProjects} from '../../src/lib/auth/owner.mjs';
assert.equal(canDeployProjects({kind:'admin'}),true);
assert.equal(canDeployProjects({kind:'customer',owner:true}),true);
for(const identity of [null,{kind:'customer'},{kind:'customer',owner:false},{kind:'unknown',owner:true}]) assert.equal(canDeployProjects(identity),false);
for(const status of [200,403,502,503]) await assert.rejects(githubResponse(new Response('<!DOCTYPE html><title>Unavailable</title>',{status,headers:{'content-type':'text/html'}})),/tijdelijk niet bereikbaar/);
await assert.rejects(githubResponse(new Response('<html>',{status:401})),/sessie is verlopen/);
await assert.rejects(githubResponse(new Response('',{status:429})),/Te veel aanvragen/);
await assert.rejects(githubResponse(new Response('{broken',{headers:{'content-type':'application/json'}})),/kon niet worden gelezen/);
await assert.rejects(githubResponse(Response.json({error:'Koppel GitHub opnieuw.'},{status:502})),/Koppel GitHub opnieuw/);
assert.deepEqual(await githubResponse(Response.json({items:[],truncated:false})),{items:[],truncated:false});
console.log('PASS: owner deployment access, customer restriction and recoverable JSON/HTML/network response handling');

const customer={kind:'customer',id:'customer-one'};
assert.equal(repositoryConnection(null,customer,'app-id'),null,'GitHub sign-in without a separate App grant is not repository authorization');
const grant={accessToken:'fixture-app-token',portalId:'customer-one',appClientId:'app-id'};
assert.equal(repositoryConnection(grant,customer,'app-id'),grant);
assert.equal(repositoryConnection(grant,{kind:'customer',id:'other-customer'},'app-id'),null);
assert.equal(repositoryConnection(grant,customer,'other-app'),null);
assert.equal(repositoryConnection({...grant,portalId:undefined},{kind:'admin'},'app-id'),null);
console.log('PASS: sign-in-only sessions require a separate App connection; App grants remain bound to the customer and registered App');

await assert.rejects(githubResponse(Response.json({error:'Koppel de GitHub App.',code:'github_app_connection_required'},{status:409})),error=>error.code==='github_app_connection_required' && error.status===409);
