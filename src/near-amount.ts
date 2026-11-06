import { Component, Input, inject } from '@angular/core';
import { Api } from './api';
import { MoneyPipe } from './money';
@Component({selector:'near-amount',standalone:true,imports:[MoneyPipe],template:`<span class="near-amount"><span class="near-value">{{amount|money:24:6}} <span class="amount-unit">{{book==='SIMULATION'?'simNEAR':'NEAR'}}</span></span><small class="usd-reference" [title]="quoteTitle()">{{usd()}}</small></span>`})
export class NearAmount {
  @Input() amount:any;
  @Input() book='TESTNET';
  api=inject(Api);
  usd(){
    const quote=this.api.quote();
    if(!quote.priceMicro||this.amount===null||this.amount===undefined)return quote.source==='Loading market data'?'Loading USD estimate…':'USD estimate unavailable';
    try{const n=BigInt(this.amount)*BigInt(quote.priceMicro)/10n**24n;const value=new MoneyPipe().transform(n,6,2);return (this.book==='SIMULATION'?'Illustrative ≈ $':'≈ $')+value+' USD'+(quote.stale?' · stale':'');}catch{return 'USD estimate unavailable'}
  }
  quoteTitle(){const q=this.api.quote();return q.source+(q.observedAt?' · '+new Date(q.observedAt).toISOString():'')+'. Informational only; testnet and simulation tokens have no dollar value.';}
}
