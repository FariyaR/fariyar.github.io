#!/usr/bin/env python3
"""Generate the guided services pages and the sitemap from services/data.json.

Run from the repo root after editing services/data.json or the nav/footer in index.html:
    python3 build_services.py
Writes services/index.html (the hub: industry → area → services), one entry page per industry at
services/<slug>/index.html (the same flow starting at that industry, with its own title, description
and structured data), the line between the <!-- fields:start --> / <!-- fields:end --> markers in
index.html, and sitemap.xml with last-modified dates taken from git.
The whole tree is plain HTML (crawlable, works without JavaScript); js/site.js shows one step at a
time and keeps the choice in the URL hash.
"""
import json, re, html, pathlib, subprocess, datetime

ROOT = pathlib.Path(__file__).resolve().parent
SITE = 'https://www.zetaophi.com/'
DATA = json.loads((ROOT / 'services' / 'data.json').read_text(encoding='utf-8'))
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')
SCOPE = {'AI systems': '2–6 weeks', 'Automation': '3 days – 2 weeks', 'Data systems': 'multi-week', 'AI products': '4–8 weeks'}
TIER = {'quick win': 'Quick win · days to 2 weeks', 'standard build': 'Standard build · 2–6 weeks', 'complex system': 'Complex system · multi-week'}
CASES = {'leadforge': 'LeadForge AI', 'creative-pipeline': 'Creative Generation Pipeline', 'document-intelligence': 'Tournament Document Intelligence',
         'openclaw': 'OpenClaw Analytics Agent', 'dentasmile': 'DentaSmile AI', 'ecommerce-etl': 'E-commerce Fulfillment ETL'}
FOUR = [('AI systems', 'Agents, LLM pipelines, vision, structured outputs.', '2–6 weeks'),
        ('Automation', 'n8n, APIs, webhooks, CRM, WhatsApp and inbox.', '3 days – 2 weeks'),
        ('Data systems', 'ETL, SQL, reconciliation, BI-ready datasets.', 'multi-week, custom'),
        ('AI products', 'SaaS, async GPU inference, customer-facing AI.', '4–8 weeks')]
ARROW = '<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'
CAL = '<svg class="i" viewBox="0 0 24 24"><path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>'
BACK = '<svg class="i" viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>'
ORG = {'@type': 'Organization', '@id': SITE + '#organization', 'name': 'Zetaophi', 'url': SITE}


def esc(s):
    return html.escape(s, quote=True)


PROPER = {'Amazon', 'Shopify', 'Meta', 'Google', 'Xero', 'QuickBooks', 'Kajabi', 'Stripe', 'Slack', 'Teams'}


def lc(s):
    """Lowercase for mid-sentence use, keeping acronyms (SaaS, RFQs, WMS, CVs, DMs, 3PL, DTC, BI, HR)."""
    return ' '.join(w if w.isupper() or any(ch.isupper() for ch in w[1:]) or w in PROPER else w.lower() for w in s.split())


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
    for pat in (r'<meta charset="UTF-8"><meta name="viewport"[^>]*>\n', r'<title>.*?</title>\n', r'<meta name="description"[^>]*>\n', r'<link rel="canonical"[^>]*>\n', r'<meta property="og:type".*?\n', r'<meta name="twitter:card".*?\n', r'<link rel="preload"[^>]*>\n'):
        head = re.sub(pat, '', head)
    nav = re.search(r'<header class="nav">.*?</header>', INDEX, re.S).group(0).replace(' aria-current="page"', '')
    nav = re.sub(r'(<a href="services/")>', r'\1 aria-current="page">', nav, count=1)
    footer = re.search(r'<footer>.*?</footer>', INDEX, re.S).group(0)
    return relink(head, prefix), relink(nav, prefix), relink(footer, prefix)


def search_markup():
    return ('<form class="gsearch" role="search" onsubmit="return false"><label class="sr" for="gs">Search services by keyword</label>'
            '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
            '<input id="gs" type="search" placeholder="Or search by keyword: quotes, invoices, WhatsApp, Shopify, CVs…" autocomplete="off" spellcheck="false" aria-controls="gs-results">'
            '<button type="button" class="gs-clear" aria-label="Clear search" hidden>×</button></form>'
            '<p class="gs-hints" aria-hidden="true">Try: <button type="button">quotes</button><button type="button">invoices</button><button type="button">WhatsApp</button><button type="button">reports</button><button type="button">Shopify</button><button type="button">CVs</button><button type="button">Power BI</button></p>'
            '<section class="panel" data-panel="results" id="gs-results" aria-live="polite"></section>')


def stepper(industry_name=None, industry_href=None):
    crumb = '<a href="%s">%s</a>' % (industry_href, esc(industry_name)) if industry_name else ''
    first = 'is-done' if industry_name else 'is-cur'
    second = 'is-cur' if industry_name else ''
    return ('<nav class="gsteps" aria-label="Progress"><ol>'
            '<li data-step="industry" class="%s"><span class="n">01</span><span class="l">Industry</span><b data-crumb="industry">%s</b></li>'
            '<li data-step="area" class="%s"><span class="n">02</span><span class="l">Area</span><b data-crumb="area"></b></li>'
            '<li data-step="services"><span class="n">03</span><span class="l">Services</span></li></ol></nav>' % (first, crumb, second))


def pick_item(n, href, title, sub, slug):
    return ('<li><a href="%s" data-pick="%s"><span class="n">%02d</span><span class="t">%s<span class="s">%s</span></span>%s</a></li>'
            % (href, esc(slug), n, esc(title), esc(sub), ARROW))


def industry_panel():
    items = ''.join(pick_item(i + 1, ind['slug'] + '/', ind['name'], ind['sub'], ind['slug']) for i, ind in enumerate(DATA))
    return ('<section class="panel on" data-panel="industry" aria-labelledby="q-industry">'
            '<span class="eyebrow">Services</span><h1 class="q" id="q-industry" tabindex="-1">Which industry are you in?</h1>'
            '<p class="lede">Pick yours. I’ll show where the hours go in your kind of business, and the AI agents, automation and data pipelines I build to get them back.</p>'
            '<ol class="pick" aria-label="Industries">%s</ol>'
            '<p class="aside">Not on the list? <a href="#capabilities">See the four things I build</a>, or <a href="../start-a-project.html">describe the work</a> and I’ll tell you whether a machine should do it.</p>'
            '</section>' % items)


def area_panel(ind, own_page=False):
    hash_prefix = '#' if own_page else '#%s/' % ind['slug']
    items = ''.join(pick_item(i + 1, hash_prefix + a['slug'], a['name'], a['pain'], a['slug']) for i, a in enumerate(ind['areas']))
    tag = 'h1' if own_page else 'h2'
    heading = 'AI automation for %s: where is the time going?' % lc(ind['name']) if own_page else 'Where is the time going?'
    change = '<a class="change" href="../">%s Change industry</a>' if own_page else '<a class="change" href="#">%s Change industry</a>'
    return ('<section class="panel%s" data-panel="area" data-industry="%s" aria-labelledby="q-%s">'
            '<span class="eyebrow">%s</span><%s class="q" id="q-%s" tabindex="-1">%s</%s>'
            '<p class="lede">%s</p><ol class="pick" aria-label="Areas of work">%s</ol>%s</section>'
            % (' on' if own_page else '', esc(ind['slug']), esc(ind['slug']), esc('Services · ' + ind['name']) if own_page else esc(ind['name']),
               tag, esc(ind['slug']), esc(heading), tag, esc(ind['question_lede']), items, change % BACK))


def services_panel(ind, area, prefix, own_page=False):
    rows = ''.join(
        '<li><div><b>%s</b><p>%s</p><p class="who"><b>Where a person decides:</b> %s</p></div><span class="cap">%s<small>%s</small></span></li>'
        % (esc(s['name']), esc(s['what']), esc(s['human']), esc(s['capability']), esc(TIER.get(s.get('tier'), SCOPE[s['capability']]))) for s in area['services'])
    back = '#' if own_page else '#' + ind['slug']
    return ('<section class="panel" data-panel="services" data-industry="%s" data-area="%s" data-calc-preset="%s" aria-labelledby="q-%s-%s">'
            '<span class="eyebrow">%s · %s</span><h2 class="q" id="q-%s-%s" tabindex="-1">%s</h2>'
            '<ol class="services" aria-label="Services">%s</ol>'
            '<p class="proof-line">Closest system I’ve shipped: <a href="%ssystems/%s/">%s</a>. %s</p>'
            '<div class="cta"><a class="btn primary" href="%sstart-a-project.html?type=%s">Start a project %s</a><a class="btn" href="%scalculator.html" data-calc-open>What is it costing you? %s</a></div>'
            '<a class="change" href="%s">%s Change area</a></section>'
            % (esc(ind['slug']), esc(area['slug']), ','.join(str(x) for x in ind['calc']), esc(ind['slug']), esc(area['slug']),
               esc(ind['name']), esc(area['name']), esc(ind['slug']), esc(area['slug']), esc(area['hook']), rows,
               prefix, area['proof_case'], CASES[area['proof_case']], esc(area['proof_note']), prefix, ind['type'], ARROW, prefix, ARROW, back, BACK))


def four_section(prefix):
    four = ''.join('<li><b>%s</b><span>%s</span><small>%s</small></li>' % (esc(n), esc(d), esc(w)) for n, d, w in FOUR)
    return ('<section class="sec band" id="capabilities"><div class="wrap">'
            '<div class="sec-head"><span class="eyebrow">Four things I build</span><h2 class="mask">Scoped per project, whatever the industry.</h2>'
            '<p class="lede">I’m one senior engineer, not an agency. Every engagement starts with the problem in numbers and ends with an audited run.</p></div>'
            '<ul class="four">%s</ul>'
            '<div class="cta" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:var(--s4)"><a class="btn primary" href="%sstart-a-project.html">Start a project %s</a><a class="btn" href="https://calendly.com/sy-faraza2899/30min" target="_blank" rel="noopener">Book a 30-min call %s</a></div>'
            '</div></section>' % (four, prefix, ARROW, CAL))


def document(title, description, url, prefix, body, ld, guide_attrs=''):
    head, nav, footer = chrome(prefix)
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n<title>%s</title>\n<meta name="description" content="%s">\n<link rel="canonical" href="%s">\n'
            '<meta property="og:type" content="website"><meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:url" content="%s"><meta property="og:image" content="%sog-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Zetaophi: Your business, on autopilot. AI executes, code verifies, you decide.">\n'
            '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="%s"><meta name="twitter:description" content="%s"><meta name="twitter:image" content="%sog-image.png">\n'
            '%s\n<script>document.documentElement.classList.add(\'js\')</script>\n<script type="application/ld+json">%s</script>\n</head>\n<body>\n'
            '<a class="skip" href="#main">Skip to content</a>\n%s\n<main id="main">\n\n<section class="guide" data-guide%s><div class="wrap">%s</div></section>\n%s\n</main>\n%s\n<script src="%sjs/site.js" defer></script>\n</body>\n</html>\n'
            % (esc(title), esc(description), url, esc(title), esc(description), url, SITE, esc(title), esc(description), SITE, head,
               json.dumps(ld, ensure_ascii=False), nav, guide_attrs, body, four_section(prefix), footer, prefix))


def crumbs(*items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(items)]}


def hub():
    prefix = '../'
    panels = industry_panel()
    title = 'AI automation services by industry · Zetaophi'
    desc = 'Pick your industry, then where the hours go: quotes from WhatsApp, invoices into the ledger, Power BI on real tables, inbox replies with approval.'
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'CollectionPage', 'name': title, 'url': SITE + 'services/', 'description': desc, 'isPartOf': {'@id': SITE + '#website'},
         'about': [{'@type': 'Thing', 'name': i['name']} for i in DATA]},
        {'@type': 'ItemList', 'name': 'Industries', 'itemListElement': [{'@type': 'ListItem', 'position': n + 1, 'name': 'AI automation for ' + i['name'], 'url': '%sservices/%s/' % (SITE, i['slug'])} for n, i in enumerate(DATA)]},
        crumbs(('Home', SITE), ('Services', SITE + 'services/'))]}
    return document(title, desc, SITE + 'services/', prefix, stepper() + search_markup() + panels, ld, ' data-data="data.json"')


def industry_page(ind):
    prefix = '../../'
    url = '%sservices/%s/' % (SITE, ind['slug'])
    panels = area_panel(ind, own_page=True) + ''.join(services_panel(ind, a, prefix, own_page=True) for a in ind['areas'])
    title = 'AI automation for %s · Zetaophi' % lc(ind['name'])
    areas = ', '.join(lc(a['name']) for a in ind['areas'])
    desc = 'AI systems, automation and data pipelines for %s: %s. Built by one senior engineer, each with a person in the loop.' % (lc(ind['name']), areas)
    if len(desc) > 155:
        desc = 'AI systems, automation and data pipelines for %s: %s. Each with a person in the loop.' % (lc(ind['name']), areas)
    offers = [{'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': s['name'], 'description': s['what'], 'category': s['capability']}} for a in ind['areas'] for s in a['services']]
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Service', '@id': url + '#service', 'name': 'AI automation for ' + ind['name'], 'url': url, 'mainEntityOfPage': url, 'description': desc, 'serviceType': 'AI systems, automation and data pipelines',
         'provider': {'@id': SITE + '#organization'}, 'areaServed': [{'@type': 'Country', 'name': 'United States'}, {'@type': 'Place', 'name': 'European Union'}], 'audience': {'@type': 'BusinessAudience', 'name': ind['name']},
         'hasOfferCatalog': {'@type': 'OfferCatalog', 'name': 'Services for ' + ind['name'], 'itemListElement': offers}},
        crumbs(('Home', SITE), ('Services', SITE + 'services/'), (ind['name'], url))]}
    attrs = ' data-industry="%s" data-industry-name="%s" data-hub="../"' % (esc(ind['slug']), esc(ind['name']))
    return document(title, desc, url, prefix, stepper(ind['name'], '../') + search_markup() + panels, ld, attrs)


def home_line():
    return ('<!-- fields:start -->\n<section class="industries-line"><div class="wrap"><p>Built for your industry: construction, clinics, agencies, e-commerce, logistics, finance and more. <a href="services/">Pick yours %s</a></p></div></section>\n<!-- fields:end -->'
            % ARROW)


def lastmod(*paths):
    """Most recent git commit date among the given repo files; today for uncommitted work."""
    dates = []
    for p in paths:
        try:
            out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', p], cwd=ROOT, capture_output=True, text=True).stdout.strip()
            if out:
                dates.append(out)
            if subprocess.run(['git', 'status', '--porcelain', '--', p], cwd=ROOT, capture_output=True, text=True).stdout.strip():
                dates.append(datetime.date.today().isoformat())
        except OSError:
            pass
    return max(dates) if dates else datetime.date.today().isoformat()


def sitemap():
    gen = lastmod('services/data.json', 'build_services.py', 'index.html')
    pages = [('', 'index.html'), ('systems/', 'systems/index.html')] + [('systems/%s/' % c, 'systems/%s/index.html' % c) for c in CASES]
    pages += [('services/', None)] + [('services/%s/' % i['slug'], None) for i in DATA]
    pages += [('calculator.html', 'calculator.html'), ('start-a-project.html', 'start-a-project.html'), ('partnership.html', 'partnership.html'), ('privacy.html', 'privacy.html')]
    rows = ''.join('  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>\n' % (SITE, u, lastmod(f) if f else gen) for u, f in pages)
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % rows


def applies():
    """Reverse index of case study → (industry, area) pairs that cite it, written between markers in each case study."""
    cites = {}
    for ind in DATA:
        for a in ind['areas']:
            cites.setdefault(a['proof_case'], []).append((ind, a))
    for case, pairs in cites.items():
        p = ROOT / 'systems' / case / 'index.html'
        if not p.exists():
            continue
        s = p.read_text(encoding='utf-8')
        if '<!-- applies:start -->' not in s:
            continue
        links = ''.join('<li><a href="../../services/%s/#%s">%s: %s</a></li>' % (ind['slug'], a['slug'], esc(ind['name']), esc(lc(a['name']))) for ind, a in pairs)
        block = ('<!-- applies:start -->\n<section class="applies"><h2>Where this pattern applies</h2><p>The same mechanics, scoped for the industries where this work is still done by hand:</p><ul>%s</ul></section>\n<!-- applies:end -->' % links)
        s = re.sub(r'<!-- applies:start -->.*?<!-- applies:end -->', lambda m: block, s, count=1, flags=re.S)
        p.write_text(s, encoding='utf-8')


def main():
    (ROOT / 'services' / 'index.html').write_text(hub(), encoding='utf-8')
    applies()
    for ind in DATA:
        d = ROOT / 'services' / ind['slug']
        d.mkdir(exist_ok=True)
        (d / 'index.html').write_text(industry_page(ind), encoding='utf-8')
    idx = re.sub(r'<!-- fields:start -->.*?<!-- fields:end -->', lambda m: home_line(), INDEX, count=1, flags=re.S)
    (ROOT / 'index.html').write_text(idx, encoding='utf-8')
    (ROOT / 'sitemap.xml').write_text(sitemap(), encoding='utf-8')
    print('built services/index.html, %d industry pages, homepage line, sitemap (%d areas, %d services)'
          % (len(DATA), sum(len(i['areas']) for i in DATA), sum(len(a['services']) for i in DATA for a in i['areas'])))


if __name__ == '__main__':
    main()
