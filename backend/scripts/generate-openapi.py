import json
from pathlib import Path
S={}
def string(maximum=None, **kw):
 d={'type':'string',**kw}
 if maximum:d['maxLength']=maximum
 return d
def ref(name):return {'$ref':'#/components/schemas/'+name}
def obj(props,required=None):return {'type':'object','additionalProperties':False,'properties':props,'required':required or list(props)}
uid=string(format='uuid'); instant=string(format='date-time'); integer={'type':'integer','minimum':0}; nullable=lambda schema:{'anyOf':[schema,{'type':'null'}]}
S['Problem']=obj({'type':string(),'title':string(),'status':integer,'code':string(),'detail':string(),'requestId':string(),'errors':{'type':'array','items':{'type':'object'}}})
S['Preferences']=obj({'publicationEmail':{'type':'boolean'},'timeZone':string(80)})
S['Profile']=obj({'id':uid,'name':string(80),'email':string(254,format='email'),'verified':{'type':'boolean'},'avatar':string(60),'role':{'type':'string','enum':['member','owner']},'preferences':ref('Preferences'),'version':integer})
S['Session']={'oneOf':[obj({'authenticated':{'const':False}}),obj({'authenticated':{'const':True},'profile':ref('Profile'),'expiresAt':instant})]}
S['Login']=obj({'identifier':string(254,minLength=1),'password':string(128,minLength=1,writeOnly=True)})
S['Registration']=obj({'name':string(80,minLength=1),'email':string(254,format='email'),'password':string(128,minLength=12,writeOnly=True),'passwordConfirmation':string(128,minLength=12,writeOnly=True)})
S['EmailInput']=obj({'email':string(254,format='email')})
S['TokenInput']=obj({'token':string(512,minLength=1,writeOnly=True)})
S['ResetInput']=obj({**S['TokenInput']['properties'],'password':string(128,minLength=12,writeOnly=True),'passwordConfirmation':string(128,minLength=12,writeOnly=True)})
S['ProfilePatch']=obj({'name':string(80,minLength=1),'avatar':string(60)},[]);S['ProfilePatch']['required']=[]
S['PreferencePatch']=obj(S['Preferences']['properties'],[]);S['PreferencePatch']['required']=[]
S['Csrf']=obj({'token':string(),'headerName':{'const':'X-CSRF-TOKEN'}})
S['Accepted']=obj({'message':string()})
S['SessionItem']=obj({'id':uid,'current':{'type':'boolean'},'deviceLabel':string(),'createdAt':instant,'lastSeenAt':instant,'expiresAt':instant})
S['Sessions']=obj({'items':{'type':'array','items':ref('SessionItem')}})
S['Category']=obj({'id':uid,'slug':string(100),'name':string(80),'version':integer})
S['Categories']=obj({'items':{'type':'array','items':ref('Category')}})
S['CategoryCreate']=obj({'name':string(80,minLength=1),'slug':string(100,pattern='^[a-z0-9]+(-[a-z0-9]+)*$')})
S['CategoryPatch']=obj(S['CategoryCreate']['properties'],[]);S['CategoryPatch']['required']=[]
S['Presentation']=obj({'width':{'enum':['comfortable','wide']},'heading':{'enum':['left','center']},'showMeta':{'type':'boolean'}})
S['Seo']=obj({'title':nullable(string(200)),'description':nullable(string(400)),'indexable':{'type':'boolean'}})
S['CoverChoice']=obj({'mode':{'enum':['auto','manual','none']},'assetId':nullable(uid)})
blockprops={
 'paragraph':{'text':string(20000)},
 'heading':{'text':string(300,minLength=1),'level':{'enum':[2,3]}},
 'quote':{'text':string(4000,minLength=1),'attribution':string(200)},
 'code':{'text':string(50000),'language':{'enum':['plain','java','javascript','typescript','python','sql','bash','css','html','json','yaml','xml']},'caption':string(300)},
 'image':{'assetId':uid,'alt':string(500),'caption':string(1000)},
 'table':{'caption':string(300),'columns':{'type':'array','minItems':1,'maxItems':20,'items':string(200)},'rows':{'type':'array','maxItems':200,'items':{'type':'array','items':string(2000)}}}
}
for kind,props in blockprops.items():S[kind.capitalize()+'Block']=obj({'id':uid,'type':{'const':kind},**props})
S['Document']=obj({'schemaVersion':{'const':1},'blocks':{'type':'array','maxItems':500,'items':{'oneOf':[ref(k.capitalize()+'Block') for k in blockprops],'discriminator':{'propertyName':'type','mapping':{k:'#/components/schemas/'+k.capitalize()+'Block' for k in blockprops}}}}})
article={
 'title':string(200),'slug':string(100,pattern='^[a-z0-9]+(-[a-z0-9]+)*$'),'eyebrow':string(160),'abstract':string(4000),'displayDate':string(format='date'),
 'categoryIds':{'type':'array','maxItems':10,'uniqueItems':True,'items':uid},'document':ref('Document'),'presentation':ref('Presentation'),'seo':ref('Seo'),'cover':ref('CoverChoice'),
 'seriesPlacement':nullable(obj({'seriesId':uid})),'seriesVersions':{'type':'array','items':obj({'id':uid,'version':integer})}
}
S['ArticleWrite']=obj(article)
S['ArticleCreate']=obj({**article,'visibility':{'enum':['public','private']}},[k for k in article if k not in ['slug','displayDate','seriesPlacement']])
S['ArticleEdit']=obj({**article,'id':uid,'version':integer,'createdAt':instant,'updatedAt':instant,'status':{'enum':['draft','scheduled','published','archived','trashed']},'visibility':{'enum':['public','private']},'scheduledAt':nullable(instant),'scheduleZone':nullable(string(80)),'firstPublishedAt':nullable(instant),'lastPublishedAt':nullable(instant),'revisionId':uid})
S['Stats']=obj({'views':integer,'claps':integer,'saves':integer})
S['ArticleSummary']=obj({'id':uid,'slug':string(),'url':string(),'title':string(),'eyebrow':string(),'abstract':string(),'bodyPreview':string(2000),'categories':{'type':'array','items':ref('Category')},'displayDate':string(format='date'),'readingMinutes':{'type':'integer','minimum':1},'cover':{'type':'null'},'stats':ref('Stats')})
S['ArticleDetail']=obj({**S['ArticleSummary']['properties'],'revisionId':uid,'document':ref('Document'),'presentation':ref('Presentation'),'seo':ref('Seo'),'firstPublishedAt':instant,'publicModifiedAt':instant,'series':{'type':'null'}})
S['SlugRedirect']=obj({'resolution':{'const':'redirect'},'canonicalPath':string(pattern='^/yazilar/[a-z0-9-]+$')})
S['ArticleResolution']={'oneOf':[ref('ArticleDetail'),ref('SlugRedirect')]}
for key,item in [('PublicArticles','ArticleSummary'),('EditableArticles','ArticleEdit')]:S[key]=obj({'items':{'type':'array','items':ref(item)},'page':integer,'size':integer,'totalElements':integer,'totalPages':integer,'sort':{'enum':['date_desc','date_asc']}})
S['Action']=obj({'action':{'enum':['save-draft','publish','schedule','cancel-schedule','archive','trash','restore','make-private','prepare-public']},'scheduledAt':instant,'timeZone':string(80),'publishSeries':{'type':'boolean'},'seriesVersion':integer},['action'])
P={}
errorcodes=[400,401,403,404,409,412,413,422,428,429,503]
def operation(path,verb,opid,access,response=None,body=None,status=200,version=False,key=False,paging=False):
 params=[]
 for name in __import__('re').findall(r'\{([^}]+)\}',path):params.append({'in':'path','name':name,'required':True,'schema':string(100) if name=='slug' else uid})

 if version:params.append({'in':'header','name':'If-Match','required':True,'schema':string(pattern='^"[0-9]+"$')})
 if key:params.append({'in':'header','name':'Idempotency-Key','required':True,'schema':uid})
 if paging:params.extend([{'in':'query','name':'page','schema':{'type':'integer','minimum':0,'maximum':1000,'default':0}},{'in':'query','name':'size','schema':{'type':'integer','minimum':1,'maximum':50,'default':20}},{'in':'query','name':'sort','schema':{'enum':['date_desc','date_asc'],'default':'date_desc'}}])
 security=[]
 scheme={}
 if access in ['member','owner']:scheme['session']=[]
 if verb not in ['get','head']:scheme['csrf']=[]
 if scheme:security=[scheme]
 success={'description':'Successful operation'}
 if response:success['content']={'application/json':{'schema':ref(response)}}
 d={'operationId':opid,'summary':opid,'description':'Access: '+access+'. This specification covers the implemented checkpoint only. See docs/backend-implementation.md for release gates.','security':security,'responses':{str(status):success,**{str(c):{'description':'Rejected or unavailable operation','content':{'application/problem+json':{'schema':ref('Problem')}}} for c in errorcodes}}}
 if params:d['parameters']=params
 if body:d['requestBody']={'required':True,'content':{'application/json':{'schema':ref(body)}}}
 P.setdefault('/api/v1'+path,{})[verb]=d
for path,opid,response in [('/auth/csrf','getCsrf','Csrf'),('/auth/session','getSession','Session')]:operation(path,'get',opid,'public',response)
operation('/auth/login','post','login','public','Profile','Login')
operation('/auth/register','post','register','public','Accepted','Registration',202)
for path,opid in [('/auth/verification/resend','resendVerification'),('/auth/password/forgot','requestPasswordReset')]:operation(path,'post',opid,'public','Accepted','EmailInput',202)
operation('/auth/verification/confirm','post','verifyEmail','public',None,'TokenInput',204)
operation('/auth/password/reset','post','resetPassword','public',None,'ResetInput',204)
operation('/auth/logout','post','logout','public',status=204)
operation('/auth/session/renew','post','renewSession','member','Session')
S['ReauthPassword']=obj({'password':string(128,minLength=1,writeOnly=True)});S['ReauthResult']=obj({'validUntil':instant})
operation('/auth/reauthenticate','post','reauthenticate','member','ReauthResult','ReauthPassword')
operation('/me','get','getProfile','member','Profile');operation('/me','patch','updateProfile','member','Profile','ProfilePatch',version=True)
operation('/me/preferences','patch','updatePreferences','member','Profile','PreferencePatch',version=True)
operation('/me/sessions','get','getSessions','member','Sessions');operation('/me/sessions/{id}','delete','deleteSession','member',status=204)
operation('/me/sessions/revoke-others','post','revokeOtherSessions','member',status=204)
operation('/articles','get','getPublicArticles','public','PublicArticles',paging=True)
operation('/articles/by-slug/{slug}','get','resolveArticle','public','ArticleResolution')
operation('/studio/articles','get','getEditableArticles','owner','EditableArticles',paging=True)
operation('/studio/articles','post','createArticle','owner','ArticleEdit','ArticleCreate',201,key=True)
operation('/studio/articles/{id}','get','getEditableArticle','owner','ArticleEdit')
operation('/studio/articles/{id}','put','replaceArticle','owner','ArticleEdit','ArticleWrite',version=True)
operation('/studio/articles/{id}','delete','trashArticle','owner',status=204,version=True)
operation('/studio/articles/{id}/actions','post','transitionArticle','owner','ArticleEdit','Action',version=True,key=True)
operation('/categories','get','getPublicCategories','public','Categories');operation('/studio/categories','get','getCategories','owner','Categories')
operation('/studio/categories','post','createCategory','owner','Category','CategoryCreate',201,key=True)
operation('/studio/categories/{id}','patch','updateCategory','owner','Category','CategoryPatch',version=True)
operation('/studio/categories/{id}','delete','deleteCategory','owner',status=204,version=True)
# Explicit DTOs for the remaining implemented modules. No production data is used.
def arr(item,**kw):return {'type':'array','items':item,**kw}
def enum(*values):return {'type':'string','enum':list(values)}
def page(name,item,sort='date_desc'):
 S[name]=obj({'items':arr(ref(item)),'page':integer,'size':integer,'totalElements':integer,'totalPages':integer,'sort':string()})
def query(path,verb,name,schema):
 P['/api/v1'+path][verb].setdefault('parameters',[]).append({'in':'query','name':name,'schema':schema})
S['Profile']['properties']['avatar']=nullable(string(60))
S['Problem']['properties']['errors']=arr(obj({'field':string(),'code':string()}))
S['Attribution']=obj({'provider':{'const':'pexels'},'providerId':string(),'sourceUrl':string(format='uri'),'photographer':string(),'licenseUrl':string(format='uri'),'fetchedAt':instant})
S['MediaPublic']=obj({'id':uid,'url':string(),'mime':{'const':'image/png'},'width':integer,'height':integer,'attribution':nullable(ref('Attribution'))})
S['Link']=obj({'id':uid,'slug':string(),'title':string(),'url':string()})
S['SeriesNavigation']=obj({'id':uid,'slug':string(),'title':string(),'position':integer,'total':integer,'previous':nullable(ref('Link')),'next':nullable(ref('Link'))})
S['PublicCategory']=obj({'id':uid,'slug':string(100),'name':string(80)})
S['ArticleSummary']['properties']['categories']=arr(ref('PublicCategory'))
S['ArticleDetail']['properties']['categories']=arr(ref('PublicCategory'))
S['ArticleSummary']['properties']['cover']=nullable(ref('MediaPublic'))
S['ArticleDetail']['properties']['cover']=nullable(ref('MediaPublic'))
S['ArticleDetail']['properties']['series']=nullable(ref('SeriesNavigation'))
S['SeriesPresentation']=obj({'heading':enum('left','center'),'chapterStyle':enum('cards','rows')})
S['SeriesWrite']=obj({'title':string(160,minLength=1),'slug':string(100),'summary':string(1000),'ongoing':{'type':'boolean'},'cover':ref('CoverChoice'),'presentation':ref('SeriesPresentation'),'seo':ref('Seo'),'chapterIds':arr(uid,maxItems=200,uniqueItems=True),'articleVersions':arr(obj({'id':uid,'version':integer}),maxItems=200)})
S['SeriesEdit']=obj({**S['SeriesWrite']['properties'],'id':uid,'version':integer,'status':enum('draft','published','archived','trashed'),'createdAt':instant,'updatedAt':instant})
S['SeriesSummary']=obj({'id':uid,'slug':string(),'url':string(),'title':string(),'summary':string(),'ongoing':{'type':'boolean'},'cover':nullable(ref('MediaPublic')),'chapterCount':integer,'stats':ref('Stats')})
S['SeriesDetail']=obj({**S['SeriesSummary']['properties'],'presentation':ref('SeriesPresentation'),'seo':ref('Seo'),})
S['SeriesRedirect']=obj({'resolution':{'const':'redirect'},'canonicalPath':string(pattern='^/seriler/[a-z0-9-]+$')})
S['SeriesResolution']={'oneOf':[ref('SeriesDetail'),ref('SeriesRedirect')]}
S['Chapter']=obj({**S['ArticleSummary']['properties'],'chapterNumber':integer})
for name,item in [('PublicSeries','SeriesSummary'),('EditableSeries','SeriesEdit'),('Chapters','Chapter')]:page(name,item)
S['SeriesAction']=obj({'action':enum('publish','save-draft','archive','restore')})
for prefix,access,response in [('/series','public','PublicSeries'),('/studio/series','owner','EditableSeries')]:operation(prefix,'get','list'+response,access,response,paging=True)
operation('/series/by-slug/{slug}','get','resolveSeries','public','SeriesResolution')
operation('/series/{id}/chapters','get','listChapters','public','Chapters',paging=True)
operation('/studio/series','post','createSeries','owner','SeriesEdit','SeriesWrite',201,key=True)
operation('/studio/series/{id}','get','editSeries','owner','SeriesEdit')
operation('/studio/series/{id}','put','replaceSeries','owner','SeriesEdit','SeriesWrite',version=True)
operation('/studio/series/{id}','delete','trashSeries','owner',status=204,version=True)
operation('/studio/series/{id}/actions','post','transitionSeries','owner','SeriesEdit','SeriesAction',version=True,key=True)
S['Collection']=obj({'id':uid,'name':string(60),'isDefault':{'type':'boolean'},'count':integer,'version':integer})
S['Collections']=obj({'items':arr(ref('Collection'))})
S['CollectionName']=obj({'name':string(60,minLength=1)})
S['BookmarkWrite']=obj({'collectionId':nullable(uid)},['collectionId']);S['BookmarkWrite']['required']=[]
S['Saved']=obj({'articleId':uid,'collectionId':uid,'savedAt':instant,'version':integer})
S['Bookmark']=obj({**S['Saved']['properties'],'available':{'type':'boolean'},'article':nullable(ref('ArticleSummary'))})
page('Bookmarks','Bookmark')
S['ArticleStateItem']={'oneOf':[obj({'articleId':uid,'available':{'const':False}}),obj({'articleId':uid,'available':{'const':True},'bookmark':nullable(ref('Saved')),'lastVisitedAt':nullable(instant)})]}
S['ArticleStates']=obj({'items':arr(ref('ArticleStateItem'),maxItems=50)})
operation('/me/collections','get','listCollections','member','Collections')
operation('/me/collections','post','createCollection','member','Collection','CollectionName',201,key=True)
operation('/me/collections/{id}','patch','renameCollection','member','Collection','CollectionName',version=True)
operation('/me/collections/{id}','delete','removeCollection','member',status=204,version=True)
operation('/me/bookmarks','get','listBookmarks','member','Bookmarks',paging=True)
for key,schema in [('collectionId',uid),('q',string(100))]:query('/me/bookmarks','get',key,schema)
operation('/me/bookmarks/{articleId}','put','saveBookmark','member','Saved','BookmarkWrite')
operation('/me/bookmarks/{articleId}','delete','removeBookmark','member',status=204)
operation('/me/article-state','get','readArticleStates','member','ArticleStates');query('/me/article-state','get','ids',arr(uid,maxItems=50,uniqueItems=True))
S['Fragment']=obj({'blockId':{'oneOf':[uid,{'const':'abstract'}]},'start':integer,'end':integer,'quote':string(12000),'before':string(48),'after':string(48)})
S['AnnotationWrite']=obj({'kind':enum('highlight','underline','note'),'revisionId':uid,'fragments':arr(ref('Fragment'),minItems=1,maxItems=30),'note':string(4000)})
S['Annotation']=obj({**S['AnnotationWrite']['properties'],'id':uid,'createdAt':instant,'version':integer})
S['Annotations']={'oneOf':[obj({'articleId':uid,'revisionId':uid,'items':arr(ref('Annotation'))}),obj({'articleId':uid,'available':{'const':False},'items':arr(obj({'id':uid,'available':{'const':False}}))})]}
S['AnnotationImport']=obj({'clientImportId':uid,'items':arr(obj({'articleId':uid,'id':uid,'annotation':ref('AnnotationWrite')}),maxItems=200)})
S['ImportMarksResult']=obj({'accepted':arr(uid),'rejected':arr(obj({'id':uid,'code':string()},['code']))})
S['Visit']=obj({'eventId':uid,'articleId':uid,'revisionId':uid,'visitedAt':instant})
S['HistoryItem']=obj({'articleId':uid,'lastVisitedAt':instant,'available':{'type':'boolean'},'article':nullable(ref('ArticleSummary'))})
page('History','HistoryItem')
S['SeriesHistory']=obj({'items':arr(obj({'articleId':uid,'lastVisitedAt':instant}))})
operation('/me/articles/{id}/annotations','get','listAnnotations','member','Annotations')
operation('/me/articles/{id}/annotations/{markId}','put','saveAnnotation','member','Annotation','AnnotationWrite')
op=P['/api/v1/me/articles/{id}/annotations/{markId}']['put'];op['parameters'] += [{'in':'header','name':name,'schema':string()} for name in ['If-Match','If-None-Match']];op['description']+=' Create requires If-None-Match: * (201); update requires If-Match (200).';op['responses']['201']=op['responses']['200']
operation('/me/articles/{id}/annotations/{markId}','delete','removeAnnotation','member',status=204)
operation('/me/imports/annotations','post','importGuestAnnotations','member','ImportMarksResult','AnnotationImport')
operation('/me/visits','post','recordVisit','member',body='Visit',status=204)
operation('/me/history','get','listHistory','member','History',paging=True)
operation('/me/history','delete','clearHistory','member',status=204)
operation('/me/series/{id}/history','get','seriesHistory','member','SeriesHistory')
S['Ready']=obj({'ready':{'const':True}})
S['ClapWrite']=obj({'clapped':{'type':'boolean'}})
S['ClapState']=obj({'clapped':{'type':'boolean'}})
S['ClapResult']=obj({'clapped':{'type':'boolean'},'claps':integer})
S['Impression']=obj({'eventId':uid,'articleId':uid,'source':enum('card','permalink'),'pageViewId':uid,'occurredAt':instant})
S['ImpressionResult']=obj({'accepted':{'const':True},'counted':{'type':'boolean'},'views':integer})
operation('/engagement/session','post','engagementSession','public','Ready')
operation('/articles/{id}/my-clap','get','myClap','public','ClapState')
operation('/articles/{id}/clap','put','setClap','public','ClapResult','ClapWrite')
operation('/articles/{id}/stats','get','articleStats','public','Stats')
operation('/impressions','post','recordImpression','public','ImpressionResult','Impression')
S['GoogleStart']=obj({'returnTo':enum('/','/hesap','/kaydedilenler'),'purpose':enum('login','reauth')},['returnTo'])
S['GoogleLink']=obj({'returnTo':enum('/','/hesap','/kaydedilenler')})
S['AuthorizationUrl']=obj({'authorizationUrl':string()})
S['Providers']=obj({'google':{'type':'boolean'}})
S['Connections']=obj({'items':arr(obj({'provider':{'const':'google'},'connectedAt':instant}))})
operation('/auth/providers','get','availableProviders','public','Providers')
operation('/auth/google/start','post','googleLogin','public','AuthorizationUrl','GoogleStart')
operation('/me/connections/google/start','post','googleLink','member','AuthorizationUrl','GoogleLink')
operation('/me/connections','get','connections','member','Connections')
operation('/me/connections/google','delete','unlinkGoogle','member',status=204)
operation('/auth/google/authorize/google','get','googleAuthorize','public',status=302)
operation('/auth/google/callback','get','googleCallback','public',status=303)
S['PasswordChange']=obj({'password':string(128,minLength=12,writeOnly=True),'passwordConfirmation':string(128,minLength=12,writeOnly=True)})
S['DeleteAccount']=obj({'confirmation':{'const':'DELETE'}})
operation('/me/password','put','changePassword','member',body='PasswordChange',status=204)
operation('/me/email-change','post','requestEmailChange','member','Accepted','EmailInput',202)
operation('/auth/email-change/confirm','post','confirmEmailChange','public',body='TokenInput',status=204)
operation('/me','delete','deleteAccount','member',body='DeleteAccount',status=204)
S['Member']=obj({'id':uid,'name':string(),'email':string(),'status':enum('PENDING','ACTIVE','DELETED'),'createdAt':instant})
page('Members','Member');operation('/studio/members','get','listMembers','owner','Members',paging=True);query('/studio/members','get','q',string(100))
S['OwnerArticleStats']=obj({'articleId':uid,'title':string(),'views':integer,'claps':integer,'saves':integer})
page('OwnerStats','OwnerArticleStats');operation('/studio/article-stats','get','ownerStats','owner','OwnerStats',paging=True)
S['PublicationJob']=obj({'id':uid,'aggregateId':uid,'state':enum('PENDING','PROCESSING','FAILED','SENT','SKIPPED'),'attempts':integer,'createdAt':instant,'errorCode':nullable(string()),'articleTitle':nullable(string())})
page('PublicationJobs','PublicationJob');operation('/studio/publication-jobs','get','publicationJobs','owner','PublicationJobs',paging=True)
for name,schema in [('state',enum('PENDING','PROCESSING','FAILED','SENT','SKIPPED')),('q',string(100))]:query('/studio/publication-jobs','get',name,schema)
S['Identifier']=obj({'id':uid});operation('/studio/publication-jobs/{id}/retry','post','retryPublication','owner','Identifier',key=True)
# Theme blocks have exact kind-specific fields, matching ThemeDocument.validate.
base={'id':string(80),'kind':string()}
blockfields={
 'header':{},'intro':{'title':string(160),'description':string(2000),'eyebrow':string(120),'layout':enum('statement','centered','split')},
 'scene':{'title':string(160),'emphasis':string(160),'description':string(2000),'featuredArticleId':nullable(uid),'showFeaturedArticle':{'type':'boolean'},'featuredSeriesId':nullable(uid),'showFeaturedSeries':{'type':'boolean'}},
 'articles':{'title':string(160),'categoryId':nullable(uid),'display':enum('rows','cards'),'loading':enum('all','progressive')},
 'series':{'title':string(160),'display':enum('cards','list')},'quote':{'text':string(2000),'attribution':string(120),'display':enum('band','card')},'about':{'title':string(160),'text':string(2000)},'projects':{'title':string(160)},'footer':{'text':string(160)}}
for kind,props in blockfields.items():S['Theme'+kind.title()]=obj({**base,'kind':{'const':kind},**props})
S['Theme']=obj({'schemaVersion':{'const':1},'name':string(80),'siteName':string(40),'accent':string(),'typography':enum('modern','editorial','mono'),'surface':enum('paper','night','warm'),'width':enum('reading','wide'),'spacing':enum('airy','compact'),'blocks':arr({'oneOf':[ref('Theme'+k.title()) for k in blockfields]},maxItems=9)})
S['PublicThemeScene']=obj({**S['ThemeScene']['properties'],'featuredArticle':nullable(ref('ArticleSummary')),'featuredSeries':nullable(ref('SeriesSummary'))})
S['PublicTheme']=obj({**S['Theme']['properties'],'blocks':arr({'oneOf':[ref('PublicThemeScene' if k=='scene' else 'Theme'+k.title()) for k in blockfields]},maxItems=9)})
S['SiteSettings']=obj({'version':integer,'authorPublicName':string(80),'seo':ref('Seo'),'indexingEnabled':{'type':'boolean'},'canonicalOrigin':string(format='uri')})
S['SitePatch']=obj({'authorPublicName':string(80),'seo':ref('Seo'),'indexingEnabled':{'type':'boolean'}},[]);S['SitePatch']['required']=[]
S['PublicSite']=obj({'theme':ref('PublicTheme'),'siteName':string(),'authorPublicName':string(),'seo':ref('Seo'),'indexingEnabled':{'type':'boolean'},'canonicalOrigin':string(format='uri')})
S['ThemeWorkspace']=obj({'version':integer,'draftRevisionId':uid,'draft':ref('Theme'),'appliedRevisionId':uid,'applied':ref('Theme')})
S['ApplyTheme']=obj({'draftRevisionId':uid})
S['SeoUrl']=obj({'path':string(),'lastModified':instant});page('SeoUrls','SeoUrl')
operation('/site','get','publicSite','public','PublicSite')
operation('/seo/urls','get','indexableUrls','public','SeoUrls',paging=True)
operation('/studio/site','get','siteSettings','owner','SiteSettings')
operation('/studio/site','patch','updateSiteSettings','owner','SiteSettings','SitePatch',version=True)
operation('/studio/theme','get','themeWorkspace','owner','ThemeWorkspace')
operation('/studio/theme/draft','put','saveThemeDraft','owner','ThemeWorkspace','Theme',version=True)
operation('/studio/theme/apply','post','applyTheme','owner','ThemeWorkspace','ApplyTheme',version=True,key=True)
operation('/studio/theme/restore','post','restoreAppliedTheme','owner','ThemeWorkspace',version=True,key=True)
S['JobAccepted']=obj({'id':uid,'state':enum('PENDING','COMMITTING','READY')})
S['MediaDetails']=obj({'id':uid,'state':{'const':'READY'},'size':integer,'mime':{'const':'image/png'},'width':integer,'height':integer,'attribution':nullable(ref('Attribution')),'errorCode':nullable(string())})
S['Upload']=obj({'file':string(format='binary')})
operation('/studio/media','post','uploadMedia','owner','JobAccepted','Upload',202,key=True)
operation('/studio/media/{id}','get','mediaDetails','owner','MediaDetails')
operation('/studio/media/{id}','delete','deleteMedia','owner',status=204)
operation('/media/{id}','get','readAuthorizedMedia','public')
P['/api/v1/media/{id}']['get']['responses']['200']['content']={'image/png':{'schema':string(format='binary')}}
P['/api/v1/media/{id}']['get']['responses']['206']={'description':'Authorized partial image','content':{'image/png':{'schema':string(format='binary')}}}
S['CoverRequest']=obj({'resourceType':enum('article','series'),'resourceId':uid,'resourceVersion':integer,'query':string(100)},['resourceType','resourceId','resourceVersion'])
S['CoverCandidate']=obj({'assetId':uid,'thumbnailUrl':string(),'sourceUrl':string(format='uri'),'photographer':string(),'licenseUrl':string(format='uri')})
S['CoverJob']=obj({'id':uid,'state':enum('PENDING','READY','FAILED'),'candidates':arr(ref('CoverCandidate')),'errorCode':nullable(string())})
operation('/studio/cover-jobs','post','requestCoverCandidates','owner','JobAccepted','CoverRequest',202,key=True)
operation('/studio/cover-jobs/{id}','get','coverCandidates','owner','CoverJob')
S['ArchiveCounts']=obj({'articles':integer,'series':integer,'media':integer,'categories':integer},[]);S['ArchiveCounts']['required']=[]
S['ArchiveError']=obj({'code':string(),'slug':string()},['code'])
S['ArchivePlan']={'oneOf':[obj({'errors':arr(ref('ArchiveError')),'counts':ref('ArchiveCounts'),'publishState':{'const':'draft'},'indexingEnabled':{'const':False}},['errors','counts']),obj({'schemaVersion':integer,'articles':integer,'series':integer}),obj({'errors':arr(ref('ArchiveError'))}),obj({'articleIds':{'type':'object','additionalProperties':uid},'seriesIds':{'type':'object','additionalProperties':uid},'state':{'const':'COMMITTED'},'indexingEnabled':{'const':False}}),obj({})]}
S['ArchiveJob']=obj({'id':uid,'state':enum('PENDING','READY','INVALID','COMMITTING','COMMITTED','FAILED'),'validationVersion':integer,'expiresAt':instant,'plan':ref('ArchivePlan'),'downloadUrl':string()},['id','state','validationVersion','expiresAt','plan'])
S['CommitArchive']=obj({'validationVersion':integer})
operation('/studio/exports','post','exportDomainArchive','owner','JobAccepted',status=202,key=True)
operation('/studio/exports/{id}','get','exportStatus','owner','ArchiveJob')
operation('/studio/exports/{id}/download','get','downloadDomainArchive','owner')
P['/api/v1/studio/exports/{id}/download']['get']['responses']['200']['content']={'application/octet-stream':{'schema':string(format='binary')}}
operation('/studio/imports/validate','post','validateDomainArchive','owner','JobAccepted','Upload',202,key=True)
operation('/studio/imports/{id}','get','importStatus','owner','ArchiveJob')
operation('/studio/imports/{id}/commit','post','commitDomainArchive','owner','JobAccepted','CommitArchive',202,key=True)
for path in ['/studio/media','/studio/imports/validate']:
 P['/api/v1'+path]['post']['requestBody']['content']['multipart/form-data']=P['/api/v1'+path]['post']['requestBody']['content'].pop('application/json')
# Normalize endpoint-specific sorting; non-list operations have no invented sort option.
for path,methods in P.items():
 for verb,op in methods.items():
  op['description']=op['description'].replace('This specification covers the implemented checkpoint only.','Server-enforced role, ownership, cookie and CSRF rules apply.').replace('See docs/backend-implementation.md for release gates.','See docs/backend-implementation.md for verification and deployment gates.')
  for param in op.get('parameters',[]):
   if param['name']=='sort':
    choices=['date_desc','date_asc','title_asc']
    if '/studio/articles'==path[len('/api/v1'):]:choices+=['created_asc','scheduled_asc','scheduled_desc']
    elif '/series' in path:choices=['title_asc']
    elif '/bookmarks' in path:choices=['saved_asc','saved_desc','date_desc','title_asc']
    elif '/history' in path:choices=['visited_desc']
    elif path.endswith('/seo/urls'):choices=['path_asc']
    elif path.endswith('/publication-jobs') or path.endswith('/members'):choices=['created_desc']
    param['schema']=enum(*choices)
for path in ['/articles','/studio/articles']:
 for name,schema in [('q',string(100)),('categoryId',uid) if path=='/articles' else ('status',enum('draft','scheduled','published','archived','trashed'))]:query(path,'get',name,schema)
 if path=='/studio/articles':
  query(path,'get','visibility',enum('public','private'));query(path,'get','seriesId',uid)
for path in ['/series','/studio/series']:query(path,'get','q',string(100))
query('/studio/series','get','status',enum('draft','published','archived','trashed'))
spec={'openapi':'3.1.0','info':{'title':'SATIR V1 backend API','version':'0.1.0','description':'Implemented V1 routes and explicit wire schemas. Production verification gates and external provider requirements are tracked in docs/backend-implementation.md.'},'servers':[{'url':'/'}],'paths':P,'components':{'securitySchemes':{'session':{'type':'apiKey','in':'cookie','name':'__Host-satir-session','description':'Development cookie is satir-session-dev. Server verifies active database role; MEMBER writes require email verification. Owner-only Studio never trusts client roles.'},'csrf':{'type':'apiKey','in':'header','name':'X-CSRF-TOKEN'}},'schemas':S}}
(Path(__file__).resolve().parents[1]/'docs/openapi.yaml').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
