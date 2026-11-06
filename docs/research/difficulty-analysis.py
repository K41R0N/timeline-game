"""Difficulty analysis over the committed roster: par, options per step and years per step.

Reproduces the numbers in docs/research/2026-11-06-difficulty-balancing.md:

    python3 docs/research/difficulty-analysis.py

Reads src/lib/data/roster.json. The target pools the game used before #52 are kept below as
research data, so the comparison with year-gap difficulty stays reproducible.
Offline and deterministic (fixed random seed). Takes a few minutes.
"""
import json, random, statistics, sys, collections
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ROSTER = REPO / 'src/lib/data/roster.json'
people = [dict(id=r[0], name=r[1], b=r[2], d=r[3], approx=r[4]) for r in json.load(open(ROSTER))['people']]
by_name = {p['name']: p for p in people}

def overlaps(x, lo, hi):
    return x['b'] <= hi and lo <= x['d']

def layers_from(start, excluded):
    """Distance (in hops) from `start` for every roster person, via the interval-graph span trick."""
    dist = {}
    lo, hi = start['b'], start['d']
    k = 1
    while True:
        new = [p for p in people if p['id'] not in dist and p['id'] not in excluded and overlaps(p, lo, hi)]
        if not new:
            return dist
        for p in new:
            dist[p['id']] = k
        lo = min([lo] + [p['b'] for p in new]); hi = max([hi] + [p['d'] for p in new])
        k += 1

def analyse(a, b):
    a, b = sorted([a, b], key=lambda x: x['b'])
    if a['d'] >= b['b']:
        return None
    ex = {a['id'], b['id']}
    da, db = layers_from(a, ex), layers_from(b, ex)
    if not da or not db:
        return None
    # par + 1 hops from A to B: smallest da[v] + db[v] over v, minus 1 node overlap
    best = min((da[v] + db[v] for v in da if v in db), default=None)
    if best is None:
        return None
    par = best - 1
    width = collections.Counter(da[v] for v in da if v in db and da[v] + db[v] == best)
    return dict(par=par, gap=b['b'] - a['d'], mid=(a['d'] + b['b']) / 2, widths=[width[k] for k in range(1, par + 1)])

random.seed(7)
famous = people  # every roster person is "well-known"
samples = []
for _ in range(2500):
    a, b = random.sample(famous, 2)
    r = analyse(a, b)
    if r:
        samples.append(r)

print('== Par by year gap (all eras) ==')
bands = [(0, 50), (50, 100), (100, 200), (200, 300), (300, 500), (500, 800), (800, 1200), (1200, 2000), (2000, 5000)]
for lo, hi in bands:
    s = [x for x in samples if lo <= x['gap'] < hi]
    if s:
        pars = [x['par'] for x in s]
        print(f'gap {lo:>4}-{hi:<4} n={len(s):>4}  par median {statistics.median(pars):>4}  p10 {sorted(pars)[len(pars)//10]:>3}  p90 {sorted(pars)[9*len(pars)//10]:>3}  years/hop {statistics.median([x["gap"]/x["par"] for x in s]):.0f}')

print('\n== Years per hop by era of the gap (gaps 100-400 years) ==')
eras = [(-800, -200, 'ancient (800-200 BCE)'), (-200, 300, 'classical (200 BCE-300 CE)'), (300, 1000, 'early medieval (300-1000)'),
        (1000, 1400, 'high medieval (1000-1400)'), (1400, 1700, 'renaissance (1400-1700)'), (1700, 1950, 'modern (1700-1950)')]
for lo, hi, label in eras:
    s = [x for x in samples if lo <= x['mid'] < hi and 100 <= x['gap'] < 400]
    if s:
        print(f'{label:<28} n={len(s):>3}  years/hop median {statistics.median([x["gap"]/x["par"] for x in s]):.0f}  narrowest hop median {statistics.median([min(x["widths"]) for x in s])}')

print('\n== Roster density (people alive per year, by century) ==')
for c in range(-800, 2000, 200):
    alive = statistics.mean(sum(1 for p in people if p['b'] <= y <= p['d']) for y in range(c, c + 200, 10))
    print(f'{c:>5}..{c+199:<5} {alive:6.1f} alive on average')

print('\n== Current target pools: par per difficulty ==')
# Target pools from TargetSelectionService.ts before #52 (commit e73a18e): ancient, medieval, renaissance, modern.
pools = [
    ['Alexander the Great', 'Julius Caesar', 'Cleopatra', 'Aristotle', 'Plato', 'Socrates', 'Augustus', 'Hannibal',
     'Confucius', 'Ramesses II', 'Hammurabi', 'Pericles', 'Archimedes', 'Herodotus', 'Marcus Aurelius'],
    ['Charlemagne', 'Genghis Khan', 'Saladin', 'William the Conqueror', 'Richard the Lionheart', 'Joan of Arc',
     'Marco Polo', 'Dante Alighieri', 'Thomas Aquinas', 'Kublai Khan', 'Eleanor of Aquitaine', 'Frederick Barbarossa',
     'Akbar the Great', 'Suleiman the Magnificent'],
    ['Leonardo da Vinci', 'Michelangelo', 'William Shakespeare', 'Christopher Columbus', 'Martin Luther',
     'Galileo Galilei', 'Johannes Gutenberg', 'Elizabeth I', 'Isaac Newton', 'René Descartes', 'Nicolaus Copernicus',
     'Raphael', 'Erasmus', 'Machiavelli'],
    ['Napoleon Bonaparte', 'George Washington', 'Abraham Lincoln', 'Queen Victoria', 'Charles Darwin', 'Karl Marx',
     'Thomas Edison', 'Vincent van Gogh', 'Marie Curie', 'Albert Einstein', 'Winston Churchill', 'Mahatma Gandhi',
     'Franklin D. Roosevelt', 'Pablo Picasso', 'Nelson Mandela'],
]
eras4 = pools
def pool_pairs(i, j):
    out = []
    for x in eras4[i]:
        for y in eras4[j]:
            if x in by_name and y in by_name:
                r = analyse(by_name[x], by_name[y])
                out.append((x, y, r['par'] if r else None, abs(by_name[x]['b'] - by_name[y]['b'])))
    return out
for label, combos, gap_ok in [('easy', [(0, 1), (1, 2), (2, 3)], lambda g: 200 <= g <= 700),
                              ('medium', [(0, 2), (1, 3)], lambda g: 600 <= g <= 1400),
                              ('hard', [(0, 3)], lambda g: g >= 1200)]:
    pars = [p for i, j in combos for (_, _, p, g) in pool_pairs(i, j) if p is not None and gap_ok(g)]
    missing = sum(1 for i, j in combos for (_, _, p, g) in pool_pairs(i, j) if p is None and gap_ok(g))
    if pars:
        print(f'{label:<7} pairs {len(pars):>3}  par min {min(pars)}  median {statistics.median(pars)}  max {max(pars)}  unplayable {missing}')
print('pool names missing from roster:', [n for era in pools for n in era if n not in by_name])

print('\n== Example pairs: par and options per step ==')
shown = 0
for a, b in [('Joan of Arc', 'Galileo Galilei'), ('Isaac Newton', 'Abraham Lincoln'), ('Dante Alighieri', 'Leonardo da Vinci'),
             ('Julius Caesar', 'Marcus Aurelius'), ('Charlemagne', 'William the Conqueror'), ('Napoleon', 'Pablo Picasso'),
             ('Confucius', 'Alexander the Great'), ('Saladin', 'Marco Polo'), ('Elizabeth I', 'George Washington')]:
    if a in by_name and b in by_name:
        r = analyse(by_name[a], by_name[b])
        print(f'{a} -> {b}: gap {r["gap"] if r else "-"} years, par {r["par"] if r else "overlap/none"}, options per hop {r["widths"] if r else "-"}')
