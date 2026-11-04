import json, urllib.request, urllib.parse, re, html, concurrent.futures
from pathlib import Path

def clean(s):
    s=re.sub(r'<sup\b.*?</sup>', '', s, flags=re.S)
    return html.unescape(re.sub('<[^>]+>', '', s)).strip()
def run(p):
    a=json.loads(p.read_text(encoding='utf-8'))
    url='https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode(dict(action='parse',oldid=a['revision'],prop='text',format='json',formatversion=2))
    req=urllib.request.Request(url,headers={'User-Agent':'StateAtlas/1.0 (https://github.com/PRABHMANNAT/united-states-territories-mapper-geoatlas)'})
    with urllib.request.urlopen(req,timeout=60) as r: data=json.load(r)
    text=data['parse']['text']
    blocks=re.split(r'<h[2-4]\b[^>]*>',text)
    summaries=[]
    for b in blocks[1:]:
        name=clean(re.split(r'</h[2-4]>',b)[0]).replace('[edit]','').strip()
        paras=[clean(x) for x in re.findall(r'<p\b[^>]*>(.*?)</p>', b, re.S)]
        paras=[x for x in paras if len(x)>100][:2]
        if paras: summaries.append({'name':name,'text':'\n\n'.join(paras)})
    a['summaries']=summaries
    p.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return a['id'],len(summaries)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for result in pool.map(run,Path('data/encyclopedia').glob('*.json')): print(result,flush=True)
