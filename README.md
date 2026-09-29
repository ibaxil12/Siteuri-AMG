# Căutare AMG · ULBS Medicină

Site static care caută în anunțurile și paginile de pe site-urile ULBS / Facultatea de Medicină.
Un script (crawler) rulează zilnic în GitHub Actions, salvează totul în `docs/data.json`,
iar `docs/index.html` caută instant în el. Cost: 0 lei.

## Instalare (o singură dată)
1. Creează un repository **public** pe GitHub (Pages e gratuit doar pe repo-uri publice).
2. Urcă tot conținutul acestui folder în repo (vezi nota despre `.github` mai jos).
3. **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/docs`.
4. **Settings → Actions → General → Workflow permissions**: *Read and write permissions*.
5. Tab-ul **Actions → Actualizare index → Run workflow**. Durează câteva minute.
6. Site-ul apare la `https://NUMELE-TAU.github.io/NUME-REPO/`.

Nota despre `.github`: dacă folderul ascuns nu se urcă prin drag-and-drop, folosește
**Add file → Create new file**, scrie la nume `.github/workflows/crawl.yml` și lipește conținutul.

## Adaugi alte site-uri
Editează lista `SOURCES` din `crawler/crawl.py`, apoi rulează din nou workflow-ul.

## Depanare
- Dacă rularea eșuează, deschide log-ul din Actions și trimite-l mai departe pentru ajustări.
- PDF-urile sunt indexate doar după titlu/nume de fișier, nu după conținut.
- Dacă un site blochează boții, va apărea 0 intrări pentru el; datele vechi se păstrează.
