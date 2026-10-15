import json,glob,re,collections,os
MAP={'GOALKEEPER':('GK','GK'),'GOALIE':('GK','GK'),'KEEPER':('GK','GK'),
'DEFENDER':('DEF','DEF'),'CENTREBACK':('DEF','CB'),'CENTERBACK':('DEF','CB'),'FULLBACK':('DEF','FB'),'LEFTBACK':('DEF','LB'),'RIGHTBACK':('DEF','RB'),'WINGBACK':('DEF','WB'),'SWEEPER':('DEF','SW'),
'MIDFIELDER':('MID','MID'),'MIDFIELD':('MID','MID'),'PLAYMAKER':('MID','AM'),
'FORWARD':('FWD','FW'),'STRIKER':('FWD','ST'),'WINGER':('FWD','W'),'ATTACKER':('FWD','FW'),'CENTREFORWARD':('FWD','CF'),
'COACH':('COACH','COACH'),'MANAGER':('COACH','COACH'),'HEADCOACH':('COACH','COACH')}
lst={str(x['id']):x for x in json.load(open('list.json'))}
import difflib
KEYS=list(MAP)
def match(w):
  if w in MAP: return w,1.0
  if len(w)<7: return None,0
  m=difflib.get_close_matches(w,KEYS,1,0.85)
  return (m[0],difflib.SequenceMatcher(None,w,m[0]).ratio()) if m else (None,0)
res={}
for f in sorted(glob.glob('tsv/*.tsv'))+sorted(glob.glob('tsv2/*.tsv')):
  id=os.path.basename(f)[:-4]; hits=[]
  for ln in open(f).read().splitlines()[1:]:
    c=ln.split('\t')
    if len(c)<12: continue
    w=re.sub('[^A-Z]','',c[11].upper()); conf=float(c[10])
    k,rt=match(w)
    if k and conf>0: hits.append((MAP[k],conf*rt,w))
  if hits and id not in res:
    best=max(hits,key=lambda h:h[1]); res[id]={'pos':best[0][0],'sub':best[0][1],'conf':best[1],'word':best[2],'all':sorted({h[0][0] for h in hits})}
json.dump(res,open('ocr.json','w'))
c=collections.Counter(); dis=[]
for id,x in lst.items():
  if not os.path.exists(f'img/{id}.jpg'): continue
  r=res.get(id)
  if not r: c['noocr_'+str(x['pos'])]+=1; continue
  c['ocr']+=1
  if len(r['all'])>1: c['multi']+=1
  if r['pos']!=x['pos']: dis.append((id,x['pos'],r['pos'],r['word'],round(r['conf']),r['all'],x['title'][-25:]))
print(c); print(len(dis))
for d in dis: print(d)
