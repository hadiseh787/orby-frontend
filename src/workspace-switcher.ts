import {Component,effect,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Api} from './api';
@Component({selector:'workspace-switcher',standalone:true,imports:[FormsModule],template:`@if(api.user()?.workspaceId){<div class="workspace-selector"><label>Workspace<select aria-label="Active workspace" [ngModel]="api.user().workspaceId" (ngModelChange)="change($event)">@for(w of workspaces();track w.id){<option [value]="w.id">{{w.name}} · {{w.role}}</option>}</select></label><span class="small muted">{{api.user().workspaceRole}} · payment owner {{api.user().paymentAccount}}</span>@if(error()){<span role="alert">{{error()}}</span>}</div>}`})
export class WorkspaceSwitcher{
 api=inject(Api);workspaces=signal<any[]>([]);error=signal('');private identity='';constructor(){effect(()=>{const u=this.api.user(),id=u?.id+':'+u?.book;if(u?.workspaceId&&id!==this.identity){this.identity=id;void this.load();}});}async load(){try{this.workspaces.set(await this.api.get('/workspaces'));}catch(e:any){this.error.set(e.message);}}async change(id:string){try{await this.api.switchWorkspace(id);}catch(e:any){this.error.set(e.message);}}
}
