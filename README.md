# CampusMed

Portal studențesc static pentru AMG și Tehnică Dentară la Facultatea de Medicină ULBS.

## Arhitectură
- Frontend: `docs/`, publicat prin GitHub Pages.
- Crawler: `crawler/crawl.py`.
- Quick check la fiecare 3 ore; full check zilnic.
- Date: `docs/data.json.gz` (preferat de browser) + `docs/data.json` (fallback).
- Sursele indisponibile temporar păstrează datele anterioare și sunt marcate în `source_status`.
- Feedback, Update-uri și Admin: Supabase + Row Level Security.

## Teste
- Test crawler: quick/full, fallback, URL-uri canonice și output JSON/gzip.
- Test frontend: încărcare date, sintaxă JS, integritate HTML, fișiere locale, PWA și consistența indexului.

CampusMed este un proiect studențesc neoficial. Informațiile importante trebuie verificate și pe sursa oficială.
