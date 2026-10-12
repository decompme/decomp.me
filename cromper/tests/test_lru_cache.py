import unittest

from cromper.handlers.lru_cache import LRUCache


class LRUCacheTests(unittest.TestCase):
    def test_hit_refreshes_entry_before_eviction(self):
        cache = LRUCache[str](max_entries=2, max_bytes=4, size_of=len)
        cache.put("first", "aa")
        cache.put("second", "bb")

        self.assertEqual(cache.get("first"), "aa")
        cache.put("third", "cc")

        self.assertEqual(cache.get("first"), "aa")
        self.assertIsNone(cache.get("second"))
        self.assertEqual(cache.get("third"), "cc")

    def test_oversized_values_are_not_stored(self):
        cache = LRUCache[str](max_entries=2, max_bytes=3, size_of=len)

        cache.put("large", "four")

        self.assertIsNone(cache.get("large"))

    def test_replacing_entry_updates_size(self):
        cache = LRUCache[str](max_entries=2, max_bytes=4, size_of=len)
        cache.put("entry", "abc")
        cache.put("entry", "x")
        cache.put("other", "yz")

        self.assertEqual(cache.get("entry"), "x")
        self.assertEqual(cache.get("other"), "yz")
