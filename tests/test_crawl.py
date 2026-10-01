import unittest
import gzip
import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from crawler import crawl
from crawler.crawl import canonical_url, make_doc, programs


# Verifică atât modul complet, cât și verificările rapide.
class CrawlTests(unittest.TestCase):
    def test_main_writes_matching_plain_and_compressed_indexes(self):
        doc = make_doc("Test", "https://example.com/a", "Anunț", "2026-09-30", "Text", "anunt")
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / "data.json.gz"
            with patch.object(crawl, "OUT", out), patch.object(crawl, "SOURCES", [{"name": "Test", "url": "https://example.com"}]), patch.object(crawl, "wp_collect", return_value=[doc]):
                crawl.main()
            plain = out.with_suffix("").read_bytes()
            self.assertEqual(plain, gzip.decompress(out.read_bytes()))
            payload = json.loads(plain)
            self.assertEqual(payload["mode"], "full")
            self.assertEqual(payload["source_status"][0]["used_cache"], False)
            self.assertEqual(payload["count"], 1)
            self.assertEqual(payload["items"], [doc])

    def test_quick_mode_merges_fresh_items_with_previous_index(self):
        old = make_doc("Test", "https://example.com/old", "Vechi", "2026-09-29", "Text", "anunt")
        fresh = make_doc("Test", "https://example.com/new", "Nou", "2026-10-01", "Text", "anunt")
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / "data.json.gz"
            previous = {"updated": "2026-09-30T05:00:00+00:00", "count": 1, "items": [old]}
            out.with_suffix("").write_text(json.dumps(previous), encoding="utf-8")
            with patch.object(crawl, "OUT", out), patch.object(crawl, "CRAWL_MODE", "quick"), patch.object(crawl, "SOURCES", [{"name": "Test", "url": "https://example.com"}]), patch.object(crawl, "wp_collect", return_value=[fresh]):
                crawl.main()
            payload = json.loads(out.with_suffix("").read_text("utf-8"))
            self.assertEqual(payload["mode"], "quick")
            self.assertEqual(payload["count"], 2)
            self.assertEqual({x["url"] for x in payload["items"]}, {old["url"], fresh["url"]})
            self.assertEqual(payload["source_status"][0]["fresh_count"], 1)

    def test_failed_source_keeps_previous_data_and_marks_cache(self):
        old = make_doc("Test", "https://example.com/old", "Vechi", "2026-09-29", "Text", "anunt")
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / "data.json.gz"
            out.with_suffix("").write_text(json.dumps({"items": [old]}), encoding="utf-8")
            with patch.object(crawl, "OUT", out), patch.object(crawl, "CRAWL_MODE", "quick"), patch.object(crawl, "SOURCES", [{"name": "Test", "url": "https://example.com"}]), patch.object(crawl, "wp_collect", return_value=[]), patch.object(crawl, "generic_collect", return_value=[]):
                crawl.main()
            payload = json.loads(out.with_suffix("").read_text("utf-8"))
            self.assertEqual(payload["items"], [old])
            self.assertTrue(payload["source_status"][0]["used_cache"])

    def test_canonical_url_removes_tracking_and_fragment(self):
        url = "https://Example.com/anunt/?utm_source=test&fbclid=123&id=42#sectiune"
        self.assertEqual(canonical_url(url), "https://example.com/anunt?id=42")
        self.assertEqual(canonical_url("https://example.com/a?z=2&utm_id=x&a=1"), "https://example.com/a?a=1&z=2")

    def test_program_detection(self):
        self.assertEqual(programs("Anunț AMG", "")[0], ["AMG"])
        self.assertEqual(programs("Tehnică dentară", "")[0], ["TD"])
        self.assertEqual(programs("Anunț general", "")[0], ["AMG", "TD"])

    def test_make_doc_normalizes_date(self):
        doc = make_doc("ULBS", "https://example.com/a", "Titlu", "30.09.2026", "Text", "anunt")
        self.assertEqual(doc["date"], "2026-09-30")
        self.assertEqual(doc["url"], "https://example.com/a")


if __name__ == "__main__":
    unittest.main()
