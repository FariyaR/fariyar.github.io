#!/usr/bin/env python3
"""Generate the guided services page (services/index.html) and the homepage line from services/data.json.

Run from the repo root after editing services/data.json or the nav/footer in index.html:
    python3 build_services.py
The page holds the whole industry → area → services tree in plain HTML (crawlable, works without
JavaScript); js/site.js turns it into one question at a time and keeps the choice in the URL hash.
"""
import json, re, html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SITE = 'https://www.zetaophi.com/'
DATA = json.loads((ROOT / 'services' / 'data.json').read_text(encoding='utf-8'))
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')
SCOPE = {'AI systems': '2–6 weeks', 'Automation': '3 days – 2 weeks', 'Data systems': 'multi-week', 'AI products': '4–8 weeks'}
CASES = {'leadforge': 'LeadForge AI', 'creative-pipeline': 'Creative Generation Pipeline', 'document-intelligence': 'Tournament Document Intelligence',
         'openclaw': 'OpenClaw Analytics Agent', 'dentasmile': 'DentaSmile AI', 'ecommerce-etl': 'E-commerce Fulfillment ETL'}
FOUR = [('AI systems', 'Agents, LLM pipelines, vision, structured outputs.', '2–6 weeks'),
        ('Automation', 'n8n, APIs, webhooks, CRM, WhatsApp and inbox.', '3 days – 2 weeks'),
        ('Data systems', 'ETL, SQL, reconciliation, BI-ready datasets.', 'multi-week, custom'),
        ('AI products', 'SaaS, async GPU inference, customer-facing AI.', '4–8 weeks')]
ARROW = '<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'
CAL = '<svg class="i" viewBox="0 0 24 24"><path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>'
BACK = '<svg class="i" viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>'


def esc(s):
    return html.escape(s, quote=True)


def relink(markup, prefix):
    """Point relative href/src values at the right depth. index.html is the source of truth for nav and footer."""
    def fix(m):
        attr, val = m.group(1), m.group(2)
        if re.match(r'^(https?:|mailto:|data:|#|/)', val):
            return m.group(0)
        if val.startswith('./'):
            val = val[2:]
        return '%s="%s%s"' % (attr, prefix, val)
    return re.sub(r'\b(href|src)="([^"]*)"', fix, markup)


def chrome(prefix):
    head = re.search(r'<meta charset.*?<link rel="stylesheet" href="css/site.css">', INDEX, re.S).group(0)
    for pat in (r'<title>.*?</title>\n', r'<meta name="description"[^>]*>\n', r'<link rel="canonical"[^>]*>\n', r'<meta property="og:type".*?\n', r'<meta name="twitter:card".*?\n'):
        head = re.sub(pat, '', head)
    nav = re.search(r'<header class="nav">.*?</header>', INDEX, re.S).group(0).replace(' aria-current="page"', '')
    nav = re.sub(r'(<a href="services/")>', r'\1 aria-current="page">', nav, count=1)
    footer = re.search(r'<footer>.*?</footer>', INDEX, re.S).group(0)
    return relink(head, prefix), relink(nav, prefix), relink(footer, prefix)


def pick_item(n, href, title, sub, slug):
    return ('<li><a href="%s" data-pick="%s"><span class="n">%02d</span><span class="t">%s<span class="s">%s</span></span>%s</a></li>'
            % (href, esc(slug), n, esc(title), esc(sub), ARROW))


def industry_panel():
    items = ''.join(pick_item(i + 1, '#' + ind['slug'], ind['name'], ind['sub'], ind['slug']) for i, ind in enumerate(DATA))
    return ('<section class="panel on" data-panel="industry" aria-labelledby="q-industry">'
            '<span class="eyebrow">Services</span><h1 class="q" id="q-industry" tabindex="-1">Which industry are you in?</h1>'
            '<p class="lede">Pick yours. I’ll show where the hours go in your kind of business, and what I build to get them back.</p>'
            '<ol class="pick" aria-label="Industries">%s</ol>'
            '<p class="aside">Not on the list? <a href="#capabilities">See the four things I build</a>, or <a href="../start-a-project.html">describe the work</a> and I’ll tell you whether a machine should do it.</p>'
            '</section>' % items)


def area_panel(ind):
    items = ''.join(pick_item(i + 1, '#%s/%s' % (ind['slug'], a['slug']), a['name'], a['pain'], a['slug']) for i, a in enumerate(ind['areas']))
    return ('<section class="panel" data-panel="area" data-industry="%s" aria-labelledby="q-%s">'
            '<span class="eyebrow">%s</span><h1 class="q" id="q-%s" tabindex="-1">Where is the time going?</h1>'
            '<p class="lede">%s</p><ol class="pick" aria-label="Areas of work">%s</ol>'
            '<a class="change" href="#">%s Change industry</a></section>'
            % (esc(ind['slug']), esc(ind['slug']), esc(ind['name']), esc(ind['slug']), esc(ind['question_lede']), items, BACK))


def services_panel(ind, area):
    rows = ''.join(
        '<li><div><b>%s</b><p>%s</p><p class="who"><b>Where a person decides:</b> %s</p></div><span class="cap">%s<small>%s</small></span></li>'
        % (esc(s['name']), esc(s['what']), esc(s['human']), esc(s['capability']), esc(SCOPE[s['capability']])) for s in area['services'])
    return ('<section class="panel" data-panel="services" data-industry="%s" data-area="%s" data-calc-preset="%s" aria-labelledby="q-%s-%s">'
            '<span class="eyebrow">%s · %s</span><h1 class="q" id="q-%s-%s" tabindex="-1">%s</h1>'
            '<ol class="services" aria-label="Services">%s</ol>'
            '<p class="proof-line">Closest system I’ve shipped: <a href="../systems/%s/">%s</a>. %s</p>'
            '<div class="cta"><a class="btn primary" href="../start-a-project.html?type=%s">Start a project %s</a><a class="btn" href="../calculator.html" data-calc-open>What is it costing you? %s</a></div>'
            '<a class="change" href="#%s">%s Change area</a></section>'
            % (esc(ind['slug']), esc(area['slug']), ','.join(str(x) for x in ind['calc']), esc(ind['slug']), esc(area['slug']),
               esc(ind['name']), esc(area['name']), esc(ind['slug']), esc(area['slug']), esc(area['hook']), rows,
               area['proof_case'], CASES[area['proof_case']], esc(area['proof_note']), ind['type'], ARROW, ARROW, esc(ind['slug']), BACK))


def page():
    prefix = '../'
    head, nav, footer = chrome(prefix)
    panels = industry_panel() + ''.join(area_panel(ind) + ''.join(services_panel(ind, a) for a in ind['areas']) for ind in DATA)
    four = ''.join('<li><b>%s</b><span>%s</span><small>%s</small></li>' % (esc(n), esc(d), esc(w)) for n, d, w in FOUR)
    title = 'Services · pick your industry · Zetaophi'
    desc = 'Pick your industry, then the area where the hours go, and see the exact systems I build for it: AI systems, automation, data pipelines and AI products, each with a person in the loop.'
    names = ', '.join(i['name'] for i in DATA)
    ld = {'@context': 'https://schema.org', '@type': 'WebPage', 'name': title, 'url': SITE + 'services/', 'description': desc,
          'isPartOf': {'@type': 'WebSite', 'name': 'Zetaophi', 'url': SITE}, 'about': [{'@type': 'Thing', 'name': i['name']} for i in DATA]}
    body = ('<section class="guide" data-guide><div class="wrap">'
            '<nav class="gsteps" aria-label="Progress"><ol>'
            '<li data-step="industry" class="is-cur"><span class="n">01</span><span class="l">Industry</span><b data-crumb="industry"></b></li>'
            '<li data-step="area"><span class="n">02</span><span class="l">Area</span><b data-crumb="area"></b></li>'
            '<li data-step="services"><span class="n">03</span><span class="l">Services</span></li></ol></nav>'
            '<form class="gsearch" role="search" onsubmit="return false"><label class="sr" for="gs">Search services by keyword</label>'
            '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
            '<input id="gs" type="search" placeholder="Or search by keyword: quotes, invoices, WhatsApp, Shopify, CVs…" autocomplete="off" spellcheck="false" aria-controls="gs-results">'
            '<button type="button" class="gs-clear" aria-label="Clear search" hidden>×</button></form>'
            '<p class="gs-hints" aria-hidden="true">Try: <button type="button">quotes</button><button type="button">invoices</button><button type="button">WhatsApp</button><button type="button">reports</button><button type="button">Shopify</button><button type="button">CVs</button><button type="button">Power BI</button></p>'
            '<section class="panel" data-panel="results" id="gs-results" aria-live="polite"></section>'
            '%s</div></section>\n'
            '<section class="sec band" id="capabilities"><div class="wrap">'
            '<div class="sec-head"><span class="eyebrow">Four things I build</span><h2 class="mask">Scoped per project, whatever the industry.</h2>'
            '<p class="lede">I’m one senior engineer, not an agency. Every engagement starts with the problem in numbers and ends with an audited run.</p></div>'
            '<ul class="four">%s</ul>'
            '<div class="cta" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:var(--s4)"><a class="btn primary" href="../start-a-project.html">Start a project %s</a><a class="btn" href="https://calendly.com/sy-faraza2899/30min" target="_blank" rel="noopener">Book a 30-min call %s</a></div>'
            '</div></section>' % (panels, four, ARROW, CAL))
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<title>%s</title>\n<meta name="description" content="%s">\n<link rel="canonical" href="%sservices/">\n'
            '<meta property="og:type" content="website"><meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:url" content="%sservices/"><meta property="og:image" content="%sog-image.png">\n'
            '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="%s"><meta name="twitter:description" content="%s"><meta name="twitter:image" content="%sog-image.png">\n'
            '%s\n<script>document.documentElement.classList.add(\'js\')</script>\n<script type="application/ld+json">%s</script>\n</head>\n<body>\n'
            '<a class="skip" href="#main">Skip to content</a>\n%s\n<main id="main">\n\n%s\n</main>\n%s\n<script src="%sjs/site.js" defer></script>\n</body>\n</html>\n'
            % (esc(title), esc(desc), SITE, esc(title), esc(desc), SITE, SITE, esc(title), esc(desc), SITE, head, json.dumps(ld, ensure_ascii=False), nav, body, footer, prefix))


def home_line():
    return ('<!-- fields:start -->\n<section class="industries-line"><div class="wrap"><p>Built for your industry: construction, clinics, agencies, e-commerce, logistics, finance and more. <a href="services/">Pick yours %s</a></p></div></section>\n<!-- fields:end -->'
            % ARROW)


def main():
    (ROOT / 'services' / 'index.html').write_text(page(), encoding='utf-8')
    idx = re.sub(r'<!-- fields:start -->.*?<!-- fields:end -->', lambda m: home_line(), INDEX, count=1, flags=re.S)
    (ROOT / 'index.html').write_text(idx, encoding='utf-8')
    sm = (ROOT / 'sitemap.xml').read_text(encoding='utf-8')
    sm = re.sub(r'  <url><loc>%sservices(\.html|/[^<]*)</loc></url>\n' % re.escape(SITE), '', sm)
    sm = sm.replace('  <url><loc>%scalculator.html</loc></url>\n' % SITE, '  <url><loc>%sservices/</loc></url>\n  <url><loc>%scalculator.html</loc></url>\n' % (SITE, SITE), 1)
    (ROOT / 'sitemap.xml').write_text(sm, encoding='utf-8')
    n_areas = sum(len(i['areas']) for i in DATA)
    print('built services/index.html: %d industries, %d areas, %d services' % (len(DATA), n_areas, sum(len(a['services']) for i in DATA for a in i['areas'])))


if __name__ == '__main__':
    main()
