import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('converter',Path(__file__).parents[1]/'convert-legacy-content.py')
converter=importlib.util.module_from_spec(spec);spec.loader.exec_module(converter)
class LegacyConversionTest(unittest.TestCase):
    def fixtures(self):
        article={'slug':'first','authored':True,'title':'First','category':'Yazılım','createdAt':'2026-01-02T03:00:00Z','publishedAt':'2026-02-03','eyebrow':'Notes','excerpt':'Intro','paragraphs':['Text']}
        content={'version':2,'articles':[article,{**article,'slug':'demo','authored':False}],'series':[{'slug':'journey','title':'Journey','summary':'Intro','ongoing':True,'articleSlugs':['first','demo']}]}
        theme={'name':'Theme','siteName':'SATIR','accent':'#aabbcc','typography':'modern','surface':'paper','width':'wide','spacing':'airy','blocks':[{'id':'scene','kind':'scene','title':'Title','emphasis':'','description':'','featuredArticleSlug':'first','featuredSeriesSlug':'journey','showFeaturedArticle':True,'showFeaturedSeries':True}]}
        return content,theme
    def test_explicit_mapping_and_provenance_without_demo_or_publication(self):
        content,theme=self.fixtures();manifest,files=converter.convert(content,theme)
        self.assertEqual(len(manifest['articles']),1);self.assertFalse(files)
        article=manifest['articles'][0]
        self.assertEqual(article['createdAt'],'2026-01-02T03:00:00Z')
        self.assertEqual(article['input']['displayDate'],'2026-02-03')
        self.assertEqual(manifest['series'][0]['input']['chapterIds'],[article['id']])
        self.assertEqual(manifest['theme']['blocks'][0]['featuredArticleId'],article['id'])
        self.assertNotIn('status',article['input']);self.assertIn('featuredArticleSlug',theme['blocks'][0])
    def test_no_implicit_remote_image_download_or_missing_provenance(self):
        content,theme=self.fixtures();content['articles'][0]['figure']={'src':'https://untrusted.invalid/a.svg','alt':'','caption':''}
        with self.assertRaisesRegex(ValueError,'explicit local PNG'):converter.convert(content,theme)
        del content['articles'][0]['createdAt']
        with self.assertRaisesRegex(ValueError,'createdAt'):converter.convert(content,theme)
    def test_demo_requires_opt_in_and_duplicate_slugs_rejected(self):
        content,theme=self.fixtures();manifest,_=converter.convert(content,theme,include_demo=True)
        self.assertEqual(len(manifest['articles']),2)
        content['articles'][1]['slug']='first'
        with self.assertRaisesRegex(ValueError,'duplicate'):converter.convert(content,theme,include_demo=True)
if __name__=='__main__':unittest.main()
