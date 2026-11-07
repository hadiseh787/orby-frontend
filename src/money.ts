import { Pipe, PipeTransform } from "@angular/core";
export function atomicToDecimal(value:string,decimals=24){const n=BigInt(value||'0'),q=10n**BigInt(decimals),fraction=(n%q).toString().padStart(decimals,'0').replace(/0+$/,'');return String(n/q)+(fraction?'.'+fraction:'');}
export function decimalToAtomic(value: string, decimals = 24) {
  if (!/^\d+(\.\d+)?$/.test(value))
    throw new Error("Enter a positive decimal amount.");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error("Too many decimal places.");
  return String(
    BigInt(whole) * 10n ** BigInt(decimals) +
      BigInt((fraction + "0".repeat(decimals)).slice(0, decimals)),
  );
}
@Pipe({ name: "money", standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(value: any, decimals = 24, places = 6): string {
    if (value === null || value === undefined || value === "") return "—";
    try {
      let n = BigInt(value);
      const negative = n < 0n;
      n = negative ? -n : n;
      const q = 10n ** BigInt(decimals),
        whole = n / q;
      let f = (n % q).toString().padStart(decimals, "0").slice(0, places);
      if (n > 0n && whole === 0n && BigInt(f || "0") === 0n)
        return (negative ? "−" : "") + "<0." + "0".repeat(places - 1) + "1";
      f=f.replace(/0+$/,"");
      return (
        (negative ? "−" : "") +
        whole.toLocaleString("en-US") +
        (f ? "." + f : "")
      );
    } catch {
      return "—";
    }
  }
}
