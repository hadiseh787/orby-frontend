import {test as base,expect} from '@playwright/test';

// A complete browser suite navigates faster than a person and shares one IP.
// Respect the unchanged server quota between tests; never retry a mutation.
export const test=base.extend<{apiBudget:void}>({
  apiBudget:[async({page},use)=>{
    let resumeAt=0;
    page.on('response',response=>{
      if(!new URL(response.url()).pathname.startsWith('/api/'))return;
      const h=response.headers(),remaining=Number(h['x-ratelimit-remaining']);
      const read=['GET','HEAD','OPTIONS'].includes(response.request().method());
      if(h['x-ratelimit-remaining']!==undefined&&remaining<(read?180:35)){
        resumeAt=Math.max(resumeAt,Date.now()+(Number(h['x-ratelimit-reset'])||60)*1000+100);
      }
    });
    await use();
    if(resumeAt>Date.now())await new Promise(resolve=>setTimeout(resolve,resumeAt-Date.now()));
  },{auto:true,timeout:70000}],
});
export {expect};
