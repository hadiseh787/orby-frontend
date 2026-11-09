import { Injectable, signal } from '@angular/core';
function stored(key:string, area:Storage=localStorage){try{return JSON.parse(area.getItem(key)||'null')}catch{return null}}
export function walletError(error:any):string {
  const text=String(error?.message||error||'');
  if(/reject|cancel|declin|closed|abort.*user/i.test(text))return 'The wallet request was cancelled. No confirmed transaction was recorded.';
  if(/fetch|network|timeout|abort/i.test(text))return 'The wallet or network could not be reached. Check your connection and reconcile any pending transaction before retrying.';
  return text && !/not a constructor|undefined|TypeError/i.test(text) ? text : 'The wallet could not be opened. Reload the page and try again.';
}
@Injectable({providedIn:'root'})
export class Api {
  user=signal<any>(null);
  config=signal<any>({});
  quote=signal<any>({priceMicro:null,source:'Loading market data',observedAt:0,stale:true});
  walletStatus=signal('Disconnected');
  operationStatus=signal('');
  operation=signal<any>(null);
  private selectedWorkspace=signal('');
  workspaceHeaders():Record<string,string>{const id=this.selectedWorkspace()||this.user()?.workspaceId;return id?{'X-Orby-Workspace':id}:{};}
  private workspacePreference(){return 'orby-workspace:'+this.user()?.book+':'+this.user()?.id;}
  private async restoreWorkspace(){const saved=localStorage.getItem(this.workspacePreference());if(saved&&saved!==this.user()?.workspaceId){this.selectedWorkspace.set(saved);try{const user=await this.get('/auth/me');if(!user)throw Error('Workspace membership is no longer active.');this.user.set(user);}catch{this.selectedWorkspace.set('');localStorage.removeItem(this.workspacePreference());}}}
  async switchWorkspace(id:string){if(this.operation())throw Error('Resolve the pending wallet transaction before switching workspaces.');const old=this.selectedWorkspace();this.selectedWorkspace.set(id);try{const user=await this.get('/auth/me');if(!user)throw Error('Workspace membership is no longer active.');this.user.set(user);localStorage.setItem(this.workspacePreference(),id);location.assign('/workspace/tools');}catch(e){this.selectedWorkspace.set(old);throw e;}}
  signatureReview=signal<any>(null);
  private reviewResolve?: (approved:boolean)=>void;
  private connector:any;
  async get(path:string){return this.request(path)}
  async refreshPrice(){try{this.quote.set(await this.get('/price'))}catch{this.quote.update(q=>({...q,source:q.priceMicro?q.source:'Unavailable',stale:true}))}}
  private async requestKey(path:string,body:any){
    const key='orby-request:'+this.user()?.book+':'+this.user()?.id+':'+this.user()?.workspaceId+':'+this.config().contractId+':'+path;
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body))))).map(v=>v.toString(16).padStart(2,'0')).join('');
    const prior=stored(key);const record=prior?.hash===hash ? prior : {key:crypto.randomUUID(),hash};
    localStorage.setItem(key,JSON.stringify(record));return {storageKey:key,...record};
  }
  async post(path:string,body:any={},key?:string):Promise<any>{
    const record=key?null:await this.requestKey(path,body);
    const pending=this.operation();
    if(pending&&!path.startsWith('/auth/')&&!path.startsWith('/operations/')&&(pending.requestPath!==path||(pending.requestHash&&pending.requestHash!==record?.hash)))throw Error('Resolve the pending wallet operation before changing its inputs or submitting another action.');
    try{
      const result=await this.request(path,body,key||record.key);
      if(result?.operation){
        const op={...result.operation,requestStorageKey:record?.storageKey,requestPath:path,requestHash:record?.hash};
        await this.sign(op);
      }else if(record)localStorage.removeItem(record.storageKey);
      return result;
    }catch(e:any){if(e.httpStatus>=400&&e.httpStatus<500&&record)localStorage.removeItem(record.storageKey);throw e;}
  }
  async request(path:string,body?:any,key?:string):Promise<any>{
    let response:Response;
    try{response=await fetch('/api/v1'+path,{credentials:'include',method:body===undefined?'GET':'POST',headers:{...this.workspaceHeaders(),...(body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':this.user()?.csrf||'','Idempotency-Key':key||crypto.randomUUID()})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)});}
    catch(e){console.error('Orby API request failed',path,e);throw Error('The server could not be reached. Check your connection and retry. Pending payments must be reconciled first.');}
    const data=await response.json().catch(()=>({message:'The server returned an unreadable response.'}));
    if(!response.ok){if(response.status===401)this.user.set(null);const error:any=new Error(data.message||'The request failed.');error.httpStatus=response.status;error.code=data.code;error.details=data.details;console.error('Orby request rejected',{path,status:response.status,code:data.code,requestId:data.requestId});throw error;}
    return data;
  }
  async init(){
    const [config,user]=await Promise.all([this.get('/config'),this.get('/auth/me')]);this.config.set(config);this.user.set(user);
    if(user?.workspaceId)await this.restoreWorkspace();
    if(user?.book==='TESTNET')this.walletStatus.set('Connected');
    void this.refreshPrice();
    const fragment=new URLSearchParams(location.hash.slice(1));const challenge=stored('af-challenge',sessionStorage);
    if(challenge&&fragment.get('signature')){
      try{this.user.set(await this.post('/auth/verify',{challengeId:challenge.id,accountId:fragment.get('accountId'),publicKey:fragment.get('publicKey'),signature:fragment.get('signature'),flow:'REDIRECT'}));this.walletStatus.set('Connected');}
      finally{sessionStorage.removeItem('af-challenge');history.replaceState(null,'',location.pathname);}
    }
    this.loadActiveOperation();
    const query=new URLSearchParams(location.search),op=this.operation();
    if(query.get('errorCode')){this.operationStatus.set('Transaction declined');history.replaceState(null,'',location.pathname);throw Error('The wallet declined the transaction: '+(query.get('errorMessage')||query.get('errorCode')));}
    if(op&&query.get('transactionHashes')){op.txHash=query.get('transactionHashes')!.split(',')[0];this.saveOperation(op);history.replaceState(null,'',location.pathname);}
    if(op?.txHash&&this.user()?.book==='TESTNET')await this.reconcilePending();
  }
  async demo(accountId:string){this.selectedWorkspace.set('');this.user.set(await this.post('/auth/demo',{accountId}));await this.restoreWorkspace();this.loadActiveOperation();this.walletStatus.set('Local simulation');}
  async wallet(){
    if(this.connector)return this.connector;
    // Angular/esbuild wraps the CommonJS barrel in a default export in production.
    const module:any=await import('@hot-labs/near-connect');const Constructor=module.NearConnector??module.default?.NearConnector;
    if(typeof Constructor!=='function')throw Error('The NEAR wallet connector could not be loaded. Reload and try again.');
    this.connector=new Constructor({network:'testnet',providers:{testnet:this.config().walletRpcUrls||['https://test.rpc.fastnear.com']},cspNonce:document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content,features:{signMessage:true,testnet:true},autoConnect:false});
    this.connector.on('wallet:signOut',()=>{if(this.user()?.book==='TESTNET')void this.request('/auth/logout',{}).catch(console.error).finally(()=>{this.user.set(null);this.walletStatus.set('Disconnected')})});
    await Promise.race([this.connector.whenManifestLoaded,new Promise((_,reject)=>setTimeout(()=>reject(Error('The wallet registry timed out. Reload and try again.')),15000))]);
    if(!this.connector.availableWallets.length)throw Error('No compatible testnet wallets could be loaded. Check access to the wallet registry and retry.');
    return this.connector;
  }
  async connect(){
    this.walletStatus.set('Connecting wallet');
    try{
      const c=await this.wallet(),challenge=await this.post('/auth/challenge',{flow:'REDIRECT'});
      const nonce=Uint8Array.from(atob(challenge.nonce),(v)=>v.charCodeAt(0));
      sessionStorage.setItem('af-challenge',JSON.stringify(challenge));
      const wallet=await c.connect();const accounts=await wallet.getAccounts({network:'testnet'});
      if(!accounts.length)throw Error('No NEAR testnet account was returned by this wallet.');
      this.walletStatus.set('Waiting for wallet approval');
      const signed=await wallet.signMessage({message:challenge.message,recipient:challenge.recipient,nonce,signerId:accounts[0].accountId,network:'testnet',callbackUrl:challenge.callbackUrl});
      if(!signed)return;
      this.user.set(await this.post('/auth/verify',{challengeId:challenge.id,accountId:signed.accountId,publicKey:signed.publicKey,signature:signed.signature}));
      sessionStorage.removeItem('af-challenge');this.loadActiveOperation();this.walletStatus.set('Connected');
    }catch(e){console.error('Orby wallet connection failed',e);this.walletStatus.set('Connection failed');throw Error(walletError(e));}
  }
  private operationKey(){return 'orby-operation:'+this.user()?.id+':'+this.config().contractId;}
  private matches(op:any){return this.user()?.book==='TESTNET'&&op?.signerId===this.user()?.id&&op?.receiverId===this.config().contractId;}
  private loadActiveOperation(){let op=stored(this.operationKey()),legacy=stored('af-operation');if(!op&&this.matches(legacy)){op=legacy;localStorage.setItem(this.operationKey(),JSON.stringify(op));localStorage.removeItem('af-operation');}this.operation.set(this.matches(op)?op:null);}
  private saveOperation(op:any){if(!this.matches(op))throw Error('Connect the testnet account and contract associated with this transaction.');localStorage.setItem(this.operationKey(),JSON.stringify(op));this.operation.set(op);}
  private clearOperation(){const op=this.operation();if(op?.requestStorageKey)localStorage.removeItem(op.requestStorageKey);localStorage.removeItem(this.operationKey());this.operation.set(null);}
  async reviewTransaction(op:any){if(this.reviewResolve)throw Error('Finish reviewing the current transaction first.');this.signatureReview.set(op);const approved=await new Promise<boolean>(resolve=>this.reviewResolve=resolve);if(!approved)throw Error('Transaction review cancelled. No wallet request was sent.');}
  answerReview(approved:boolean){const resolve=this.reviewResolve;this.reviewResolve=undefined;this.signatureReview.set(null);resolve?.(approved);}
  async restoreOperation(row:any){const op={...row.proposal,operationId:row.id,txHash:row.tx_hash||row.candidate_tx_hash};this.saveOperation(op);if(op.txHash)return this.reconcilePending();return this.sign(op);}
  async reconcilePending(){
    const op=this.operation();if(!op)throw Error('No pending transaction is stored for this account.');
    if(!op.txHash){const row=await this.get('/operations/'+op.operationId);if(row.tx_hash||row.candidate_tx_hash)op.txHash=row.tx_hash||row.candidate_tx_hash;}
    if(!op.txHash)throw Error('No transaction hash was recorded. Check wallet history before signing this prepared operation again.');
    this.saveOperation(op);this.operationStatus.set('Transaction processing');
    const result=await this.request('/operations/'+op.operationId+'/transaction',{txHash:op.txHash});
    this.operationStatus.set(result.state==='CONFIRMED'?'Transaction confirmed':result.state==='FAILED'?'Transaction failed':'Transaction status unknown');
    if(result.state==='CONFIRMED'){this.clearOperation();return result;}
    if(result.state==='FAILED'){this.clearOperation();throw Error('The contract rejected the transaction. '+(result.failure||'Review the transaction details before retrying.'));}
    throw Error(result.nextAction||'Confirmation is pending. Reconcile this transaction instead of sending another payment.');
  }
  async resumeSignature(){const op=this.operation();if(op)await this.sign(op);}
  async checkTransactionHash(txHash:string){
    const op=this.operation();if(!op)throw Error('No pending wallet operation is stored.');
    if(!/^[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(txHash.trim()))throw Error('Enter the transaction hash shown in your testnet wallet.');
    this.saveOperation({...op,txHash:txHash.trim()});
    try{return await this.reconcilePending();}catch(error:any){if(['INVALID_TRANSACTION','IDEMPOTENCY_CONFLICT'].includes(error.code))this.saveOperation(op);throw error;}
  }
  async sign(op:any){
    const pending=this.operation();
    if(pending&&pending.operationId!==op.operationId)throw Error('Resolve the pending wallet operation before preparing another transaction.');
    if(pending?.txHash){await this.reconcilePending();return;}
    this.saveOperation(op);this.operationStatus.set('Preparing transaction');
    try{
      if(op.network!=='testnet')throw Error('This deployment supports NEAR testnet only. Mainnet funds cannot be used here.');
      await this.reviewTransaction(op);
      const session=await this.get('/auth/me');if(session?.id!==op.signerId||session?.book!=='TESTNET')throw Error('Your account changed. Connect the account shown in this transaction.');
      const c=await this.wallet();let wallet:any;try{wallet=await c.wallet();}catch{wallet=await c.connect();}const accounts=await wallet.getAccounts({network:'testnet'});
      if(!accounts.some((a:any)=>a.accountId===op.signerId))throw Error('The selected wallet account differs from the signed-in account. Disconnect and connect the correct testnet account.');
      this.operationStatus.set('Waiting for signature');
      const result=await wallet.signAndSendTransaction({network:'testnet',signerId:op.signerId,receiverId:op.receiverId,actions:[{type:'FunctionCall',params:{methodName:op.methodName,args:op.args,gas:op.gas,deposit:op.attachedDepositYocto}}]});
      const txHash=result?.transaction?.hash||result?.transaction_outcome?.id;
      if(!txHash)throw Error('No transaction hash was returned. Check wallet history before retrying this operation.');
      this.saveOperation({...op,txHash});this.operationStatus.set('Transaction submitted');
      for(let attempt=0;attempt<5;attempt++){
        try{await this.reconcilePending();return;}catch(e){if(!this.operation()||attempt===4)throw e;await new Promise(r=>setTimeout(r,2000));}
      }
    }catch(e){console.error('Orby wallet transaction failed',e);if(this.operationStatus()==='Waiting for signature')this.operationStatus.set('Signature not completed');throw Error(walletError(e));}
  }
  async logout(){
    const chain=this.user()?.book==='TESTNET';await this.post('/auth/logout');this.user.set(null);this.walletStatus.set('Disconnected');
    this.operation.set(null);
    this.selectedWorkspace.set('');
    if(chain){try{await (await this.wallet()).disconnect()}catch(e){console.error('Wallet disconnect failed',e)}}
    sessionStorage.removeItem('af-challenge');
  }
}
