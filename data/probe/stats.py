import json, math, statistics as st
d=[r for r in json.load(open("results2.json",encoding="utf-8")) if "error" not in r]
print(f"n={len(d)}  subject={sum(1 for r in d if r['atype']=='subject')} event={sum(1 for r in d if r['atype']=='event')}")

def q(v,p):
    v=sorted(v); k=(len(v)-1)*p; f=math.floor(k); c=math.ceil(k)
    return v[f] if f==c else v[f]+(v[c]-v[f])*(k-f)

print("\n=== H1: does HALF-LIFE differ by class? (t50, days) ===")
print(f"{'class':10} {'n':>3} {'min':>6} {'p25':>6} {'med':>6} {'p75':>6} {'max':>6}")
for k in ["death","scandal","disaster","attack","sport","culture","politics"]:
    v=[r["t50"] for r in d if r["class"]==k and r["t50"] is not None]
    print(f"{k:10} {len(v):>3} {min(v):>6.2f} {q(v,.25):>6.2f} {st.median(v):>6.2f} {q(v,.75):>6.2f} {max(v):>6.2f}")
allt=[r["t50"] for r in d if r["t50"] is not None]
print(f"{'ALL':10} {len(allt):>3} {min(allt):>6.2f} {q(allt,.25):>6.2f} {st.median(allt):>6.2f} {q(allt,.75):>6.2f} {max(allt):>6.2f}")

print("\n=== same, on t10 (better resolved) ===")
for k in ["death","scandal","disaster","attack","sport","culture","politics"]:
    v=[r["t10"] for r in d if r["class"]==k and r["t10"] is not None]
    print(f"{k:10} {len(v):>3} {min(v):>6.2f} {q(v,.25):>6.2f} {st.median(v):>6.2f} {q(v,.75):>6.2f} {max(v):>6.2f}")

print("\n=== H2: exponential vs power-law decay (days 1-30) ===")
pw=sum(1 for r in d if r["pow_r2"] and r["exp_r2"] and r["pow_r2"]>r["exp_r2"])
print(f"power-law fits better: {pw}/{len(d)}   median pow_r2={st.median([r['pow_r2'] for r in d if r['pow_r2']]):.3f}  median exp_r2={st.median([r['exp_r2'] for r in d if r['exp_r2']]):.3f}")
al=[r["pow_a"] for r in d if r["pow_a"]]
print(f"power-law exponent alpha: min={min(al):.2f} p25={q(al,.25):.2f} med={st.median(al):.2f} p75={q(al,.75):.2f} max={max(al):.2f}")
print("  -> under power law, time-to-halve from day t = t * 2^(1/alpha):")
for a in [q(al,.25), st.median(al), q(al,.75)]:
    print(f"     alpha={a:.2f}: from d1 -> {2**(1/a):.1f}d,  from d7 -> {7*(2**(1/a)-1):.1f}d more,  from d30 -> {30*(2**(1/a)-1):.1f}d more")

print("\n=== H3: is decay rate related to how big the spike was? ===")
pairs=[(math.log10(r["peak"]), r["t50"]) for r in d if r["t50"]]
mx=st.mean([p[0] for p in pairs]); my=st.mean([p[1] for p in pairs])
num=sum((x-mx)*(y-my) for x,y in pairs); den=math.sqrt(sum((x-mx)**2 for x,_ in pairs)*sum((y-my)**2 for _,y in pairs))
print(f"corr(log10 peak, t50) = {num/den:+.3f}   over peak range {min(r['peak'] for r in d):,} .. {max(r['peak'] for r in d):,}")
pairs2=[(math.log10(r["peak"]), r["pow_a"]) for r in d if r["pow_a"]]
mx=st.mean([p[0] for p in pairs2]); my=st.mean([p[1] for p in pairs2])
num=sum((x-mx)*(y-my) for x,y in pairs2); den=math.sqrt(sum((x-mx)**2 for x,_ in pairs2)*sum((y-my)**2 for _,y in pairs2))
print(f"corr(log10 peak, alpha) = {num/den:+.3f}")

print("\n=== H4: what DOES vary — the residue (permanent lift at +365d, x baseline) ===")
print(f"{'class':10} {'n':>3} {'min':>8} {'med':>8} {'max':>10}  {'%below0':>8}")
for k in ["death","scandal","disaster","attack","sport","culture","politics"]:
    v=[r["res365"] for r in d if r["class"]==k and r["res365"] is not None and r["baseline"]>500]
    if not v: continue
    below=100*sum(1 for x in v if x<0)/len(v)
    print(f"{k:10} {len(v):>3} {min(v):>8.2f} {st.median(v):>8.2f} {max(v):>10.2f}  {below:>7.0f}%")
v=[r["res365"] for r in d if r["res365"] is not None and r["baseline"]>500]
print(f"{'ALL':10} {len(v):>3} {min(v):>8.2f} {st.median(v):>8.2f} {max(v):>10.2f}  {100*sum(1 for x in v if x<0)/len(v):>7.0f}%")

print("\n  dynamic range: t50 spans %.1fx ; res365 spans across zero (sign flip)" % (max(allt)/min(allt)))

print("\n=== deaths where the person ended the year LESS looked-up than before dying ===")
for r in sorted([r for r in d if r["class"]=="death" and r["res365"] is not None], key=lambda r:r["res365"]):
    print(f"  {r['article']:35} peak {r['peak']:>10,}  t50 {r['t50']:>5.2f}d  +365d {r['res365']:+6.2f}x baseline")
