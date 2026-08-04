"""Tests for the content pipeline's refusal to launder a malformed value.

Run directly (`python scripts/test_content_pipeline.py`) or through
`npm run ci`, which invokes it as its first step. Stdlib only, like the rest of
`scripts/`.

These exist because the guard they cover is otherwise unexercised: the Jest
suites assert over the COMMITTED content, which is clean, so deleting
`validate_attributes` from both call sites left the whole gate green. A guard
no test can fail is a comment (out-of-context review of 20260729-092352, R1.3).
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPTS_DIR)

sys.path.insert(0, SCRIPTS_DIR)

from markdown_to_json import ContentError, validate_attributes  # noqa: E402

SPECIES_MD = """---
species: Zuniceratops
translation: Zuni Horned Face
clade: ceratopsoidea
period: Late Cretaceous (91 Ma)
size: 3.5 meters
weight: 150 kilograms
image: https://example.com/species/zuniceratops.png
icon: {icon}
---

A small horned dinosaur.
"""

CLADE_MD = """---
clade: Ceratopsoidea
image: https://example.com/clades/ceratopsoidea.svg
---

Horned dinosaurs.
"""

GOOD_ICON = "https://example.com/clades/ceratopsoidea.svg"
POISONED_ICON = "['https://example.com/clades/ceratopsoidea.svg']"


def run_script(name, *args, cwd=None):
    return subprocess.run(
        [sys.executable, os.path.join(SCRIPTS_DIR, name), *args],
        capture_output=True,
        text=True,
        cwd=cwd or REPO_ROOT,
    )


class ValidateAttributesTest(unittest.TestCase):
    """The predicate itself.

    The same five examples are asserted in TypeScript by "recognises the
    historical defect shape" in `test/contentSource.test.ts`, against
    `isSerializedCollection` in `src/frontMatter.ts`. Keep the two lists
    together: they are a hand-copied mirror, and this pair is what keeps them
    from drifting apart.
    """

    def test_rejects_the_historical_defect_shape(self):
        with self.assertRaises(ContentError) as caught:
            validate_attributes({"icon": POISONED_ICON}, "species/x.md")
        self.assertIn("species/x.md", str(caught.exception))
        self.assertIn("icon", str(caught.exception))

    def test_rejects_other_serialized_collections(self):
        for value in ('{"a": 1}', "('a', 'b')"):
            with self.subTest(value=value):
                with self.assertRaises(ContentError):
                    validate_attributes({"field": value}, "species/x.md")

    def test_accepts_scalars(self):
        validate_attributes(
            {"icon": GOOD_ICON, "period": "Late Jurassic (153-148 Ma)"},
            "species/x.md",
        )

    def test_rejects_a_non_string_by_name(self):
        # Reachable from index.json, where a number or null is representable.
        # It must produce the named refusal, not a bare AttributeError.
        for value in (3.5, None, ["a"], {"a": 1}):
            with self.subTest(value=value):
                with self.assertRaises(ContentError) as caught:
                    validate_attributes({"size": value}, "index.json species/x")
                self.assertIn("not a string", str(caught.exception))


class MarkdownToJsonTest(unittest.TestCase):
    """md -> json: the direction the defect originally travelled."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp)
        self.content = os.path.join(self.tmp, "jurassic")
        os.makedirs(os.path.join(self.content, "species"))
        os.makedirs(os.path.join(self.content, "clades"))
        with open(os.path.join(self.content, "clades", "ceratopsoidea.md"), "w") as f:
            f.write(CLADE_MD)
        self.index = os.path.join(self.tmp, "index.json")
        self.tree = os.path.join(self.tmp, "tree.json")

    def write_species(self, icon):
        path = os.path.join(self.content, "species", "zuniceratops.md")
        with open(path, "w") as f:
            f.write(SPECIES_MD.format(icon=icon))

    def generate(self):
        return run_script(
            "markdown_to_json.py",
            "--jurassic-path",
            self.content,
            "--index-path",
            self.index,
            "--tree-path",
            self.tree,
        )

    def test_generates_from_clean_source(self):
        self.write_species(GOOD_ICON)
        result = self.generate()

        self.assertEqual(result.returncode, 0, result.stderr)
        with open(self.index) as f:
            data = json.load(f)
        self.assertEqual(data["species"]["zuniceratops"]["icon"], GOOD_ICON)

    def test_refuses_a_serialized_collection_and_names_the_file(self):
        self.write_species(POISONED_ICON)
        result = self.generate()

        self.assertEqual(result.returncode, 1)
        self.assertIn("zuniceratops.md", result.stderr)
        self.assertIn("icon", result.stderr)
        self.assertIn("serialized collection", result.stderr)

    def test_writes_nothing_when_it_refuses(self):
        # A half-written index.json would be worse than the defect: the served
        # payload would silently lose every species after the bad one.
        self.write_species(POISONED_ICON)
        self.generate()

        self.assertFalse(os.path.exists(self.index))
        self.assertFalse(os.path.exists(self.tree))

    def test_sorts_ids_regardless_of_creation_order(self):
        # index.json key order picks the daily answer (src/gameData.ts), so an
        # order that follows os.listdir re-points every puzzle whenever the
        # content directory churns. Files are written in deliberately
        # non-alphabetical order so directory order cannot pass by accident.
        for species_id in ("zuniceratops", "allosaurus", "triceratops", "brachiosaurus"):
            path = os.path.join(self.content, "species", species_id + ".md")
            with open(path, "w") as f:
                f.write(SPECIES_MD.format(icon=GOOD_ICON))
        for clade_id in ("zephyrosauria", "allosauroidea", "titanosauria"):
            path = os.path.join(self.content, "clades", clade_id + ".md")
            with open(path, "w") as f:
                f.write(CLADE_MD.replace("---\n", "---\nparent: ceratopsoidea\n", 1))

        result = self.generate()

        self.assertEqual(result.returncode, 0, result.stderr)
        with open(self.index) as f:
            data = json.load(f)
        self.assertEqual(list(data["species"]), sorted(data["species"]))
        self.assertEqual(list(data["clades"]), sorted(data["clades"]))

    def test_leaves_an_existing_payload_untouched_when_it_refuses(self):
        self.write_species(GOOD_ICON)
        self.generate()
        with open(self.index) as f:
            before = f.read()

        self.write_species(POISONED_ICON)
        self.assertEqual(self.generate().returncode, 1)

        with open(self.index) as f:
            self.assertEqual(f.read(), before)


class JsonToMarkdownTest(unittest.TestCase):
    """json -> md: guarding only one direction leaves the loop open."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp)
        # json_to_markdown.py resolves its paths relative to the CWD, so it runs
        # against a scratch tree rather than the repo's real content.
        self.content = os.path.join(self.tmp, "src", "jurassic")
        os.makedirs(os.path.join(self.content, "species"))
        os.makedirs(os.path.join(self.content, "clades"))
        self.index = os.path.join(self.content, "index.json")

    def write_index(self, icon):
        payload = {
            "species": {
                "zuniceratops": {
                    "species": "Zuniceratops",
                    "translation": "Zuni Horned Face",
                    "clade": "ceratopsoidea",
                    "period": "Late Cretaceous (91 Ma)",
                    "size": "3.5 meters",
                    "weight": "150 kilograms",
                    "image": "https://example.com/species/zuniceratops.png",
                    "icon": icon,
                    "description": "A small horned dinosaur.",
                }
            },
            "clades": {
                "ceratopsoidea": {
                    "clade": "Ceratopsoidea",
                    "image": "https://example.com/clades/ceratopsoidea.svg",
                    "description": "Horned dinosaurs.",
                }
            },
        }
        with open(self.index, "w") as f:
            json.dump(payload, f, indent=4)

    def species_md(self):
        return os.path.join(self.content, "species", "zuniceratops.md")

    def test_writes_markdown_from_a_clean_payload(self):
        self.write_index(GOOD_ICON)
        result = run_script("json_to_markdown.py", cwd=self.tmp)

        self.assertEqual(result.returncode, 0, result.stderr)
        with open(self.species_md()) as f:
            self.assertIn(f"icon: {GOOD_ICON}", f.read())

    def test_refuses_to_re_author_a_serialized_collection(self):
        self.write_index(POISONED_ICON)
        result = run_script("json_to_markdown.py", cwd=self.tmp)

        self.assertEqual(result.returncode, 1)
        self.assertIn("zuniceratops", result.stderr)
        self.assertIn("serialized collection", result.stderr)
        self.assertFalse(os.path.exists(self.species_md()))


if __name__ == "__main__":
    unittest.main(verbosity=2)
