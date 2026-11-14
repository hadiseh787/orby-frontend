import {Component,inject,signal,Output,EventEmitter,HostListener,OnInit,afterNextRender,Injector} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Api} from './api';
import {NearAmount} from './near-amount';
import {decimalToAtomic} from './money';
import {defaultDraft,defaultChecks,loadDraft,saveDraft,draftKey,checksFromCriteria} from './draft-storage';

@Component({selector:'job-composer',standalone:true,imports:[CommonModule,FormsModule,NearAmount],templateUrl:'./job-composer.html'})
export class JobComposer implements OnInit {
  api=inject(Api);injector=inject(Injector);
  @Output() published=new EventEmitter<string>();
  @Output() draftSaved=new EventEmitter<void>();
  draft:any=defaultDraft();checks=defaultChecks();files=signal<any[]>([]);step=signal(1);errors=signal<Record<string,string>>({});
  saved=signal('Example content. Replace it with your own brief and sources.');busy=signal(false);message=signal('');templates=signal<any[]>([]);knowledge=signal<any[]>([]);selectedKnowledge:string[]=[];publishIpfs=false;
  agents=signal<any[]>([]);
  account='';book='SIMULATION';
  goal='';missionEnabled=false;runtimeMode='DETERMINISTIC';runtime=signal<any>({state:'CHECKING'});
  async checkRuntime(){this.runtime.set({state:'CHECKING'});try{this.runtime.set(await this.api.get('/runtime/status'));}catch{this.runtime.set({state:'UNAVAILABLE'});}}
  aiReason(){if(this.runtime().state==='CHECKING')return 'Checking the real model connection and project schema/revision support. First verification can take several minutes.';if(this.runtime().state==='NOT_CONFIGURED')return 'Real AI is not configured. From backend run npm run demo:model:setup, restart npm run local, then recheck.';if(this.runtime().state!=='READY')return 'The configured real model is unavailable. Start the model service, then recheck. No deterministic AI substitute is used.';if(this.goal.trim().length<15)return 'Enter at least 15 characters describing the goal.';return 'Real model ready: '+this.runtime().model+'. Suggestions do not authorize spending.';}
  async suggestAgreement(){if(this.busy())return;this.busy.set(true);try{const r=await this.api.post('/agreements/suggest',{goal:this.goal});this.draft.title=r.title;this.draft.description=r.description;if(r.acceptance){this.checks.minWords=r.acceptance.minWords;this.checks.maxWords=r.acceptance.maxWords;this.checks.requireSources=r.acceptance.requireSources;}this.change();this.message.set('AI draft applied. Suggested acceptance: '+r.acceptanceSummary+'. Edit the brief, acceptance rules, sources and budget before publishing.');}catch(e:any){this.message.set(e.message);}finally{this.busy.set(false);}}
  async ngOnInit(){
    this.account=this.api.user().id;this.book=this.api.user().book;
    this.missionEnabled=this.book==='TESTNET';this.runtimeMode=this.book==='TESTNET'?'REAL_AI':'DETERMINISTIC';void this.checkRuntime();
    const stored=loadDraft(this.account,this.book,this.api.user()?.workspaceId||'',this.api.user()?.workspaceKind==='PERSONAL');
    if(stored){this.draft=stored.draft;this.checks={...defaultChecks(),...stored.checks};this.files.set(stored.files||[]);this.step.set(Math.max(1,Math.min(3,stored.step||1)));this.selectedKnowledge=stored.selectedKnowledge||[];this.saved.set('Draft restored. Saved on this device.');}
    const selected=sessionStorage.getItem('orby-selected-scenario');if(selected){try{const scenario=JSON.parse(selected);this.draft={...this.draft,title:scenario.title,description:scenario.description,category:scenario.category||'review',preferredAgentId:scenario.agentId,sources:scenario.input?.sources||this.draft.sources,budget:scenario.agentId==='brief-writer'?'4':scenario.agentId==='format-reviewer'?'0.4':scenario.agentId==='source-extractor'?'1':'2'};this.checks={...defaultChecks(),matchSourceCount:true,itemCount:this.draft.sources.length};this.missionEnabled=scenario.agentId==='brief-writer'&&this.book==='TESTNET';this.step.set(1);this.change();sessionStorage.removeItem('orby-selected-scenario');}catch{this.message.set('The selected sample could not be loaded. Existing draft is preserved.');}}
    this.templates.set(await this.api.get('/templates/personal').catch(()=>[]));
    this.knowledge.set(await this.api.get('/knowledge').catch(()=>[]));
    this.agents.set(await this.api.get('/agents?book='+this.book).catch(()=>[]));
  }
  unit(){return this.book==='SIMULATION'?'simNEAR':'testNEAR';}
  change(){
    this.message.set('');
    const current=this.errors();if(Object.keys(current).length){const all=this.validate();this.errors.set(Object.fromEntries(Object.keys(current).filter(k=>all[k]).map(k=>[k,all[k]])));}
    try{saveDraft(this.account,this.book,{draft:this.draft,checks:this.checks,files:this.files(),step:this.step(),selectedKnowledge:this.selectedKnowledge},this.api.user()?.workspaceId||'');this.saved.set('Saved on this device · '+new Date().toLocaleTimeString('en-GB',{timeZone:'UTC'})+' UTC');}
    catch{this.saved.set('Not saved. Device storage is unavailable. Keep this page open or copy your brief.');}
  }
  @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if(this.saved().startsWith('Not saved')){event.preventDefault();event.returnValue='';}}
  amount(){try{return decimalToAtomic(this.draft.budget);}catch{return null;}}
  validate(){
    const e:Record<string,string>={},d=this.draft;
    if(d.title.trim().length<5||d.title.length>120)e['title']='Use a title between 5 and 120 characters.';
    if(d.description.trim().length<10||d.description.length>8000)e['description']='Describe the work in 10–8,000 characters.';
    try{const n=BigInt(decimalToAtomic(d.budget));if(n<=0n||n>100n*10n**24n)throw Error();}catch{e['budget']='Enter an amount greater than zero and no more than 100 '+this.unit()+'.';}
    if(!Number.isInteger(Number(d.deadlineDays))||d.deadlineDays<1||d.deadlineDays>7)e['deadline']='Choose a whole number of days from 1 to 7.';
    const ids=new Set<string>();d.sources.forEach((s:any,i:number)=>{if(!s.id.trim()||s.id.length>80||ids.has(s.id))e['source-id-'+i]='Use a unique source name, up to 80 characters.';ids.add(s.id);if(!s.text.trim()||s.text.length>80000)e['source-text-'+i]='Add source text, up to 80,000 characters.';});
    if(new TextEncoder().encode(JSON.stringify({sources:d.sources})).length>262144)e['sources']='Source material exceeds 256 KiB. Shorten it before continuing.';
    const available=d.sheetRows?.length||d.sources.length,count=this.checks.matchSourceCount?available:Number(this.checks.itemCount);
    if(!Number.isInteger(count)||count<1||count>available)e['itemCount']='Choose from 1 to the number of supplied input items.';
    if(!Number.isInteger(Number(this.checks.minWords))||!Number.isInteger(Number(this.checks.maxWords))||this.checks.minWords<1||this.checks.maxWords<this.checks.minWords||this.checks.maxWords>300)e['maxWords']='Use whole-number word limits between 1 and 300; maximum must be at least minimum.';
    return e;
  }
  focusError(key:string){afterNextRender(()=>document.getElementById('draft-'+key)?.focus(),{injector:this.injector});}
  goStep(target:number){
    if(target>this.step()){
      const all=this.validate(),visible=Object.fromEntries(Object.entries(all).filter(([k])=>target===2?!['itemCount','maxWords'].includes(k):true));
      if(Object.keys(visible).length){this.errors.set(visible);this.step.set(['itemCount','maxWords'].includes(Object.keys(visible)[0])?2:1);this.focusError(Object.keys(visible)[0]);return;}
    }
    this.step.set(target);this.change();
  }
  criteria(){const c:any[]=[{id:'structure',type:'AUTO_CHECK',required:true,description:'A comparison with all required fields',config:{check:'json-required-keys',keys:['comparison','recommendation','sources']}},{id:'items',type:'AUTO_CHECK',required:true,description:'Comparison rows: '+(this.checks.matchSourceCount?(this.draft.sheetRows?.length||this.draft.sources.length):this.checks.itemCount),config:{check:'item-count',min:Number(this.checks.matchSourceCount?(this.draft.sheetRows?.length||this.draft.sources.length):this.checks.itemCount),max:Number(this.checks.matchSourceCount?(this.draft.sheetRows?.length||this.draft.sources.length):this.checks.itemCount)}},{id:'length',type:'AUTO_CHECK',required:true,description:'Recommendation: '+this.checks.minWords+'–'+this.checks.maxWords+' words',config:{check:'word-count',min:Number(this.checks.minWords),max:Number(this.checks.maxWords)}}];if(this.checks.requireSources)c.push({id:'sources',type:'AUTO_CHECK',required:true,description:'Every comparison cites supplied sources',config:{check:'source-ids'}});if(this.draft.approvalPolicy==='MANUAL_APPROVAL')c.push({id:'approval',type:'CLIENT_APPROVE',required:true,description:'You approve the delivered version explicitly'});return c;}
  addSource(){if(this.draft.sources.length<30){this.draft.sources.push({id:'source-'+crypto.randomUUID().slice(0,8),text:''});this.change();}}
  removeSource(i:number){if(this.draft.sources.length>1){this.draft.sources.splice(i,1);this.change();}}
  async upload(event:Event){const input=event.target as HTMLInputElement;this.busy.set(true);this.message.set('');try{const files=Array.from(input.files||[]);if(files.length+this.files().length>5)throw Error('Attach up to five files.');for(const f of files){if(f.size<=0||f.size>2097152||!(/\.(pdf|txt|md|json|png|jpe?g)$/i.test(f.name)))throw Error('Use PDF, TXT, MD, JSON, PNG or JPEG up to 2 MiB.');const dataBase64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Could not read this file.'));r.readAsDataURL(f);});this.files.update(v=>[...v]);const saved=await this.api.post('/uploads',{name:f.name,dataBase64,publishToIpfs:this.publishIpfs});this.files.update(v=>[...v,saved]);}this.change();}catch(e:any){this.message.set(e.message);}finally{this.busy.set(false);input.value='';}}
  async removeFile(file:any){try{await this.api.post('/uploads/'+file.id+'/remove');this.files.update(v=>v.filter(f=>f.id!==file.id));this.change();}catch(e:any){this.message.set(e.message);}}
  useTemplate(t:any){if(!t)return;this.draft={...defaultDraft(),...t.blueprint,budget:'',sources:[{id:'source-1',text:''}]};this.files.set([]);this.checks=checksFromCriteria(t.blueprint.criteria||[]);this.step.set(1);this.change();}
  allowChild(id:string){const grants=this.draft.knowledgeChildGrants||{};return (grants['source-extractor']||[]).includes(id);}
  toggleChild(id:string){const grants=this.draft.knowledgeChildGrants||={},ids=grants['source-extractor']||[];grants['source-extractor']=ids.includes(id)?ids.filter((x:string)=>x!==id):[...ids,id];this.change();}
  async submit(){if(this.step()<3){this.goStep(this.step()+1);return;}const errors=this.validate();if(Object.keys(errors).length){this.errors.set(errors);this.step.set(['itemCount','maxWords'].includes(Object.keys(errors)[0])?2:1);this.focusError(Object.keys(errors)[0]);return;}
    this.busy.set(true);this.message.set('');try{
      const payload={runtimeMode:this.runtimeMode,missionPlanRequired:this.missionEnabled&&this.runtimeMode==='REAL_AI',title:this.draft.title.trim(),description:this.draft.description.trim(),category:this.draft.category,nearYocto:decimalToAtomic(this.draft.budget),deadlineMinutes:Number(this.draft.deadlineDays)*1440,approvalPolicy:this.draft.approvalPolicy,input:{sources:this.draft.sources,...(this.draft.sheetRows?{sheetRows:this.draft.sheetRows,sheetHeaders:this.draft.sheetHeaders}:{})},criteria:this.criteria(),attachmentIds:this.files().map(f=>f.id),knowledgeIds:this.selectedKnowledge,preferredAgentId:this.missionEnabled&&this.runtimeMode==='REAL_AI'?'brief-writer':this.draft.preferredAgentId||undefined,knowledgeChildGrants:Object.fromEntries(Object.entries(this.draft.knowledgeChildGrants||{}).map(([agent,ids])=>[agent,(ids as string[]).filter(id=>this.selectedKnowledge.includes(id))]))};
      if(this.api.user()?.workspaceRole==='MEMBER'){
        const saved=this.draft.workspaceDraftId?await this.api.post('/workspace/drafts/'+this.draft.workspaceDraftId,{revision:this.draft.expectedDraftRevision,data:payload}):await this.api.post('/workspace/drafts',{data:payload});
        this.draft.workspaceDraftId=saved.id;this.draft.expectedDraftRevision=saved.revision;this.change();this.draftSaved.emit();return;
      }
      let draftRevision=this.draft.expectedDraftRevision;
      if(this.draft.workspaceDraftId){const saved=await this.api.post('/workspace/drafts/'+this.draft.workspaceDraftId,{revision:draftRevision,data:payload});draftRevision=saved.revision;this.draft.expectedDraftRevision=draftRevision;this.change();}
      const j=await this.api.post('/jobs',{...payload,...(this.draft.workspaceDraftId?{workspaceDraftId:this.draft.workspaceDraftId,expectedDraftRevision:draftRevision}:{})});
      localStorage.removeItem(draftKey(this.account,this.book,this.api.user()?.workspaceId||''));
      try{await this.api.post('/jobs/'+j.id+'/bids/request');}finally{this.published.emit(j.id);}
    }catch(e:any){if(e.details?.length){const mapped:Record<string,string>={};for(const i of e.details){const field=i.path?.[0];mapped[field==='title'?'title':field==='description'?'description':'sources']='Check this value before publishing.';}this.errors.set(mapped);this.step.set(1);this.focusError(Object.keys(mapped)[0]);}else this.message.set(e.message);}finally{this.busy.set(false);}
  }
}
