import json, urllib.request, urllib.parse, html, re, concurrent.futures
from pathlib import Path
def query(args,host='en.wikipedia.org'):
    u='https://'+host+'/w/api.php?'+urllib.parse.urlencode(dict(format='json',formatversion=2,**args))
    with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'StateAtlas/1.0 (https://github.com/PRABHMANNAT/united-states-territories-mapper-geoatlas)'}),timeout=45) as r: return json.load(r)
def clean(s):return html.unescape(re.sub('<[^>]+>','',s)).strip()
def run(p):
    a=json.loads(p.read_text(encoding='utf-8'))
    try:
        page=query(dict(action='query',titles=a['title'],prop='pageimages',piprop='name|thumbnail',pithumbsize=900,pilicense='free'))['query']['pages'][0]
        if not page.get('pageimage'): return
        info=query(dict(action='query',titles='File:'+page['pageimage'],prop='imageinfo',iiprop='extmetadata|url'), 'commons.wikimedia.org')['query']['pages'][0].get('imageinfo',[{}])[0]
        m=info.get('extmetadata',{})
        license=clean(m.get('LicenseShortName',{}).get('value',''))
        if not license or not page.get('thumbnail'): return
        a['image']={'url':page['thumbnail']['source'],'width':page['thumbnail']['width'],'height':page['thumbnail']['height'],'title':page['pageimage'].replace('_',' '),'source':info['descriptionurl'],'author':clean(m.get('Artist',{}).get('value','Wikimedia Commons')),'license':license,'licenseUrl':m.get('LicenseUrl',{}).get('value','')}
        p.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(a['id'],license,flush=True)
    except Exception as e: print(a['id'],str(e),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(run,Path('data/encyclopedia').glob('*.json')))
