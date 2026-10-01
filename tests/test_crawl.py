import unittest
import gzip
import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from crawler import crawl
from crawler.crawl import canonical_url, make_doc, programs


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
            self.assertEqual(payload["count"], 1)
            self.assertEqual(payload["items"], [doc])

    def test_canonical_url_removes_tracking_and_fragment(self):
        url = "https://Example.com/anunt/?utm_source=test&fbclid=123&id=42#sectiune"
        self.assertEqual(canonical_url(url), "https://example.com/anunt?id=42")

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
