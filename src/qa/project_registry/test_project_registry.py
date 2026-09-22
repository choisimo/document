from __future__ import annotations
import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
VALIDATOR_PATH = ROOT / "src" / "automation" / "project_registry" / "validate.py"
REGISTRY_PATH = ROOT / "plans" / "project-registry.json"
spec = importlib.util.spec_from_file_location("project_registry_validate", VALIDATOR_PATH)
validator = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(validator)

class ProjectRegistryValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))

    def test_current_registry_is_valid(self) -> None:
        self.assertEqual([], validator.validate_registry(self.registry))

    def test_duplicate_project_id_is_rejected(self) -> None:
        candidate = copy.deepcopy(self.registry)
        candidate["projects"][1]["id"] = candidate["projects"][0]["id"]
        errors = validator.validate_registry(candidate)
        self.assertTrue(any("duplicate id" in error for error in errors), errors)

    def test_unknown_relation_target_is_rejected(self) -> None:
        candidate = copy.deepcopy(self.registry)
        candidate["projects"][0]["relations"].append({"project":"missing-project","kind":"reuse","state":"planned"})
        errors = validator.validate_registry(candidate)
        self.assertTrue(any("unknown project" in error for error in errors), errors)

    def test_unsafe_source_path_is_rejected(self) -> None:
        candidate = copy.deepcopy(self.registry)
        candidate["projects"][0]["source_of_truth"].append("../outside.md")
        errors = validator.validate_registry(candidate)
        self.assertTrue(any("safe relative path" in error for error in errors), errors)

    def test_canonical_archived_project_is_rejected(self) -> None:
        candidate = copy.deepcopy(self.registry)
        candidate["projects"][0]["lifecycle"] = "archived"
        errors = validator.validate_registry(candidate)
        self.assertTrue(any("canonical project cannot" in error for error in errors), errors)

if __name__ == "__main__":
    unittest.main()
