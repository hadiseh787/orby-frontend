import {Component,Input,Output,EventEmitter,signal} from '@angular/core';
import {CommonModule} from '@angular/common';
@Component({selector:'readable-output',standalone:true,imports:[CommonModule],template:`
<div class="button-row"><button type="button" class="btn small-btn" (click)="copy()">Copy output</button><button type="button" class="btn small-btn" (click)="download()">Download text</button><span class="small muted" role="status">{{status()}}</span></div>
<h3>Comparison</h3>@for(row of content?.comparison||[];track $index){<article class="output-row" [class.output-changed]="changedRow($index)"><h4>{{row.option}}</h4>@if(changedRow($index)){<span class="badge">Changed in this version</span>}<p><b>Strengths:</b> {{row.strengths}}</p><p><b>Limitations:</b> {{row.limits}}</p><div class="citation-row">@for(id of row.sources||[];track id){<button class="text-button" type="button" (click)="showSource(id,row)">View source {{id}}</button>}</div>@if(allowFeedback){<button class="text-button" type="button" (click)="revision.emit('comparison:'+ $index)">Request a change to this row</button>}</article>}
<h3>Recommendation</h3><p class="output-text" [class.output-changed]="previous&&previous.recommendation!==content?.recommendation">{{content?.recommendation}}</p>@if(allowFeedback){<button class="text-button" type="button" (click)="revision.emit('recommendation')">Request a change to this recommendation</button>}
@if(content?.revisionNote){<div class="notice">Revision request: {{content.revisionNote}}. Review the changes before approving.</div>}
@if(source();as s){<section class="evidence-panel" aria-label="Source evidence"><div class="section-heading"><h3>{{s.id}}</h3><button class="text-button" type="button" (click)="source.set(null)">Close source</button></div>@if(excerpt()){<p><b>Supporting excerpt</b></p><blockquote>{{excerpt()}}</blockquote>}@else{<p class="small muted">A reference was supplied without an exact supporting quotation. Check the source text.</p>}<details open><summary>Complete source</summary><p class="output-text">{{s.text}}</p></details>@if(allowFeedback){<button class="btn" type="button" (click)="insufficient.emit({section:section(),sourceId:s.id})">This evidence is insufficient</button>}</section>}
@if(content?.knowledgeNotes?.length){<section class="notice"><h3>Customer-provided guidance</h3>@for(note of content.knowledgeNotes;track note.id){<p><b>{{note.name}}</b></p><p class="output-text">{{note.text}}</p><small>{{note.basis}}</small>}</section>}
<details class="technical-details"><summary>Technical details</summary><pre>{{content|json}}</pre></details>
`})
export class ReadableOutput {
  @Input() content:any;@Input() previous:any;@Input() sources:any[]=[];@Input() allowFeedback=false;
  @Output() revision=new EventEmitter<string>();@Output() insufficient=new EventEmitter<any>();
  source=signal<any>(null);excerpt=signal('');section=signal('');status=signal('');
  showSource(id:string,row:any){const s=this.sources.find(s=>s.id===id);this.source.set(s||{id,text:'The source is not available in this view.'});const quote=String(row.evidence||'');this.excerpt.set(s&&quote&&s.text.includes(quote)?quote:'');this.section.set('comparison:'+this.content.comparison.indexOf(row));}
  changedRow(i:number){return !!this.previous&&JSON.stringify(this.previous.comparison?.[i])!==JSON.stringify(this.content?.comparison?.[i]);}
  text(){return (this.content?.comparison||[]).map((r:any)=>r.option+'\nStrengths: '+r.strengths+'\nLimitations: '+r.limits+'\nSources: '+(r.sources||[]).join(', ')).join('\n\n')+'\n\nRecommendation\n'+(this.content?.recommendation||'');}
  async copy(){try{await navigator.clipboard.writeText(this.text());this.status.set('Copied.');}catch{this.status.set('Clipboard unavailable. Download the text instead.');}}
  download(){const url=URL.createObjectURL(new Blob([this.text()],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='orby-delivery.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
