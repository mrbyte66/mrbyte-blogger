#!/usr/bin/env python3
"""Explicit offline conversion of frontend v2 content; never reads browser storage or seeds DB.
The resulting ZIP still requires owner upload, dry-run validation, reauthentication and commit.
Images require an explicit src -> local sanitized PNG mapping; no network downloads occur.
"""
import argparse
import copy
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import unicodedata
import uuid
import zipfile

NAMESPACE = uuid.UUID('ee9d97ef-d4a3-4715-8923-3b36bf6fc1db')
def identifier(kind, value):
    return str(uuid.uuid5(NAMESPACE, kind + ':' + value))
def slugify(value):
    value = value.translate(str.maketrans({'ı':'i','İ':'I'}))
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', value).strip('-')
def instant(value):
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
def convert(content, theme, media_paths=None, include_demo=False):
    if content.get('version') != 2 or not isinstance(content.get('articles'), list) or not isinstance(content.get('series'), list):
        raise ValueError('Expected explicit frontend content v2 export')
    source = [a for a in content['articles'] if include_demo or a.get('authored') is True]
    if len(source) > 1000 or len(content['series']) > 200:
        raise ValueError('Content exceeds archive limits')
    slugs = [a['slug'] for a in source]
    if len(set(slugs)) != len(slugs) or any(not re.fullmatch('[a-z0-9]+(-[a-z0-9]+)*', s) for s in slugs):
        raise ValueError('Invalid or duplicate article slug')
    names = dict.fromkeys(n for a in source for n in (a.get('categories') or [a['category']]))
    categories = [{'id':identifier('category', n),'name':n,'slug':slugify(n)} for n in names]
    if any(not c['slug'] for c in categories) or len({c['slug'] for c in categories}) != len(categories):
        raise ValueError('Category slug collision requires an explicit source rename')
    files, media, articles, series = {}, {}, [], []
    def cover(src):
        if not src:
            return {'mode':'none','assetId':None}
        if src not in (media_paths or {}):
            raise ValueError('Image needs an explicit local PNG mapping: ' + src)
        path = Path(media_paths[src])
        if path.is_symlink() or not path.is_file() or path.stat().st_size > 20*1024*1024:
            raise ValueError('Invalid local image')
        data = path.read_bytes()
        if not data.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError('Legacy images must be prepared as PNG; SVG is not accepted')
        asset = identifier('media', src)
        location = 'media/' + asset + '.png'
        files[location] = data
        media[asset] = {'id':asset,'path':location,'sha256':hashlib.sha256(data).hexdigest(),'attribution':None}
        return {'mode':'manual','assetId':asset}
    for a in source:
        if not a.get('createdAt'):
            raise ValueError('createdAt must be explicitly supplied: ' + a['slug'])
        blocks = []
        def block(kind, **fields):
            blocks.append({'id':identifier('block',a['slug']+':'+str(len(blocks))),'type':kind,**fields})
        for text in a['paragraphs']:
            block('paragraph',text=text)
        if 'code' in a:
            block('code',text=a['code'],language='plain',caption='')
        if a.get('figure'):
            f=a['figure']; block('image',assetId=cover(f['src'])['assetId'],alt=f['alt'],caption=f['caption'])
        if a.get('table'):
            block('table',**a['table'])
        articles.append({'id':identifier('article',a['slug']),'createdAt':instant(a['createdAt']), 'input':{
            'title':a['title'],'slug':a['slug'],'eyebrow':a['eyebrow'],'abstract':a['excerpt'],
            'displayDate':(a.get('publishedAt') or a['createdAt'])[:10],
            'categoryIds':[identifier('category',n) for n in (a.get('categories') or [a['category']])],
            'document':{'schemaVersion':1,'blocks':blocks},
            'presentation':a.get('presentation') or {'width':'comfortable','heading':'left','showMeta':True},
            'seo':a.get('seo') or {'title':None,'description':None,'indexable':True},
            'cover':cover(a.get('serverCover')),'visibility':a.get('visibility','public'),
            'seriesPlacement':None,'seriesVersions':[]}})
    for s in content['series']:
        chapters = [slug for slug in s['articleSlugs'] if slug in slugs]
        if not chapters:
            continue
        series.append({'id':identifier('series',s['slug']), 'input':{
            'title':s['title'],'slug':s['slug'],'summary':s['summary'],'ongoing':s['ongoing'],
            'chapterIds':[identifier('article',slug) for slug in chapters],'articleVersions':[],
            'cover':cover(s.get('coverImage')),
            'presentation':s.get('presentation') or {'heading':'left','chapterStyle':'cards'},
            'seo':s.get('seo') or {'title':None,'description':None,'indexable':True}}})
    theme = copy.deepcopy(theme)
    theme['schemaVersion']=1
    series_slugs = {s['input']['slug'] for s in series}
    for b in theme['blocks']:
        if b['kind']=='scene':
            a=b.pop('featuredArticleSlug',''); s=b.pop('featuredSeriesSlug','')
            b['featuredArticleId']=identifier('article',a) if a in slugs else None
            b['featuredSeriesId']=identifier('series',s) if s in series_slugs else None
        if b['kind']=='articles':
            category=b.pop('category','Tümü')
            if category!='Tümü' and category not in names:
                raise ValueError('Theme category absent from selected content: '+category)
            b['categoryId']=None if category=='Tümü' else identifier('category',category)
    return {'schemaVersion':1,'exportedAt':dt.datetime.now(dt.timezone.utc).isoformat(),
            'categories':categories,'articles':articles,'series':series,'theme':theme,'media':list(media.values())},files

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--content',type=Path,required=True)
    parser.add_argument('--theme',type=Path,required=True,help='Frontend workspace v1 JSON; uses draft')
    parser.add_argument('--media-map',type=Path,help='Explicit JSON object mapping image src to local PNG')
    parser.add_argument('--include-demo',action='store_true',help='Explicitly include unauthored demo articles')
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    for p in [args.content,args.theme,args.media_map]:
        if p and p.stat().st_size>16*1024*1024:
            parser.error('Input JSON exceeds 16 MiB')
    workspace=json.loads(args.theme.read_text())
    if workspace.get('version')!=1 or 'draft' not in workspace:
        parser.error('Expected frontend workspace v1 JSON')
    try:
        manifest,files=convert(json.loads(args.content.read_text()),workspace['draft'],json.loads(args.media_map.read_text()) if args.media_map else None,args.include_demo)
        if sum(map(len,files.values()))>180*1024*1024:
            raise ValueError('Media exceeds expanded archive limits')
        with args.output.open('xb') as output, zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('manifest.json',json.dumps(manifest,ensure_ascii=False))
            for path,data in files.items():
                archive.writestr(path,data)
        print('Converted',len(manifest['articles']),'articles and',len(manifest['series']),'series. Upload for validation; nothing was published.')
    except (ValueError,KeyError,TypeError) as error:
        parser.error(str(error))
if __name__=='__main__':
    main()
