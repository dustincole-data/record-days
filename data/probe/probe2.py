import json, time, math, urllib.parse, datetime as dt, statistics as st
import requests

UA = "AttentionHalfLife/0.1 (https://dustincoledata.com; dustincole.ent@gmail.com)"
BASE = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{art}/daily/{s}/{e}"

E = [
 ("Kobe Bryant","2020-01-26","death"),("Chadwick Boseman","2020-08-28","death"),
 ("Matthew Perry","2023-10-28","death"),("Prince (musician)","2016-04-21","death"),
 ("Betty White","2021-12-31","death"),("Elizabeth II","2022-09-08","death"),
 ("Stephen Hawking","2018-03-14","death"),("Tina Turner","2023-05-24","death"),
 ("David Bowie","2016-01-10","death"),("Muhammad Ali","2016-06-03","death"),
 ("Carrie Fisher","2016-12-27","death"),("George Michael","2016-12-25","death"),
 ("Aretha Franklin","2018-08-16","death"),("Kirk Douglas","2020-02-05","death"),
 ("Sean Connery","2020-10-31","death"),("Eddie Van Halen","2020-10-06","death"),
 ("Ruth Bader Ginsburg","2020-09-18","death"),("Prince Philip, Duke of Edinburgh","2021-04-09","death"),
 ("Sidney Poitier","2022-01-06","death"),("Olivia Newton-John","2022-08-08","death"),
 ("Sinéad O'Connor","2023-07-26","death"),("Jimmy Buffett","2023-09-01","death"),
 ("Norm Macdonald","2021-09-14","death"),("Bob Saget","2022-01-09","death"),
 ("Pelé","2022-12-29","death"),("Tony Bennett","2023-07-21","death"),
 ("Henry Kissinger","2023-11-29","death"),("Shane MacGowan","2023-11-30","death"),

 ("Harvey Weinstein","2017-10-05","scandal"),("Jeffrey Epstein","2019-07-06","scandal"),
 ("Elizabeth Holmes","2022-01-03","scandal"),("Sam Bankman-Fried","2022-11-08","scandal"),
 ("Theranos","2015-10-15","scandal"),("Kevin Spacey","2017-10-29","scandal"),
 ("Louis C.K.","2017-11-09","scandal"),("Matt Lauer","2017-11-29","scandal"),
 ("Prince Andrew, Duke of York","2019-11-16","scandal"),("Wells Fargo","2016-09-08","scandal"),
 ("Boeing 737 MAX","2019-03-10","scandal"),("Volkswagen","2015-09-18","scandal"),
 ("Armie Hammer","2021-01-10","scandal"),("Ellen DeGeneres","2020-07-30","scandal"),
 ("Bill Cosby","2018-04-26","scandal"),("R. Kelly","2019-01-03","scandal"),
 ("Ghislaine Maxwell","2020-07-02","scandal"),("Rudy Giuliani","2020-11-19","scandal"),

 ("Notre-Dame de Paris","2019-04-15","disaster"),("Suez Canal","2021-03-23","disaster"),
 ("East Palestine, Ohio","2023-02-03","disaster"),("Lahaina, Hawaii","2023-08-08","disaster"),
 ("Flint, Michigan","2016-01-16","disaster"),("Francis Scott Key Bridge (Baltimore)","2024-03-26","disaster"),
 ("Grenfell Tower","2017-06-14","disaster"),("Surfside, Florida","2021-06-24","disaster"),
 ("Paradise, California","2018-11-08","disaster"),("Titan (submersible)","2023-06-18","disaster"),
 ("2023 Turkey–Syria earthquakes","2023-02-06","disaster"),("Hurricane Ian","2022-09-28","disaster"),
 ("2023 Hawaii wildfires","2023-08-08","disaster"),("Hurricane Harvey","2017-08-25","disaster"),

 ("2017 Las Vegas shooting","2017-10-01","attack"),("November 2015 Paris attacks","2015-11-13","attack"),
 ("Orlando nightclub shooting","2016-06-12","attack"),("Manchester Arena bombing","2017-05-22","attack"),
 ("Robb Elementary School shooting","2022-05-24","attack"),("Bataclan (theatre)","2015-11-13","attack"),
 ("Pulse (nightclub)","2016-06-12","attack"),("Marjory Stoneman Douglas High School","2018-02-14","attack"),

 ("Lionel Messi","2022-12-18","sport"),("Simone Biles","2021-07-27","sport"),
 ("Damar Hamlin","2023-01-02","sport"),("Novak Djokovic","2022-01-05","sport"),
 ("Naomi Osaka","2021-05-31","sport"),("Caitlin Clark","2024-04-15","sport"),

 ("J. Robert Oppenheimer","2023-07-21","culture"),("Freddie Mercury","2018-11-02","culture"),
 ("Elton John","2019-05-31","culture"),("Will Smith","2022-03-27","culture"),
 ("James Webb Space Telescope","2022-07-12","culture"),("Chandrayaan-3","2023-08-23","culture"),
 ("Anna Sorokin","2022-02-11","culture"),("Bernie Madoff","2021-04-14","culture"),

 ("Kamala Harris","2020-08-11","politics"),("Liz Truss","2022-09-05","politics"),
 ("Volodymyr Zelenskyy","2022-02-24","politics"),("JD Vance","2024-07-15","politics"),
 ("Nancy Pelosi","2022-08-02","politics"),("Kevin McCarthy","2023-10-03","politics"),
]

def fetch(article, s, e):
    art = urllib.parse.quote(article.replace(" ","_"), safe="")
    r = requests.get(BASE.format(art=art,s=s,e=e), headers={"User-Agent":UA}, timeout=30)
    if r.status_code != 200: return None, f"HTTP {r.status_code}"
    return r.json().get("items",[]), None

def fit(xs, ys):
    n=len(xs)
    if n<4: return None,None
    mx=sum(xs)/n; my=sum(ys)/n
    sxx=sum((x-mx)**2 for x in xs); sxy=sum((x-mx)*(y-my) for x,y in zip(xs,ys))
    if sxx==0: return None,None
    b=sxy/sxx; a=my-b*mx
    ss_tot=sum((y-my)**2 for y in ys); ss_res=sum((y-(a+b*x))**2 for x,y in zip(xs,ys))
    r2 = 1-ss_res/ss_tot if ss_tot>0 else None
    return b, (round(r2,3) if r2 is not None else None)

def analyze(article, edate, klass):
    d0 = dt.date.fromisoformat(edate)
    s=(d0-dt.timedelta(days=90)).strftime("%Y%m%d"); e=(d0+dt.timedelta(days=400)).strftime("%Y%m%d")
    items,err = fetch(article,s,e)
    if err: return {"article":article,"class":klass,"error":err}
    ser={}
    for it in items:
        day=dt.datetime.strptime(it["timestamp"][:8],"%Y%m%d").date()
        ser[(day-d0).days]=it["views"]
    pre=[ser[k] for k in range(-90,-7) if k in ser]
    atype = "subject" if len(pre)>=40 else "event"
    base = st.median(pre) if atype=="subject" else 0.0
    win={k:v for k,v in ser.items() if -3<=k<=25}
    if not win: return {"article":article,"class":klass,"error":"no window"}
    pday=max(win,key=lambda k:win[k]); peak=win[pday]; pex=peak-base
    if pex<=0: return {"article":article,"class":klass,"error":"no lift"}

    def cross(frac):
        prev=pex
        for k in range(pday+1,pday+400):
            if k not in ser: continue
            cur=ser[k]-base
            if cur<=frac*pex:
                # linear interpolate between prev day and this day
                span=(k-pday)
                if prev>cur: return round(span-1+(prev-frac*pex)/(prev-cur),2)
                return float(span)
            prev=cur
        return None

    xs=[];ly=[];lx=[]
    for t in range(1,31):
        k=pday+t
        if k in ser:
            v=ser[k]-base
            if v>0: xs.append(t); ly.append(math.log(v)); lx.append(math.log(t))
    bexp,r2exp = fit(xs,ly)
    bpow,r2pow = fit(lx,ly)

    def resid(lo,hi):
        vals=[ser[k] for k in range(pday+lo,pday+hi) if k in ser]
        if not vals or base<=0: return None
        return round((st.median(vals)-base)/base,2)

    return {"article":article,"class":klass,"atype":atype,"event":edate,
      "baseline":int(base),"peak":int(peak),"pk_off":pday,
      "mult": round(peak/base,1) if base>0 else None,
      "t50":cross(.5),"t25":cross(.25),"t10":cross(.10),"t05":cross(.05),
      "exp_r2":r2exp,"pow_r2":r2pow,
      "exp_hl": round(math.log(2)/(-bexp),2) if bexp and bexp<0 else None,
      "pow_a": round(-bpow,2) if bpow else None,
      "res180":resid(150,181),"res365":resid(335,366),
      "series": {str(k):ser[k] for k in range(pday-7,pday+61) if k in ser}}

out=[]
for a,d,k in E:
    r=analyze(a,d,k); out.append(r)
    slim={x:y for x,y in r.items() if x!="series"}
    print(json.dumps(slim,ensure_ascii=False))
    time.sleep(0.25)
with open("results2.json","w",encoding="utf-8") as f: json.dump(out,f,ensure_ascii=False)
