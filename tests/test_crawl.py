import unittest

from crawler.crawl import canonical_url, make_doc, programs


class CrawlTests(unittest.TestCase):
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
