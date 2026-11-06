import { Injectable, signal } from "@angular/core";
@Injectable({ providedIn: "root" })
export class Api {
  user = signal<any>(null);
  config = signal<any>({});
  private connector: any;
  async get(path: string) {
    return this.request(path);
  }
  async post(
    path: string,
    body: any = {},
    key = crypto.randomUUID(),
  ): Promise<any> {
    const result = await this.request(path, body, key);
    if (result?.operation) {
      await this.sign(result.operation);
      return result;
    }
    return result;
  }
  async request(path: string, body?: any, key?: string) {
    const response = await fetch("/api/v1" + path, {
      credentials: "include",
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined
          ? {}
          : {
              "Content-Type": "application/json",
              "X-CSRF-Token": this.user()?.csrf || "",
              "Idempotency-Key": key || crypto.randomUUID(),
            },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) this.user.set(null);
      throw new Error(data.message || "The request failed.");
    }
    return data;
  }
  async init() {
    const [config, user] = await Promise.all([
      this.get("/config"),
      this.get("/auth/me"),
    ]);
    this.config.set(config);
    this.user.set(user);
    const fragment=new URLSearchParams(location.hash.slice(1));
    const pending=sessionStorage.getItem('af-challenge');
    if(pending&&fragment.get('signature')){
      const challenge=JSON.parse(pending);
      this.user.set(await this.post('/auth/verify',{challengeId:challenge.id,accountId:fragment.get('accountId'),publicKey:fragment.get('publicKey'),signature:fragment.get('signature')}));
      sessionStorage.removeItem('af-challenge');history.replaceState(null,'',location.pathname);
    }
    const query=new URLSearchParams(location.search),raw=localStorage.getItem('af-operation');
    if(raw&&query.get('transactionHashes')){
      const op=JSON.parse(raw),result=await this.request('/operations/'+op.operationId+'/transaction',{txHash:query.get('transactionHashes')!.split(',')[0]});
      if(result.state==='CONFIRMED'){localStorage.removeItem('af-operation');history.replaceState(null,'',location.pathname);}
    }
  }
  async demo(account: string) {
    this.user.set(await this.post("/auth/demo", { account }));
  }
  async wallet() {
    const { NearConnector } = await import("@hot-labs/near-connect");
    this.connector ||= new NearConnector({
      network: "testnet",
      features: { signMessage: true },
      autoConnect: false,
    });
    return this.connector;
  }
  async connect() {
    const c = await this.wallet(),
      challenge = await this.post("/auth/challenge");
    const nonce = Uint8Array.from(atob(challenge.nonce), (v) =>
      v.charCodeAt(0),
    );
    const wallet = await c.connect();
    const accounts = await wallet.getAccounts();
    sessionStorage.setItem('af-challenge',JSON.stringify(challenge));
    const signed = await wallet.signMessage({
      message: challenge.message,
      recipient: challenge.recipient,
      nonce,
      signerId: accounts[0].accountId,
      network: "testnet",
      callbackUrl:challenge.callbackUrl,
    });
    this.user.set(
      await this.post("/auth/verify", {
        challengeId: challenge.id,
        accountId: signed.accountId,
        publicKey: signed.publicKey,
        signature: signed.signature,
      }),
    );
    sessionStorage.removeItem('af-challenge');
  }
  async sign(op: any) {
    localStorage.setItem("af-operation", JSON.stringify(op));
    const c = await this.wallet(),
      wallet = await c.wallet();
    const result = await wallet.signAndSendTransaction({
      signerId: op.signerId,
      receiverId: op.receiverId,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: op.methodName,
            args: op.args,
            gas: op.gas,
            deposit: op.attachedDepositYocto,
          },
        },
      ],
    });
    const txHash = result?.transaction?.hash;
    if (!txHash)
      throw new Error(
        "The wallet did not return a transaction hash. Check the pending operation before retrying.",
      );
    const confirmed = await this.request(
      "/operations/" + op.operationId + "/transaction",
      { txHash },
    );
    if (confirmed.state !== "CONFIRMED")
      throw new Error(
        confirmed.nextAction ||
          "Transaction " +
            confirmed.state +
            ". Reconcile before submitting again.",
      );
    localStorage.removeItem("af-operation");
  }
  async logout() {
    await this.post("/auth/logout");
    this.user.set(null);
  }
}
