#!/usr/bin/env python3
"""Crawler pentru site-urile ULBS / Facultatea de Medicină.

Strategie, pentru fiecare sursă din SOURCES:
  1. Dacă site-ul e WordPress, folosește API-ul public /wp-json (rapid, curat).
  2. Altfel citește sitemap-ul, iar dacă nu există, urmărește linkurile din prima pagină.
Rezultatul se scrie în docs/data.json, folosit de pagina de căutare.
"""
import html
import json
import re
import sys
import time
import unicodedata
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urldefrag, urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

# ----------------------------------------------------------------------------
# CONFIGURARE — adaugi/scoți site-uri aici
# ----------------------------------------------------------------------------
SOURCES = [
    {"name": "Facultatea de Medicină", "url": "https://medicina.ulbsibiu.ro"},
    {"name": "ULBS", "url": "https://www.ulbsibiu.ro"},
]
MAX_PAGES_PER_SOURCE = 400   # limită pentru crawl-ul clasic (nu pentru API-ul WordPress)
MAX_TEXT = 1500              # caractere de text păstrate per pagină
DELAY = 0.5                  # pauză între cereri (secunde), ca să nu încărcăm serverul
TIMEOUT = 25

UA = "Mozilla/5.0 (compatible; AMG-Search-Bot/1.0; proiect studentesc)"
OUT = Path(__file__).resolve().parent.parent / "docs" / "data.json"

session = requests.Session()
session.headers.update({"User-Agent": UA, "Accept-Language": "ro,en;q=0.8"})


def get(url, **kw):
    for _ in range(2):
        try:
            return session.get(url, timeout=TIMEOUT, **kw)
        except requests.RequestException:
            time.sleep(1.5)
    return None


def fold(s):
    """Minuscule, fără diacritice (ă/â/î/ș/ț -> a/a/i/s/t)."""
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


AMG_RE = re.compile(r"\bamg\b|asistent[ai]? medical|asistenta medicala")
TD_RE = re.compile(r"\btd\b|tehnic(?:a|ian)\w* dentar")


def programs(*parts):
    """Întoarce (programe, specific). Ce nu pomenește niciun program e general -> ambele."""
    s = fold(" ".join(parts))
    found = []
    if AMG_RE.search(s):
        found.append("AMG")
    if TD_RE.search(s):
        found.append("TD")
    return (found or ["AMG", "TD"]), bool(found)


def html_to_text(markup):
    soup = BeautifulSoup(markup or "", "html.parser")
    for t in soup(["script", "style", "noscript"]):
        t.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ", strip=True)).strip()


def make_doc(source, url, title, date, text, kind):
    title = re.sub(r"\s+", " ", title or "").strip() or url
    text = (text or "")[:MAX_TEXT]
    prog, spec = programs(title, text, unquote(url))
    return {
        "title": title,
        "url": url,
        "date": (date or "")[:10],
        "source": source,
        "type": kind,  # anunt | pagina | document
        "prog": prog,  # ["AMG"], ["TD"] sau ambele
        "spec": spec,  # True dacă pomenește explicit un program
        "text": text,
    }


# ----------------------------------------------------------------------------
# 1) WordPress REST API
# ----------------------------------------------------------------------------
def wp_collect(name, base):
    docs = []
    for endpoint, kind in (("posts", "anunt"), ("pages", "pagina"), ("media", "document")):
        fields = "source_url,title,date,mime_type" if endpoint == "media" else "link,title,date,content"
        page = 1
        while True:
            r = get(
                f"{base}/wp-json/wp/v2/{endpoint}",
                params={"per_page": 100, "page": page, "_fields": fields},
            )
            if r is None or r.status_code != 200:
                break
            try:
                data = r.json()
            except ValueError:
                break
            if not isinstance(data, list) or not data:
                break
            for p in data:
                title = html_to_text((p.get("title") or {}).get("rendered", ""))
                if endpoint == "media":
                    if "pdf" not in (p.get("mime_type") or "") or not p.get("source_url"):
                        continue
                    docs.append(make_doc(name, p["source_url"], title, p.get("date"), "", kind))
                else:
                    if not p.get("link"):
                        continue
                    text = html_to_text((p.get("content") or {}).get("rendered", ""))
                    docs.append(make_doc(name, p["link"], title, p.get("date"), text, kind))
            try:
                total = int(r.headers.get("X-WP-TotalPages", "1") or 1)
            except ValueError:
                total = 1
            if page >= total or page >= 50:
                break
            page += 1
            time.sleep(DELAY)
    return docs


# ----------------------------------------------------------------------------
# 2) Crawl clasic (sitemap sau linkuri)
# ----------------------------------------------------------------------------
def sitemap_urls(base):
    seen, urls, queue = set(), [], []
    r = get(base + "/robots.txt")
    if r is not None and r.status_code == 200:
        queue += re.findall(r"(?im)^sitemap:\s*(\S+)", r.text)
    queue += [base + "/sitemap.xml", base + "/wp-sitemap.xml"]
    while queue and len(seen) < 30:
        sm = queue.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        r = get(sm)
        if r is None or r.status_code != 200:
            continue
        for loc in re.findall(r"<loc>\s*(.*?)\s*</loc>", r.text, re.S):
            loc = html.unescape(loc)
            if loc.lower().endswith(".xml"):
                queue.append(loc)
            else:
                urls.append(loc)
    return list(dict.fromkeys(urls))


def parse_page(name, url, markup):
    soup = BeautifulSoup(markup, "html.parser")
    links = [a["href"] for a in soup.find_all("a", href=True)]
    h1 = soup.find("h1")
    title = h1.get_text(" ", strip=True) if h1 and h1.get_text(strip=True) else (
        soup.title.get_text(" ", strip=True) if soup.title else ""
    )
    date = ""
    meta = soup.find("meta", attrs={"property": "article:published_time"})
    if meta and meta.get("content"):
        date = meta["content"]
    else:
        t = soup.find("time", attrs={"datetime": True})
        if t:
            date = t["datetime"]
    for t in soup(["script", "style", "noscript", "nav", "header", "footer", "aside", "form"]):
        t.decompose()
    root = soup.find("main") or soup.find("article") or soup.body or soup
    text = re.sub(r"\s+", " ", root.get_text(" ", strip=True)).strip()
    return make_doc(name, url, title, date, text, "pagina"), links


def generic_collect(name, base):
    host = urlparse(base).netloc.replace("www.", "")

    rp = RobotFileParser()
    r = get(base + "/robots.txt")
    rp.parse(r.text.splitlines() if r is not None and r.status_code == 200 else [])

    def allowed(u):
        try:
            return rp.can_fetch(UA, u)
        except Exception:
            return True

    def same_site(u):
        return urlparse(u).netloc.replace("www.", "") == host

    seeds = sitemap_urls(base)
    queue = deque(seeds or [base])
    seen, docs, fetched = set(), [], 0
    while queue and fetched < MAX_PAGES_PER_SOURCE:
        url = urldefrag(queue.popleft())[0]
        if url in seen or not url.startswith("http") or not same_site(url) or not allowed(url):
            continue
        seen.add(url)
        path = urlparse(url).path.lower()
        if path.endswith(".pdf"):
            fname = unquote(path.rsplit("/", 1)[-1])[:-4]
            docs.append(make_doc(name, url, re.sub(r"[-_]+", " ", fname), "", "", "document"))
            continue
        if re.search(r"\.(jpe?g|png|gif|webp|svg|zip|rar|docx?|xlsx?|pptx?|mp4|mp3)$", path):
            continue
        r = get(url)
        time.sleep(DELAY)
        if r is None or r.status_code != 200 or "text/html" not in r.headers.get("Content-Type", ""):
            continue
        fetched += 1
        doc, links = parse_page(name, url, r.text)
        docs.append(doc)
        for link in links:
            full = urljoin(url, link)
            is_pdf = urlparse(full).path.lower().endswith(".pdf")
            if is_pdf or not seeds:  # fără sitemap: urmărim și linkurile HTML
                queue.append(full)
    return docs


# ----------------------------------------------------------------------------
def main():
    old_items = []
    if OUT.exists():
        try:
            old_items = json.loads(OUT.read_text("utf-8")).get("items", [])
        except ValueError:
            pass

    items = []
    for s in SOURCES:
        name, base = s["name"], s["url"].rstrip("/")
        print(f"→ {name} ({base})", flush=True)
        docs = wp_collect(name, base)
        method = "wp-api"
        if not any(d["type"] != "document" for d in docs):
            docs = generic_collect(name, base)
            method = "crawl"
        if not docs:
            docs = [d for d in old_items if d.get("source") == name]
            method = "păstrat din rularea anterioară"
        print(f"  {len(docs)} intrări ({method})", flush=True)
        items += docs

    uniq = {}
    for d in items:
        uniq.setdefault(d["url"], d)
    items = sorted(uniq.values(), key=lambda d: d["date"], reverse=True)

    if not items:
        print("Nicio intrare găsită — nu suprascriu data.json.", file=sys.stderr)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "count": len(items),
        "sources": [s["name"] for s in SOURCES],
        "items": items,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), "utf-8")
    print(f"Gata: {len(items)} intrări în {OUT}")


if __name__ == "__main__":
    main()
