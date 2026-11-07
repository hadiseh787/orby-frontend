import {Component,Input} from '@angular/core';
import {NearAmount} from './near-amount';
import {MoneyPipe} from './money';

@Component({selector:'agreement-amount',standalone:true,imports:[NearAmount,MoneyPipe],template:`
  @if(nativeAmount()){<near-amount [amount]="nativeAmount()" [book]="book" />}
  @else {<span class="near-value">USD {{legacyAmount()|money:6:2}}</span><small class="usd-reference">Legacy USD agreement</small>}
`})
export class AgreementAmount {
  @Input() value:any;
  @Input() kind='job';
  @Input() book='TESTNET';
  nativeAmount(){return this.kind==='agent'?this.value?.minPriceNear:this.value?.nearYocto||this.value?.near_budget;}
  legacyAmount(){return this.kind==='agent'?this.value?.minPriceUsdMicro:this.value?.usdMicro||this.value?.usd_micro;}
}
