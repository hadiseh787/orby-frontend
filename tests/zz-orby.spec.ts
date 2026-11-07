import {test,expect} from './fixtures';
test('production wallet connector opens real testnet selector and handles cancellation',async({page})=>{
  await page.goto('/');await expect(page).toHaveTitle(/Orby/);
  await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  await expect(page.getByText('Select wallet',{exact:true})).toBeVisible({timeout:30000});
  await expect(page.getByText('t is not a constructor',{exact:true})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alert')).toContainText(/cancel|closed|declin/i);
  await expect(page.getByRole('button',{name:'Connect wallet',exact:true})).toBeEnabled();
});
test('dynamic sources, private file upload/download and day deadlines use the actual API',async({page})=>{
  await page.goto('/settings');await page.getByRole('button',{name:'Switch demo account'}).click();await page.getByRole('button',{name:'Enter simulation'}).click();
  await page.goto('/client/jobs/new');await page.getByRole('button',{name:'Add source',exact:true}).click();
  await page.getByLabel('Source text',{exact:true}).nth(3).fill('Proposal D includes a documented maintenance plan and user testing.');
  await page.getByRole('button',{name:'Add source',exact:true}).click();
  await page.getByLabel('Source text',{exact:true}).nth(4).fill('Proposal E has a fixed scope, an eight week plan and technical risks.');
  await page.getByRole('button',{name:'Remove source 5',exact:true}).click();
  await page.getByLabel('Add files',{exact:true}).setInputFiles([{name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('Private project notes and evidence.')},{name:'data.json',mimeType:'application/json',buffer:Buffer.from('{"scope":"real attachment"}')}]);
  await expect(page.getByRole('link',{name:'notes.txt',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'data.json',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Publish job',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Compare three project proposals',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Download notes.txt',exact:true})).toBeVisible();
  const download=await page.request.get(await page.getByRole('link',{name:'Download notes.txt',exact:true}).getAttribute('href')||'');expect(await download.text()).toBe('Private project notes and evidence.');
  await expect(page.getByText(/2 days · Final deadline/)).toBeVisible();
});
test('agent registration normalizes spaces and unknown URLs render a responsive Orby 404',async({page})=>{
  await page.goto('/settings');await page.getByRole('button',{name:'Switch demo account'}).click();await page.getByLabel('Demo account').selectOption('writer.demo');await page.getByRole('button',{name:'Enter simulation'}).click();
  await page.goto('/creator/agents');await page.getByRole('button',{name:'Register agent',exact:true}).first().click();
  const id='orby regression '+Date.now();await page.getByLabel('Agent ID',{exact:true}).fill(id);await page.getByLabel('Name',{exact:true}).fill('Orby regression agent');await page.getByLabel('Description',{exact:true}).fill('Organizes supplied source material into a structured result.');
  await expect(page.getByLabel('Agent ID',{exact:true})).toHaveValue(id.replaceAll(' ','-'));
  await page.getByRole('dialog').getByRole('button',{name:'Register agent',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.getByRole('row').filter({hasText:id.replaceAll(' ','-')}).getByText('Orby regression agent',{exact:true})).toBeVisible();
  await page.setViewportSize({width:375,height:812});const missing=await page.goto('/missing-orby-page');expect(missing?.status()).toBe(404);await expect(page.getByRole('heading',{name:'This page is out of orbit.'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('link',{name:'Back to marketplace'}).click();await expect(page.getByRole('heading',{name:'Meet your next agent. Get work done.'})).toBeVisible();
});
