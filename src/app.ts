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
import { MoneyPipe, decimalToAtomic } from "./money";
import { NearAmount } from "./near-amount";
import { UiErrors } from './ui-errors';
@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet, MoneyPipe, NearAmount],
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
  attachments=signal<any[]>([]);
  publishAttachments=false;
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
  step = signal(1);
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
  policy: any = {};
  awardBps = 10000;
  penaltyBps = 0;
  penaltyCategory = "NO_PENALTY";
  draft = {
    title: "Compare three project proposals",
    description:
      "Compare the scope, budget and delivery plans of the three proposals. Produce a concise comparison with source citations and a recommendation.",
    category: "writing",
    budget: "4.00",
    deadlineDays: 2,
    approvalPolicy: "MANUAL_APPROVAL",
    sources: [
      {
        id: "proposal-a",
        text: "Proposal A: Build a simple research tool. Budget $5,000. Delivery in six weeks. Strong technical detail, but no user testing plan.",
      },
      {
        id: "proposal-b",
        text: "Proposal B: Build a focused writing assistant. Budget $4,000. Delivery in four weeks. Includes user testing, clear milestones and a maintenance plan.",
      },
      {
        id: "proposal-c",
        text: "Proposal C: Build a broad automation platform. Budget $9,000. Delivery in twelve weeks. Broad capabilities but complex scope and uncertain milestones.",
      },
    ],
  };
  page = computed(() => {
    const p = this.path();
    if (p === "/client/jobs/new") return "new";
    if (/^\/client\/jobs\/[0-9a-f-]{36}$/.test(p)) return "job";
    if (p === "/client/jobs") return "jobs";
    if (/^\/agents\/[a-z0-9-]{3,48}$/.test(p)) return "profile";
    if (p==="/creator/credit" || p==="/lender/pool")
      return "credit";
    if (["/creator/agents","/creator/earnings","/creator/runs"].includes(p)) return "creator";
    if (p==="/admin/system") return "admin";
    if (p === "/settings") return "settings";
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
  unit = computed(() => this.book()==='TESTNET' ? 'NEAR' : 'simNEAR');
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
    { name: "Credit", path: "/creator/credit", icon: "credit", page: "credit" },
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
      .then(() => this.load())
      .catch((e) => {
        this.error.set(e.message);
        this.loading.set(false);
      });
    this.poll = setInterval(() => {
      this.now.set(Date.now());
      if(this.now()%60000<2500)void this.api.refreshPrice();
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
        if (
          [
            "jobs",
            "creator",
            "credit",
            "admin",
            "settings",
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
        if(this.page()==='settings'&&book==='TESTNET')this.operations.set(await this.api.get('/operations'));
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
    } catch (e: any) {
      this.error.set(e.message);
    }
  }
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
    const names = ["Overview", "Bids", "Deliverables", "Activity"];
    let index = names.indexOf(current);
    if (event.key === "ArrowRight") index = (index + 1) % 4;
    else if (event.key === "ArrowLeft") index = (index + 3) % 4;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = 3;
    else return;
    event.preventDefault();
    this.tab.set(names[index]);
    document.getElementById("tab-" + names[index])?.focus();
  }
  isTerminal(j: any) {
    return ["SETTLED", "REFUNDED", "CANCELLED"].includes(j?.state);
  }
  open(type: string) {
    this.error.set("");
    this.dialog.set(type);
    this.reason = "";
    this.testResult.set(null);
    this.modal.nativeElement.showModal();
  }
  close() {
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
      this.balances.set({balances:[],ledger:[]});
      this.close();
      await this.load();
    }, "Local simulation session opened. All amounts use simNEAR.");
  }
  async connect() {
    await this.act(async () => {
      await this.api.connect();
      this.balances.set({balances:[],ledger:[]});
      if (this.dialog()) this.close();
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
      this.open("login");
      return false;
    }
    return true;
  }
  create() {
    if (this.ensureSession())
      void this.router.navigateByUrl("/client/jobs/new");
  }
  criteria() {
    const list: any[] = [
      {
        id: "structure",
        type: "AUTO_CHECK",
        required: true,
        description: "A comparison with all required fields",
        config: {
          check: "json-required-keys",
          keys: ["comparison", "recommendation", "sources"],
        },
      },
      {
        id: "items",
        type: "AUTO_CHECK",
        required: true,
        description: `One row per proposal (${this.draft.sources.length} total)`,
        config: {
          check: "item-count",
          min: this.draft.sources.length,
          max: this.draft.sources.length,
        },
      },
      {
        id: "sources",
        type: "AUTO_CHECK",
        required: true,
        description: "Each proposal cites the supplied sources",
        config: { check: "source-ids" },
      },
      {
        id: "length",
        type: "AUTO_CHECK",
        required: true,
        description: "Recommendation between 10 and 300 words",
        config: { check: "word-count", min: 10, max: 300 },
      },
    ];
    if (this.draft.approvalPolicy === "MANUAL_APPROVAL")
      list.push({
        id: "approval",
        type: "CLIENT_APPROVE",
        required: true,
        description: "Client explicitly approves the recommendation",
      });
    return list;
  }
  async publish() {
    await this.act(async () => {
      const j = await this.api.post("/jobs", {
        title: this.draft.title,
        description: this.draft.description,
        category: this.draft.category,
        nearYocto: decimalToAtomic(this.draft.budget),
        deadlineMinutes: Number(this.draft.deadlineDays)*1440,
        attachmentIds:this.attachments().map(f=>f.id),
        approvalPolicy: this.draft.approvalPolicy,
        input: { sources: this.draft.sources },
        criteria: this.criteria(),
      });
      await this.api.post("/jobs/" + j.id + "/bids/request");
      await this.router.navigateByUrl("/client/jobs/" + j.id);
      this.step.set(1);
      this.attachments.set([]);
    }, "Job published.", 'Creating job');
  }
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
    await this.act(async () => {
      await this.api.post("/jobs/" + this.job().id + "/approve");
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
      allowedAgentIds: [...a.policy.allowedAgentIds],
      expiresAt: new Date(a.policy.expiresAt).toISOString().slice(0, 16),
    };
    this.open("policy");
  }
  async savePolicy() {
    await this.act(async () => {
      await this.api.post("/agents/" + this.policyAgent().id + "/policy", {
        ...this.policy,
        expiresAt: new Date(this.policy.expiresAt + "Z").getTime(),
      });
      this.close();
      await this.load();
    }, "Execution policy updated.");
  }
  async testAgent(a: any) {
    await this.act(async () => {
      const r = await this.api.post("/agents/" + a.id + "/test", {
        input: { sources: this.draft.sources },
      });
      this.open("test");
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
  nearValue(value:any,kind='job'){
    try{return kind==='agent' ? value.minPriceNear||String((BigInt(value.minPriceUsdMicro)*10n**24n+4999999n)/5000000n) : value.nearYocto||value.near_budget||String((BigInt(value.usdMicro||value.usd_micro||'0')*10n**24n+4999999n)/5000000n);}catch{return null;}
  }
  atomic(value:string){try{return decimalToAtomic(value)}catch{return null}}
  remaining(deadline:any){const ms=Number(deadline)-this.now();if(!Number.isFinite(ms))return 'Deadline unavailable';if(ms<=0)return 'Expired';const days=Math.ceil(ms/86400000);if(ms>=86400000)return days===7?'1 week':days+' day'+(days===1?'':'s');const hours=Math.ceil(ms/3600000);return ms>=3600000?hours+' hour'+(hours===1?'':'s'):Math.ceil(ms/60000)+' min';}
  addSource(){if(this.draft.sources.length<30)this.draft.sources.push({id:'source-'+crypto.randomUUID().slice(0,8),text:''});}
  removeSource(index:number){if(this.draft.sources.length>1)this.draft.sources.splice(index,1);}
  async uploadFiles(event:Event){
    const input=event.target as HTMLInputElement,files=Array.from(input.files||[]);
    await this.act(async()=>{
      if(files.length+this.attachments().length>5)throw Error('Attach up to five files per job.');
      for(const file of files){
        if(!/\.(pdf|txt|md|json|png|jpe?g)$/i.test(file.name)||file.size===0||file.size>2097152)throw Error('Allowed: PDF, TXT, MD, JSON, PNG, JPEG; maximum 2 MiB per file.');
        const dataBase64=await new Promise<string>((done,reject)=>{const r=new FileReader();r.onload=()=>done(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Could not read '+file.name));r.readAsDataURL(file)});
        const uploaded=await this.api.post('/uploads',{name:file.name,dataBase64,publishToIpfs:this.publishAttachments});this.attachments.update(list=>[...list,uploaded]);
      }
    },'Attachments uploaded.','Uploading files');input.value='';
  }
  async removeAttachment(file:any){await this.act(async()=>{await this.api.post('/uploads/'+file.id+'/remove');this.attachments.update(list=>list.filter(f=>f.id!==file.id));});}
  openBid(job:any){this.proposalJob=job;this.bidAgent=this.ownAgents()[0]?.id||'';this.bidAmount='1';this.open('bid');}
  async submitBid(){await this.act(async()=>{await this.api.post('/jobs/'+this.proposalJob.id+'/bids',{agentId:this.bidAgent,amount:decimalToAtomic(this.bidAmount)});this.close();await this.load();},'Proposal submitted.','Submitting proposal');}
  async resumeOperation(){await this.act(async()=>{await this.api.resumeSignature();await this.load();},'Transaction confirmed.','Waiting for signature');}
  async checkPendingHash(){await this.act(async()=>{await this.api.checkTransactionHash(this.pendingTxHash);await this.load();},'Transaction confirmed.','Checking transaction');}
}
