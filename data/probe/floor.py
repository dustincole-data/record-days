# Final floor numbers on CLEAN baselines (median of days -455..-270, a year before the
# event) for every subject-type article where that window exists. These are the numbers
# beat 1 of the piece will state, so they get computed once, here, and cited.
import json, time, urllib.parse, datetime as dt, statistics as st
import requests
UA="AttentionHalfLife/0.1 (https://dustincoledata.com; dustincole.ent@gmail.com)"
B="https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{a}/daily/{s}/{e}"
API_START=dt.date(2015,7,1)
d=[r for r in json.load(open("results2.json",encoding="utf-8")) if "error" not in r and r["atype"]=="subject"]
rows=[];skip=[]
for r in d:
    d0=dt.date.fromisoformat(r["event"])
    if (d0-dt.timedelta(days=455))<API_START: skip.append((r["article"],"pre-API")); continue
    if r["res365"] is None: skip.append((r["article"],"no +365")); continue
    art=urllib.parse.quote(r["article"].replace(" ","_"),safe="")
    s=(d0-dt.timedelta(days=455)).strftime("%Y%m%d"); e=(d0-dt.timedelta(days=270)).strftime("%Y%m%d")
    resp=requests.get(B.format(a=art,s=s,e=e),headers={"User-Agent":UA},timeout=30)
    if resp.status_code!=200: skip.append((r["article"],f"HTTP{resp.status_code}")); continue
    v=[i["views"] for i in resp.json().get("items",[])]
    if len(v)<120: skip.append((r["article"],f"short{len(v)}")); continue
    clean=st.median(v)
    if clean<400: skip.append((r["article"],f"baseline too small ({clean:.0f})")); continue
    later=r["baseline"]*(1+r["res365"])
    rows.append({"article":r["article"],"class":r["class"],"event":r["event"],"peak":r["peak"],
                 "t50":r["t50"],"clean_base":round(clean),"yr_later":round(later),
                 "floor":round((later-clean)/clean,3),"runup":round(r["baseline"]/clean,2)})
    time.sleep(0.2)
rows.sort(key=lambda x:x["floor"])
print(f"{'article':34}{'class':9}{'peak':>11}{'t50':>6}{'clean base':>11}{'+1yr':>10}{'floor':>8}{'run-up':>8}")
for x in rows: print(f"{x['article'][:33]:34}{x['class']:9}{x['peak']:>11,}{x['t50']:>6.2f}{x['clean_base']:>11,}{x['yr_later']:>10,}{x['floor']:>+8.2f}{x['runup']:>8.2f}")
below=[x for x in rows if x["floor"]<0]
print(f"\nn={len(rows)} measurable | BELOW clean baseline a year later: {len(below)} ({100*len(below)/len(rows):.0f}%)")
dth=[x for x in rows if x["class"]=="death"]; dbl=[x for x in dth if x["floor"]<0]
print(f"deaths: {len(dbl)}/{len(dth)} below | floor range {min(x['floor'] for x in rows):+.2f} .. {max(x['floor'] for x in rows):+.2f}")
ru=[x["runup"] for x in dth]
print(f"death run-up (near-base / clean-base): med {st.median(ru):.2f}x, max {max(ru):.2f}x  <- the confound, quantified")
print("\nSKIPPED:"); [print(f"  {a:34} {w}") for a,w in skip]
json.dump(rows,open("floor.json","w",encoding="utf-8"),indent=1)
