import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnDestroy,
  HostListener,
  afterNextRender,
  Injector,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  Router,
  RouterLink,
  RouterOutlet,
  NavigationEnd,
} from "@angular/router";
import { Api } from "./api";
import { MoneyPipe, decimalToAtomic,atomicToDecimal } from "./money";
import { NearAmount } from "./near-amount";
import { AgreementAmount } from './agreement-amount';
import {JobComposer} from './job-composer';
import {ReadableOutput} from './readable-output';
import {SignatureReview} from './signature-review';
import {WorkspaceHub} from './workspace-hub';
import {WorkReceipt} from './work-receipt';
import {ExecutionRehearsal} from './execution-rehearsal';
import {KnowledgeAccess} from './knowledge-access';
import {WorkspaceSwitcher} from './workspace-switcher';
import {QualityLab} from './quality-lab';
import {TeamReview} from './team-review';
import {Counteroffers,CreatorCounteroffers} from './counteroffers';
import {SheetExport} from './sheet-export';
import {MissionLive} from './mission-live';
import {IntentsSafe} from './intents-safe';
import {saveDraft,checksFromCriteria} from './draft-storage';
import { UiErrors } from './ui-errors';
@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet, MoneyPipe, NearAmount,AgreementAmount,JobComposer,ReadableOutput,SignatureReview,WorkspaceHub,SheetExport,WorkReceipt,ExecutionRehearsal,KnowledgeAccess,WorkspaceSwitcher,QualityLab,TeamReview,Counteroffers,CreatorCounteroffers,MissionLive,IntentsSafe],
  templateUrl: "./app.html",
})
export class App implements OnDestroy {
  @ViewChild('themeToggle')themeToggle?:ElementRef<HTMLButtonElement>;
  themeOpen=signal(false);
  private injector=inject(Injector);
  private themePendingFocus='auto';
  toggleThemeMenu(){this.themeOpen.update(v=>!v);this.themePendingFocus=this.theme();if(this.themeOpen())afterNextRender(()=>document.querySelector<HTMLButtonElement>('.theme-menu [data-theme-option="'+this.themePendingFocus+'"]')?.focus(),{injector:this.injector});}
  chooseTheme(value:string){this.setTheme(value);this.themeOpen.set(false);this.themeToggle?.nativeElement.focus();}
  themeMenuKey(event:KeyboardEvent){
    const keys=['ArrowDown','ArrowUp','Home','End'];if(!this.themeOpen()||!keys.includes(event.key))return;event.preventDefault();
    const names=['light','dark','auto'],options=Array.from(document.querySelectorAll<HTMLButtonElement>('.theme-menu button')),active=(document.activeElement as HTMLElement)?.dataset['themeOption']||this.themePendingFocus,index=names.indexOf(active);
    const next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowDown'?1:2))%3;this.themePendingFocus=names[next];options[next]?.focus();
  }
  @HostListener('document:click',['$event'])closeThemeOutside(event:MouseEvent){if(!(event.target as HTMLElement)?.closest('.theme-control'))this.themeOpen.set(false);}
  @HostListener('document:keydown.escape')closeThemeEscape(){if(this.themeOpen()){this.themeOpen.set(false);this.themeToggle?.nativeElement.focus();}}
  api = inject(Api);
  uiErrors=inject(UiErrors);
  router = inject(Router);
  @ViewChild("modal") modal!: ElementRef<HTMLDialogElement>;
  path = signal(location.pathname);
  loading = signal(true);
  busy = signal(false);
  actionLabel=signal('Saving changes');
  now=signal(Date.now());
  operations=signal<any[]>([]);
  availableJobs=signal<any[]>([]);
  proposalJob:any=null;
  bidAgent='';
  bidAmount='1';
  pendingTxHash='';
  error = signal("");
  notice = signal("");
  agents = signal<any[]>([]);
  jobs = signal<any[]>([]);
  job = signal<any>(null);
  balances = signal<any>({ balances: [], ledger: [] });
  credit = signal<any>({ epochs: [], loans: [] });
  system = signal<any>(null);
  audit = signal<any[]>([]);
  runs = signal<any[]>([]);
  filter = signal("all");
  search = signal("");
  tab = signal("Overview");
  dialog = signal("");
  preview = signal<any>(null);
  profile = signal<any>(null);
  policyAgent = signal<any>(null);
  testResult = signal<any>(null);
  decisionCase = signal<any>(null);
  theme = signal(localStorage.getItem("af-theme") || "auto");
  menu = signal(false);
  demoAccount = "alex.demo";
  reason = "";
  amount = "1.00";
  bucket = "bond";
  finance = signal<any>(null);
  loanPrincipal = "1.00";
  newAgent = {
    id: "",
    name: "",
    description: "",
    category: "writing",
    price: "1.00",
    skills: "Research, Writing",
    acceptsSubcontracts: true,
  };
  returnTo='';
  jobSearch=signal('');jobFilter=signal('all');selectedBids=signal<string[]>([]);alerts=signal<any[]>([]);
  comparisonPreviews=signal<Record<string,any>>({});
  revisionSection='Entire delivery';testAgentSelection:any;testInput='Proposal A has a clear scope and testing plan.\nProposal B has a lower budget but an uncertain maintenance plan.';
  settlementPreview=signal<any>(null);
  decisionDelivery:any;revisionSourceId='';
  filteredJobs=computed(()=>this.jobs().filter(j=>(this.jobFilter()==='all'||j.state===this.jobFilter())&&String(j.title).toLowerCase().includes(this.jobSearch().toLowerCase())));
  policy: any = {};
  awardBps = 10000;
  penaltyBps = 0;
  penaltyCategory = "NO_PENALTY";
  page = computed(() => {
    const p = this.path();
    if(p==='/workspace/tools')return 'workspace';
    if (p === "/client/jobs/new") return "new";
    if (/^\/client\/jobs\/[0-9a-f-]{36}$/.test(p)) return "job";
    if (p === "/client/jobs") return "jobs";
    if (/^\/agents\/[a-z0-9-]{3,48}$/.test(p)) return "profile";
    if (p==="/creator/credit" || p==="/lender/pool")
      return "credit";
    if (["/creator/agents","/creator/earnings","/creator/runs"].includes(p)) return "creator";
    if (p==="/admin/system") return "admin";
    if (p === "/settings") return "settings";
    if(p==='/balance')return 'balance';
    if (p === "/trust") return "trust";
    if (p === "/explorer") return "explorer";
    return p==='/' ? "market" : "notfound";
  });
  filteredAgents = computed(() =>
    this.agents().filter(
      (a) =>
        (this.filter() === "all" || a.category === this.filter()) &&
        `${a.name} ${a.skills.join(" ")} ${a.description}`
          .toLowerCase()
          .includes(this.search().toLowerCase()),
    ),
  );
  ownAgents = computed(() =>
    this.agents().filter((a) => a.ownerId === this.api.user()?.id),
  );
  book=computed(()=>this.api.user()?.book||(this.api.config().chainConfigured?'TESTNET':'SIMULATION'));
  unit = computed(() => this.book()==='TESTNET' ? 'testNEAR' : 'simNEAR');
  activeJobs = computed(
    () =>
      this.jobs().filter(
        (j) => !["SETTLED", "REFUNDED", "CANCELLED", "OPEN"].includes(j.state),
      ).length,
  );
  settledJobs = computed(
    () => this.jobs().filter((j) => j.state === "SETTLED").length,
  );
  nav = [
    { name: "Marketplace", path: "/", icon: "market", page: "market" },
    { name: "My jobs", path: "/client/jobs", icon: "briefcase", page: "jobs" },
    {
      name: "Creator studio",
      path: "/creator/agents",
      icon: "agent",
      page: "creator",
    },
    { name: "Workspace tools", path: "/workspace/tools", icon: "settings", page: "workspace" },
  ];
  poll: any;
  media = matchMedia("(prefers-color-scheme: dark)");
  themeListener = () => this.applyTheme();
  constructor() {
    this.applyTheme();
    this.media.addEventListener("change", this.themeListener);
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.path.set(e.urlAfterRedirects.split("?")[0]);
        this.menu.set(false);
        this.error.set("");
        this.notice.set("");
        void this.load();
        window.scrollTo(0, 0);
      }
    });
    void this.api
      .init()
      .then(async() => {const target=sessionStorage.getItem('orby-return-to');if(this.api.user()&&target==='/client/jobs/new'){sessionStorage.removeItem('orby-return-to');await this.router.navigateByUrl(target);}await this.load();})
      .catch((e) => {
        this.error.set(e.message);
        this.loading.set(false);
      });
    this.poll = setInterval(() => {
      this.now.set(Date.now());
      if(this.now()%60000<2500)void this.api.refreshPrice();
      if(this.api.user()&&document.visibilityState==='visible'&&!this.busy()&&this.now()%20000<2500)void this.api.get('/notifications').then(v=>this.alerts.set(v)).catch(()=>{});
      if (
        document.visibilityState === "visible" &&
        !this.busy() &&
        this.page() === "job" &&
        this.job() &&
        [
          "OPEN",
          "FUNDED",
          "RUNNING",
          "REVISION_REQUIRED",
          "DELIVERED",
          "REVIEW_OPEN",
        ].includes(this.job().state)
      )
        void this.refreshJob();
    }, 2500);
  }
  ngOnDestroy() {
    clearInterval(this.poll);
    this.media.removeEventListener("change", this.themeListener);
  }
  applyTheme() {
    const t = this.theme();
    document.documentElement.dataset["theme"] =
      t === "auto" ? (this.media.matches ? "dark" : "light") : t;
    localStorage.setItem("af-theme", t);
  }
  setTheme(value: string) {
    this.theme.set(value);
    this.applyTheme();
  }
  async load() {
    this.loading.set(true);
    try {
      const book = this.api.user()?.book || (this.api.config().chainConfigured?'TESTNET':'SIMULATION');
      this.agents.set(await this.api.get("/agents?book=" + book));
      if(this.page()==='explorer')this.jobs.set(await this.api.get('/explorer?book='+book));
      if (this.page() === "profile")
        this.profile.set(
          await this.api.get(
            "/agents/" + this.path().split("/").pop() + "?book=" + book,
          ),
        );
      if (this.api.user()) {
        this.alerts.set(await this.api.get('/notifications'));
        if (
          [
            "jobs",
            "creator",
            "credit",
            "admin",
            "settings",
            "balance",
          ].includes(this.page())
        ) {
          const [jobs, balances] = await Promise.all([
            this.api.get("/jobs"),
            this.api.get("/balances"),
          ]);
          this.jobs.set(jobs);
          this.balances.set(balances);
        }
        if (this.page() === "job") await this.refreshJob();
        if (this.page() === "credit" && book === "SIMULATION")
          this.credit.set(await this.api.get("/credit"));
        if (this.page() === "creator")
          {this.runs.set(await this.api.get("/creator/runs"));this.availableJobs.set(await this.api.get('/jobs/open'));}
        if(['settings','balance'].includes(this.page())&&book==='TESTNET')this.operations.set(await this.api.get('/operations'));
        if (this.page() === "admin") {
          const [system, audit] = await Promise.all([
            this.api.get("/admin/system"),
            this.api.get("/admin/audit"),
          ]);
          this.system.set(system);
          this.audit.set(audit);
        }
      }
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.now.set(Date.now());
      this.loading.set(false);
    }
  }
  async refreshJob() {
    try {
      this.job.set(await this.api.get("/jobs/" + this.path().split("/").pop()));
      this.now.set(Date.now());
      if(this.notice().includes('Execution queued')||['Execution is in progress. Follow live collaboration.','Checking the delivered output.','Delivery ready. Review the output and its acceptance checks.'].includes(this.notice())){const state=this.job()?.state;this.notice.set(state==='REVIEW_OPEN'?'Delivery ready. Review the output and its acceptance checks.':state==='DELIVERED'?'Checking the delivered output.':state==='SETTLED'?'Settlement recorded. Inspect the work receipt.':'Execution is in progress. Follow live collaboration.');}
    } catch (e: any) {
      this.error.set(e.message);
    }
  }
  settlementReady(){this.now();return !!this.settlementPreview()&&this.settlementPreview().validUntil>Date.now();}
  settlementRows(){const p=this.settlementPreview();if(!p)return [];return [{label:'Award',amount:p.amounts.award},{label:'Platform fee',amount:p.amounts.fee},{label:'Creator receives',amount:p.amounts.creatorCredit},{label:'Client refund',amount:p.amounts.refund}];}
  bal(bucket: string) {
    if(this.api.user()?.book==='TESTNET'&&!this.balances().chain)return null;
    if (this.balances().chain) return this.balances().chain[bucket] || "0";
    return (
      this.balances().balances?.find((b: any) => b.bucket === bucket)?.amount ||
      "0"
    );
  }
  stateClass(s: string) {
    return ["SETTLED", "PASS", "ACTIVE", "SUCCEEDED", "CONFIRMED"].includes(s)
      ? "good"
      : ["DISPUTED", "FAIL", "FAILED", "SUSPENDED"].includes(s)
        ? "bad"
        : ["OPEN", "CANCELLED"].includes(s)
          ? "neutral"
          : "warn";
  }
  label(s: string) {
    return (s || "").replaceAll("_", " ").toLowerCase();
  }
  tabKey(event: KeyboardEvent, current: string) {
    const names = ["Overview", "Bids", "Deliverables", "Activity", "Receipt"];
    let index = names.indexOf(current);
    if (event.key === "ArrowRight") index = (index + 1) % names.length;
    else if (event.key === "ArrowLeft") index = (index + names.length - 1) % names.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = names.length-1;
    else return;
    event.preventDefault();
    this.tab.set(names[index]);
    document.getElementById("tab-" + names[index])?.focus();
  }
  isTerminal(j: any) {
    return ["SETTLED", "REFUNDED", "CANCELLED"].includes(j?.state);
  }
  open(type: string) {
    if(type==='approve'||type==='revision')this.decisionDelivery={...this.job()?.deliveries?.[0]};
    this.error.set("");
    if(type==='approve'){this.settlementPreview.set(null);void this.api.get('/jobs/'+this.job().id+'/settlement-preview').then(p=>{if(p.revision!==this.decisionDelivery?.revision||p.deliveryHash!==this.decisionDelivery?.hash)throw Error('Delivery changed. Close and review its current version.');this.settlementPreview.set(p);}).catch(e=>this.error.set(e.message));}
    this.dialog.set(type);
    this.reason = "";
    this.testResult.set(null);
    this.modal.nativeElement.showModal();
  }
  close() {
    if(this.dialog()==='login'&&!this.api.user()){this.returnTo='';sessionStorage.removeItem('orby-return-to');}
    this.modal.nativeElement.close();
    this.dialog.set("");
  }
  async act(fn: () => Promise<any>, message = "", label='Saving changes') {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionLabel.set(label);
    this.api.operationStatus.set('');
    this.error.set("");
    this.notice.set("");
    try {
      await fn();
      if (message) this.notice.set(message);
    } catch (e: any) {
      console.error('Orby action failed',e);
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
  async login() {
    await this.act(async () => {
      await this.api.demo(this.demoAccount);
      sessionStorage.removeItem('orby-return-to');
      this.balances.set({balances:[],ledger:[]});
      this.close();
      if(this.returnTo){const target=this.returnTo;this.returnTo='';await this.router.navigateByUrl(target);}
      await this.load();
    }, "Local simulation session opened. All amounts use simNEAR.");
  }
  async connect() {
    await this.act(async () => {
      await this.api.connect();
      this.balances.set({balances:[],ledger:[]});
      if (this.dialog()) this.close();
      if(this.returnTo){const target=this.returnTo;this.returnTo='';sessionStorage.removeItem('orby-return-to');await this.router.navigateByUrl(target);}
      await this.load();
    }, "Testnet wallet session verified.", 'Connecting wallet');
  }
  async reloadView(){await this.act(async()=>{await this.api.init();await this.load();},'','Loading data');}
  async logout() {
    await this.act(async () => {
      await this.api.logout();
      this.jobs.set([]);
      this.job.set(null);
      await this.router.navigateByUrl("/");
      await this.load();
    });
  }
  ensureSession() {
    if (!this.api.user()) {
      if(this.book()==='TESTNET')void this.connect();else this.open("login");
      return false;
    }
    return true;
  }
  create() {
    if(this.api.user()){this.returnTo='';sessionStorage.removeItem('orby-return-to');void this.router.navigateByUrl('/client/jobs/new');return;}
    this.returnTo='/client/jobs/new';sessionStorage.setItem('orby-return-to',this.returnTo);this.ensureSession();
  }
  async onPublished(id:string){await this.router.navigateByUrl('/client/jobs/'+id);}
  async composeFromTools(){await this.router.navigateByUrl('/client/jobs/new');}
  async bids() {
    await this.act(async () => {
      await this.api.post("/jobs/" + this.job().id + "/bids/request");
      await this.refreshJob();
    }, "Fresh bids requested.");
  }
  async reviewFunding(bid: any) {
    await this.act(async () => {
      this.preview.set(
        await this.api.post("/jobs/" + this.job().id + "/funding-preview", {
          bidId: bid.id,
        }),
      );
      this.open("funding");
    });
  }
  async confirmFunding() {
    await this.act(async () => {
      await this.api.post("/jobs/" + this.job().id + "/fund", {
        previewId: this.preview().id,
      });
      this.close();
      await this.refreshJob();
    }, "Escrow funded. Execution queued.", 'Funding escrow');
  }
  async approve() {
    if(!this.settlementReady()){this.error.set('Settlement preview expired. Close and review it again.');return;}
    await this.act(async () => {
      const d=this.decisionDelivery;await this.api.post("/jobs/" + this.job().id + "/approve",{revision:d.revision,deliveryHash:d.hash});
      this.close();
      await this.refreshJob();
    }, "Settlement recorded. Review the breakdown and available balance.");
  }
  async submitDispute() {
    await this.act(async () => {
      await this.api.post("/jobs/" + this.job().id + "/disputes", {
        reason: this.reason,
      });
      this.close();
      await this.refreshJob();
    }, "Dispute opened. Settlement is paused for review.");
  }
  async jobAction(action: string) {
    await this.act(async () => {
      await this.api.post("/jobs/" + this.job().id + "/" + action);
      await this.refreshJob();
    }, "Action recorded.");
  }
  async register() {
    await this.act(async () => {
      await this.api.post("/agents", {
        id: this.agentSlug(this.newAgent.id),
        name: this.newAgent.name,
        description: this.newAgent.description,
        category: this.newAgent.category,
        minPriceNear: decimalToAtomic(this.newAgent.price),
        skills: this.newAgent.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        acceptsSubcontracts: this.newAgent.acceptsSubcontracts,
      });
      this.close();
      await this.load();
    }, "Agent registered.", 'Registering agent');
  }
  editPolicy(a: any) {
    this.policyAgent.set(a);
    this.policy = {
      ...a.policy,
      spend:atomicToDecimal(a.policy.maxSpendYocto),bond:atomicToDecimal(a.policy.maxBondYocto),
      allowedAgentIds: [...a.policy.allowedAgentIds],
      expiresAt: new Date(a.policy.expiresAt).toISOString().slice(0, 16),
    };
    this.open("policy");
  }
  async savePolicy() {
    await this.act(async () => {
      await this.api.post("/agents/" + this.policyAgent().id + "/policy", {
        ...this.policy,
        maxSpendYocto:decimalToAtomic(this.policy.spend),maxBondYocto:decimalToAtomic(this.policy.bond),
        expiresAt: new Date(this.policy.expiresAt + "Z").getTime(),
      });
      this.close();
      await this.load();
    }, "Execution policy updated.");
  }
  async testAgent(a: any) {
    this.testAgentSelection=a;this.open('test');
  }
  async runAgentTest(){
    await this.act(async () => {
      const sources=this.testInput.split('\n').filter(t=>t.trim()).map((text,i)=>({id:'preview-'+(i+1),text}));
      if(!sources.length)throw Error('Add at least one source to preview.');
      const r = await this.api.post("/agents/" + this.testAgentSelection.id + "/test", {
        input: { sources },
      });
      this.testResult.set(r);
    });
  }
  async deposit() {
    await this.act(async () => {
      await this.api.post("/balances/deposit", {
        amount: decimalToAtomic(this.amount),
        bucket: this.bucket,
      });
      this.close();
      await this.load();
    }, "Reserve updated.");
  }
  async withdraw() {
    await this.act(
      async () => {
        await this.api.post("/balances/withdraw", {
          amount: decimalToAtomic(this.amount),
        });
        this.close();
        await this.load();
      },
      this.api.user()?.book === "SIMULATION"
        ? "Simulation withdrawal recorded. No real tokens moved."
        : "Withdrawal submitted and verified.",
    );
  }
  async releaseBond(){await this.act(async()=>{await this.api.post('/balances/release-bond',{amount:decimalToAtomic(this.amount)});this.close();await this.load();},'Unused bond moved to your available balance. Reserved bond was not affected.');}
  async financePreview() {
    await this.act(async () =>
      this.finance.set(
        await this.api.post("/credit/preview", {
          principal: decimalToAtomic(this.loanPrincipal),
        }),
      ),
    );
  }
  async poolDeposit(epoch: any) {
    await this.act(async () => {
      await this.api.post("/pool/deposit", {
        epochId: epoch.id,
        amount: decimalToAtomic(this.amount),
      });
      await this.load();
    }, "Simulation pool deposit recorded.");
  }
  async poolAction(epoch: any, action: string) {
    await this.act(async () => {
      await this.api.post("/pool/" + epoch.id + "/" + action);
      await this.load();
    }, "Pool updated.");
  }
  decide(d: any) {
    this.decisionCase.set(d);
    this.awardBps = 10000;
    this.penaltyBps = 0;
    this.penaltyCategory = "NO_PENALTY";
    this.open("decision");
  }
  async decision() {
    await this.act(async () => {
      await this.api.post(
        "/admin/disputes/" + this.decisionCase().id + "/decision",
        {
          awardBps: Number(this.awardBps),
          penaltyBps: Number(this.penaltyBps),
          reason: this.reason,
          category: this.penaltyCategory,
        },
      );
      this.close();
      await this.load();
    }, "Decision recorded and settlement applied.");
  }
  async pause() {
    await this.act(async () => {
      await this.api.post("/admin/pause", { paused: !this.system().paused });
      await this.load();
    }, "New obligation policy updated.");
  }
  async suspend(a: any) {
    await this.act(async () => {
      await this.api.post("/admin/agents/" + a.id + "/state", {
        state: a.state === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
      });
      await this.load();
    });
  }
  async download() {
    await this.act(async () => {
      const data = await this.api.get("/jobs/" + this.job().id + "/evidence"),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
        );
      const a = document.createElement("a");
      a.href = url;
      a.download = "evidence-" + this.job().id + ".json";
      a.click();
      URL.revokeObjectURL(url);
    }, "Evidence exported.");
  }
  async reconcile() {
    if(this.page()==='admin'&&!this.api.operation()){
      await this.act(async()=>{const result=await this.api.post('/admin/reconcile');await this.load();this.notice.set(`Checked ${result.checked} transaction. Confirmed: ${result.confirmed}. Failed: ${result.failed}. Unresolved: ${result.unresolved}.`);},'','Checking transactions');return;
    }
    await this.act(async () => {
      await this.api.reconcilePending();
      await this.load();
    }, "Operation reconciled.");
  }
  agentSlug(value:string){return value.trim().toLowerCase().replace(/\s+/g,'-');}
  @HostListener('document:visibilitychange')visibilityChanged(){if(document.visibilityState==='visible'){this.now.set(Date.now());if(this.page()==='job'&&this.job())void this.refreshJob();}}
  atomic(value:string){try{return decimalToAtomic(value)}catch{return null}}
  remaining(deadline:any){const ms=Number(deadline)-this.now();if(!Number.isFinite(ms))return 'Deadline unavailable';if(ms<=0)return 'Expired';const days=Math.ceil(ms/86400000);if(ms>=86400000)return days===7?'1 week':days+' day'+(days===1?'':'s');const hours=Math.ceil(ms/3600000);return ms>=3600000?hours+' hour'+(hours===1?'':'s'):Math.ceil(ms/60000)+' min';}
  bidIsNative(){return !!this.proposalJob?.near_budget;}
  bidAgents(){return this.ownAgents().filter(a=>a.state==='ACTIVE'&&(this.bidIsNative()||BigInt(a.minPriceUsdMicro||'0')>0n));}
  openBid(job:any){this.proposalJob=job;this.bidAgent=this.bidAgents()[0]?.id||'';this.bidAmount='1';this.open('bid');}
  async submitBid(){await this.act(async()=>{await this.api.post('/jobs/'+this.proposalJob.id+'/bids',{agentId:this.bidAgent,amount:decimalToAtomic(this.bidAmount,this.bidIsNative()?24:6)});this.close();await this.load();},'Proposal submitted.','Submitting proposal');}
  async recoverAgent(a:any){await this.act(async()=>{
    const pending=this.api.operation();
    if(pending?.args?.agent_id===a.id && ['register_agent','register_near_agent'].includes(pending.methodName))await this.api.resumeSignature();
    else await this.api.post('/agents/'+a.id+'/retry-registration');
    await this.load();
  },'Agent registration recovered.','Recovering registration');}
  async resumeOperation(){await this.act(async()=>{await this.api.resumeSignature();await this.load();},'Transaction confirmed.','Waiting for signature');}
  async checkPendingHash(){await this.act(async()=>{await this.api.checkTransactionHash(this.pendingTxHash);await this.load();},'Transaction confirmed.','Checking transaction');}
  nextAction(j:any){return j.pending_operation?'Review pending transaction':j.state==='OPEN'?'Choose an agent':j.state==='REVIEW_OPEN'?'Review delivery':j.state==='REVISION_REQUIRED'?'Review revision request':j.state==='DISPUTED'?'View dispute':j.state==='FUNDED'||j.state==='RUNNING'?'Follow progress':'View outcome';}
  async openAction(j:any){await this.router.navigateByUrl('/client/jobs/'+j.id);this.tab.set(j.state==='OPEN'?'Bids':j.state==='REVIEW_OPEN'?'Deliverables':'Overview');if(j.pending_operation)await this.recoverHistory(j.pending_operation);}
  async copyJob(j:any){await this.act(async()=>{const full=await this.api.get('/jobs/'+j.id);saveDraft(this.api.user().id,this.book(),{draft:{title:full.title,description:full.description,category:full.category,budget:'',deadlineDays:Math.max(1,Math.ceil(full.deadlineMinutes/1440)),approvalPolicy:full.approvalPolicy,sources:full.input.sources},checks:checksFromCriteria(full.criteria),files:[],step:1},this.api.user()?.workspaceId||'');await this.router.navigateByUrl('/client/jobs/new');});}
  async saveTemplate(){await this.act(async()=>{await this.api.post('/templates/from-job/'+this.job().id,{name:this.job().title});},'Template saved. Add new sources and budget when you reuse it.');}
  toggleBid(id:string){this.selectedBids.update(ids=>ids.includes(id)?ids.filter(x=>x!==id):ids.length<3?[...ids,id]:ids);if(this.selectedBids().includes(id)&&!this.comparisonPreviews()[id])void this.api.post('/jobs/'+this.job().id+'/funding-preview',{bidId:id}).then(p=>this.comparisonPreviews.update(v=>({...v,[id]:p}))).catch(e=>this.comparisonPreviews.update(v=>({...v,[id]:{error:e.message}})));}
  agentCompleted(id:string){return this.agents().find(a=>a.id===id)?.completed||0;}
  comparedBids(){return this.job()?.bids.filter((b:any)=>this.selectedBids().includes(b.id))||[];}
  previousDelivery(revision:number){return this.job()?.deliveries.find((d:any)=>d.revision===revision-1)?.content;}
  requestRevision(section:string){this.revisionSection=section;this.revisionSourceId='';this.open('revision');}
  insufficientEvidence(value:any){this.revisionSection=value.section+' · source '+value.sourceId;this.revisionSourceId=value.sourceId;this.open('revision');this.reason='The evidence from '+value.sourceId+' does not support this claim. ';}
  async submitRevision(){await this.act(async()=>{const d=this.decisionDelivery;await this.api.post('/jobs/'+this.job().id+'/revisions',{reason:this.reason,section:this.revisionSection,revision:d.revision,deliveryHash:d.hash,sourceId:this.revisionSourceId||undefined});this.close();await this.refreshJob();},'Revision requested for this delivery version.');}
  async recoverHistory(row:any){await this.act(async()=>{await this.api.restoreOperation(row);await this.load();},'Transaction checked.');}
}
