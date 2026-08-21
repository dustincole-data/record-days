# Suspected confound: the pre-death baseline is contaminated by end-of-life news
# (hospitalisations, birthday campaigns, biopics). Re-measure baseline from a CLEAN
# window one year BEFORE the event, and compare the two.
import json, time, urllib.parse, datetime as dt, statistics as st
import requests
UA="AttentionHalfLife/0.1 (https://dustincoledata.com; dustincole.ent@gmail.com)"
B="https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{a}/daily/{s}/{e}"
d=[r for r in json.load(open("results2.json",encoding="utf-8")) if "error" not in r and r["class"]=="death"]
print(f"{'article':32} {'near-base':>10} {'clean-base':>10} {'infl':>6} {'+365 vs near':>13} {'+365 vs clean':>14}")
flips=0
for r in d:
    art=urllib.parse.quote(r["article"].replace(" ","_"),safe="")
    d0=dt.date.fromisoformat(r["event"])
    s=(d0-dt.timedelta(days=455)).strftime("%Y%m%d"); e=(d0-dt.timedelta(days=270)).strftime("%Y%m%d")
    resp=requests.get(B.format(a=art,s=s,e=e),headers={"User-Agent":UA},timeout=30)
    if resp.status_code!=200:
        print(f"{r['article'][:32]:32} HTTP {resp.status_code}"); continue
    v=[i["views"] for i in resp.json().get("items",[])]
    if len(v)<120: print(f"{r['article'][:32]:32} short({len(v)})"); continue
    clean=st.median(v); near=r["baseline"]
    if r["res365"] is None: continue
    later=near*(1+r["res365"])           # reconstruct absolute views at +365
    rc=(later-clean)/clean
    if (r["res365"]<0) != (rc<0): flips+=1; mark=" <-FLIP"
    else: mark=""
    print(f"{r['article'][:32]:32} {near:>10,.0f} {clean:>10,.0f} {near/clean:>6.2f} {r['res365']:>+13.2f} {rc:>+14.2f}{mark}")
print(f"\nsign flips when baseline is cleaned: {flips}/{len(d)}")
