import {test,expect} from './fixtures';
import {randomUUID} from 'node:crypto';

test('CSP rotates script nonces and blocks unsigned inline scripts without breaking Angular',async({page})=>{
  const response=await page.goto('/settings');
  const csp=response!.headers()['content-security-policy'];
  const html=await response!.text();
  expect(html).not.toContain('onload=');
  await expect(page.locator('body')).toHaveCSS('margin-top','0px');
  expect(await page.locator('link[rel="stylesheet"]').getAttribute('media')).not.toBe('print');
  expect(csp).toContain("script-src 'self' 'nonce-");
  expect(csp).not.toContain("'unsafe-eval'");
  const nonce=await page.locator('meta[name="csp-nonce"]').getAttribute('content');expect(nonce).toBeTruthy();
  await page.evaluate(()=>{
    const s=document.createElement('script');s.textContent='window.orbyUnsignedScript=true';document.body.appendChild(s);
  });
  expect(await page.evaluate(()=>(window as any).orbyUnsignedScript)).toBeUndefined();
  await page.getByRole('button',{name:'dark',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.reload();expect(await page.locator('meta[name="csp-nonce"]').getAttribute('content')).not.toBe(nonce);
});

test('legacy proposal dialog submits USD micro units through the real API',async({page})=>{
  await page.goto('/settings');await page.getByRole('button',{name:'Switch demo account'}).click();await page.getByRole('button',{name:'Enter simulation'}).click();
  await expect(page.getByRole('button',{name:'alex.demo',exact:true})).toBeVisible();
  const session=await(await page.request.get('/api/v1/auth/me')).json(),title='Legacy proposal '+Date.now();
  const created=await page.request.post('/api/v1/jobs',{headers:{'x-csrf-token':session.csrf,'idempotency-key':randomUUID()},data:{title,description:'Legacy job for unit-aware proposal regression.',category:'writing',usdMicro:'20000000',deadlineMinutes:1440,approvalPolicy:'MANUAL_APPROVAL',input:{sources:[{id:'one',text:'Client supplied evidence.'}]},criteria:[{id:'approval',type:'CLIENT_APPROVE',required:true,description:'Client approval'}]}});
  expect(created.ok()).toBe(true);
  await page.goto('/settings');await page.getByRole('button',{name:'Switch demo account'}).click();await page.getByLabel('Demo account').selectOption('writer.demo');await page.getByRole('button',{name:'Enter simulation'}).click();
  await expect(page.getByRole('button',{name:'writer.demo',exact:true})).toBeVisible();
  await page.goto('/creator/agents');const row=page.locator('[aria-label="Open jobs"] .record-row').filter({hasText:title});
  await expect(row).toContainText('Legacy USD agreement');await row.getByRole('button',{name:'Submit proposal'}).click();
  await page.getByRole('dialog').getByLabel('Agent',{exact:true}).selectOption('brief-writer');
  await page.getByRole('dialog').getByLabel('Proposal · USD (legacy)',{exact:true}).fill('20');
  const sent=page.waitForRequest(r=>r.method()==='POST'&&r.url().endsWith('/bids'));
  await page.getByRole('dialog').getByRole('button',{name:'Submit proposal',exact:true}).click();
  expect((await sent).postDataJSON().amount).toBe('20000000');await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('sandbox wallet receives testnet RPC providers and executes under the enforced CSP',async({page})=>{
  const manifest={version:'1.0',wallets:[{id:'orby-rpc-fixture',type:'sandbox',name:'RPC fixture',description:'Test-only sandbox adapter',website:'https://near.org',icon:'/brand/orby-icon-transparent.png',version:'1.0',executor:'https://raw.githubusercontent.com/orby/rpc-fixture.js',platform:{},permissions:{},features:{testnet:true,mainnet:false,signMessage:true,signInWithoutAddKey:true,signAndSendTransaction:true}}]};
  await page.route('**/api/v1/wallet-registry',route=>route.fulfill({json:manifest}));
  await page.route('**/rpc-fixture.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.selector.ready({signIn:async()=>{if(!window.selector.providers.testnet?.length)throw Error('Near testnet RPC not configured');throw Error('RPC providers configured');}});`}));
  await page.goto('/');await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  await page.locator('.connect-item[data-type="orby-rpc-fixture"]').click();
  await expect(page.getByRole('alert')).toContainText('RPC providers configured',{timeout:15000});
  await expect(page.getByRole('alert')).not.toContainText('RPC not configured');
});
