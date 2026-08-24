import json, io, os, statistics as st
R = "C:/Users/dusti/Projects/Attention_Half_Life"
cen = json.load(io.open(R + '/data/census/top-days.json', encoding='utf-8'))
fnd = json.load(io.open(R + '/data/census/findings.json', encoding='utf-8'))
ren = json.load(io.open(R + '/data/census/renamed.json', encoding='utf-8'))

FROM, TO = -14, 60
ev = []
for r in cen['rows']:
    se = {int(k): v for k, v in r['series'].items()}
    yr = [se[k] for k in range(350, 381) if k in se]
    now = round(st.median(yr)) if len(yr) >= 20 else None
    back = next((d for d in range(1, 400) if d in se and r['base'] and se[d] <= r['base'] * 1.5), None)
    half = next((d for d in range(1, 400) if d in se and se[d] <= r['peak'] * 0.5), None)
    renamed = r['article'] in ren
    usable = (not renamed) and r['base'] >= 20 and now is not None
    ev.append({
        'a': r['article'].replace('_', ' '),
        'p': r['peak'], 'd': r['date'], 'b': r['base'],
        'n': now, 'h': half, 'k': back, 'x': 1 if renamed else 0,
        'u': 1 if usable else 0,
        'r': round(now / r['base'], 4) if (usable and r['base']) else None,
        'c': [se.get(k, 0) for k in range(FROM, TO + 1)],
    })
out = {
    'from': FROM, 'to': TO,
    'window': cen['meta']['window'], 'seen': cen['meta']['articles_seen'],
    'qualify': cen['meta']['qualify'],
    'f': {k: fnd[k] for k in ('n', 'renamed', 'half', 'tenth', 'normal', 'share', 'persistence', 'trend')},
    'ev': ev,
}
# the scatter reads straight off the events, so the duplicate point list is dropped
out['f']['persistence'].pop('points', None)
io.open('story.js', 'w', encoding='utf-8', newline='\n').write('const D=' + json.dumps(out, separators=(',', ':')) + ';\n')
print('story.js', round(os.path.getsize('story.js') / 1e3), 'KB |', len(ev), 'events |', sum(e['u'] for e in ev), 'usable')
