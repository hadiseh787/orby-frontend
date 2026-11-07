import {test,expect} from './fixtures';

test('transaction review precedes the wallet, survives reload and is isolated by account',async({page})=>{
 let account='review-one.testnet',signed=0,state='PREPARED';
 const id='11111111-1111-4111-8111-111111111111',op={operationId:id,requestId:'fixture-request',network:'testnet',signerId:account,receiverId:'review-market.testnet',methodName:'withdraw',args:{amount:'1000000000000000000000',request_id:'fixture-request'},attachedDepositYocto:'1',gas:'150000000000000',gasCapEstimateYocto:'15000000000000000000000'};
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;let value:any;
  if(path.endsWith('/config'))value={name:'Orby',demoLogin:false,chainConfigured:true,contractId:op.receiverId,walletRpcUrls:['https://test.rpc.fastnear.com']};
  else if(path.endsWith('/auth/me'))value={id:account,book:'TESTNET',roles:['client','creator'],csrf:'fixture-csrf'};
  else if(path.endsWith('/operations/'+id+'/transaction')){state='CONFIRMED';value={state,txHash:'C'.repeat(44)};}
  else if(path.endsWith('/operations/'+id))value={id,proposal:op,state};
  else if(path.endsWith('/operations'))value=account===op.signerId?[{id,proposal:op,state,updated_at:new Date().toISOString()}]:[];
  else if(path.endsWith('/balances'))value={chain:{free:'1000000000000000000000000',bond:'0'},balances:[],ledger:[]};
  else if(path.endsWith('/price'))value={priceMicro:'2000000',source:'Browser fixture',stale:false,referenceOnly:true};
  else value=[];
  await route.fulfill({json:value});
 });
 await page.route('**/manifest.json',route=>route.fulfill({json:{version:'fixture',wallets:[]}}));
 await page.exposeBinding('orbyReviewFixture',async()=>{signed++;return {transaction:{hash:'C'.repeat(44)}};});
 await page.addInitScript(()=>{
  const wallet={manifest:{id:'orby-review-fixture',name:'Review fixture wallet',version:'1',website:'https://near.org',icon:'/brand/orby-icon-transparent.png',features:{signMessage:true,testnet:true,mainnet:false,signInWithoutAddKey:true,signAndSendTransaction:true},permissions:{}},signIn:async()=>[{accountId:'review-one.testnet'}],getAccounts:async()=>[{accountId:'review-one.testnet'}],signOut:async()=>{},signMessage:async()=>null,signAndSendTransaction:async()=>(window as any).orbyReviewFixture()};
  window.addEventListener('near-selector-ready',()=>window.dispatchEvent(new CustomEvent('near-wallet-injected',{detail:wallet})));
 });
 await page.goto('/settings');await page.getByRole('button',{name:'Review and resume',exact:true}).click();const review=page.locator('.signature-dialog');await expect(review).toBeVisible();await expect(review).toContainText('0.000000000000000000000001 testNEAR');expect(signed).toBe(0);
 await review.getByRole('button',{name:'Cancel transaction',exact:true}).click();await expect(review).not.toBeVisible();expect(signed).toBe(0);
 await page.reload();await expect(page.getByRole('region',{name:'Pending wallet operation'})).toBeVisible();
 account='review-two.testnet';await page.reload();await expect(page.getByRole('region',{name:'Pending wallet operation'})).not.toBeVisible();expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('review-one.testnet')))).toBe(true);
 account='review-one.testnet';await page.reload();await page.getByRole('button',{name:'Resume signature',exact:true}).click();await expect(review).toBeVisible();expect(signed).toBe(0);await review.getByRole('button',{name:'Continue to wallet',exact:true}).click();await page.locator('.connect-item[data-type="orby-review-fixture"]').click();await expect(page.getByRole('region',{name:'Pending wallet operation'})).not.toBeVisible();expect(signed).toBe(1);
});
