import {Component,Input,OnInit,inject,signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Api} from './api';
import {atomicToDecimal,decimalToAtomic} from './money';
@Component({selector:'counteroffers',standalone:true,imports:[CommonModule,FormsModule],template:`
<section class="panel section-gap"><h2>Request a counteroffer</h2><p>One price negotiation per agent and job. The initial proposal stays valid until its own expiry. Acceptance does not spend funds; review and fund the exact final proposal separately.</p>
<label class="field">Original proposal<select aria-label="Original proposal" [(ngModel)]="bidId" (ngModelChange)="choose()"><option value="">Choose a proposal</option>@for(b of job.bids;track b.id){@if(!b.counterofferOf){<option [value]="b.id">{{b.agentName||b.agentId}} · {{b.id.slice(0,8)}}</option>}}</select></label><label class="field">Counteroffer amount · {{job.nearYocto?(job.book==='SIMULATION'?'simNEAR':'NEAR'):'USD legacy'}}<input [(ngModel)]="amount" inputmode="decimal" /></label><button class="btn" [disabled]="busy()||!bidId" (click)="request()">Request counteroffer</button>
@for(r of rounds();track r.id){<article class="program-card"><b>{{r.agent_id}} · {{r.state}}</b><p>{{r.reason}}</p><p class="small">Expires {{r.expires_at|date:'medium'}}@if(r.final_bid_id){ · final proposal {{r.final_bid_id.slice(0,8)}}}</p></article>}
@if(message()){<p class="notice" role="status">{{message()}}</p>}</section>`})
export class Counteroffers implements OnInit{
 @Input() job:any;api=inject(Api);rounds=signal<any[]>([]);busy=signal(false);message=signal('');bidId='';amount='';async ngOnInit(){await this.load();}async load(){try{this.rounds.set(await this.api.get('/jobs/'+this.job.id+'/counteroffers'));}catch(e:any){this.message.set(e.message);}}
 choose(){const b=this.job.bids.find((b:any)=>b.id===this.bidId);this.amount=b?(this.job.nearYocto?atomicToDecimal(b.amount):String(Number(b.amount)/1000000)):'';}
 async request(){this.busy.set(true);try{const value=this.job.nearYocto?decimalToAtomic(this.amount):decimalToAtomic(this.amount,6);const r=await this.api.post('/jobs/'+this.job.id+'/counteroffers',{bidId:this.bidId,amount:value});await this.load();this.message.set(r.reason+' Refresh proposals to review the final offer when recorded.');}catch(e:any){this.message.set(e.message);}finally{this.busy.set(false);}}
}
@Component({selector:'creator-counteroffers',standalone:true,imports:[CommonModule],template:`@if(rounds().length){<section class="panel section-gap"><h2>Accepted counteroffers awaiting your signature</h2>@for(r of rounds();track r.id){<article class="program-card"><b>{{r.title}} · {{r.agent_id}}</b><p>{{r.reason}}</p><button class="btn" [disabled]="busy()" (click)="record(r.id)">Record agreed proposal in wallet</button></article>}@if(message()){<p role="status" class="notice">{{message()}}</p>}</section>}`})
export class CreatorCounteroffers implements OnInit{
 api=inject(Api);rounds=signal<any[]>([]);busy=signal(false);message=signal('');async ngOnInit(){try{this.rounds.set(await this.api.get('/creator/counteroffers'));}catch(e:any){this.message.set(e.message);}}async record(id:string){this.busy.set(true);try{await this.api.post('/counteroffers/'+id+'/record');await this.ngOnInit();}catch(e:any){this.message.set(e.message);}finally{this.busy.set(false);}}
}
