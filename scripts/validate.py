#!/usr/bin/env python3
"""Validate recipes.json (and usage.json, if present) for #ourfuds.

Usage:  python scripts/validate.py [repo_root]
Needs:  pip install jsonschema
Exit code is non-zero if anything is invalid, so CI blocks the deploy.
"""
import json
import os
import sys

from jsonschema import Draft202012Validator

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), ".."))
IN_CI = os.environ.get("GITHUB_ACTIONS") == "true"
errors = 0


def report(level, file, msg):
    global errors
    if level == "error":
        errors += 1
    if IN_CI:
        print(f"::{level} file={file}::{msg}")
    else:
        print(f"{level.upper()}: {file}: {msg}")


def load_json(rel):
    try:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        report("error", rel, f"Invalid JSON at line {e.lineno}, column {e.colno}: {e.msg}")
    except OSError as e:
        report("error", rel, f"Cannot read file: {e}")
    return None


def json_path(path):
    out = "$"
    for p in path:
        out += f"[{p}]" if isinstance(p, int) else f".{p}"
    return out


def schema_check(rel, data, schema_rel):
    schema = load_json(schema_rel)
    if schema is None:
        return False
    validator = Draft202012Validator(schema)
    ok = True
    for err in sorted(validator.iter_errors(data), key=lambda e: list(e.absolute_path)):
        ok = False
        report("error", rel, f"{json_path(err.absolute_path)}: {err.message}")
    return ok


def check_recipes():
    rel = "recipes.json"
    data = load_json(rel)
    if data is None:
        return set()
    schema_check(rel, data, "schema/recipes.schema.json")
    if not isinstance(data, dict):
        return set()

    # Cross-field checks JSON Schema can't express. Written defensively so they
    # still run (and report everything at once) when the schema check failed.
    cats = data.get("categories") if isinstance(data.get("categories"), list) else []
    names = [c.get("name") for c in cats if isinstance(c, dict)]
    for n in {n for n in names if names.count(n) > 1}:
        report("error", rel, f'Category "{n}" is listed more than once.')

    recipes = [r for r in data.get("recipes") or [] if isinstance(r, dict)] if isinstance(data.get("recipes"), list) else []
    ids = set()
    for i, r in enumerate(recipes):
        rid = r.get("id")
        where = f'$.recipes[{i}] ("{r.get("title", rid)}")'
        if isinstance(rid, str):
            if rid in ids:
                report("error", rel, f'{where}: duplicate id "{rid}". Every recipe id must be unique.')
            ids.add(rid)
        cat = r.get("category")
        if isinstance(cat, str) and cat not in names:
            report("error", rel, f'{where}: category "{cat}" is not in "categories" ({", ".join(map(str, names))}). Add it there first.')
        img = r.get("image") or ""
        if isinstance(img, str) and img.startswith("images/") and not os.path.isfile(os.path.join(ROOT, img)):
            report("error", rel, f'{where}: image "{img}" does not exist.')
    pinned = sum(1 for r in recipes if r.get("pinned") is True)
    if pinned > 5:
        report("warning", rel, f"{pinned} recipes are pinned; the home top row fits 5 comfortably.")
    return ids


def check_usage(ids):
    rel = "usage.json"
    if not os.path.exists(os.path.join(ROOT, rel)):
        return
    data = load_json(rel)
    if data is None or not schema_check(rel, data, "schema/usage.schema.json"):
        return
    for key in data:
        if ids and key not in ids:
            report("warning", rel, f'"{key}" does not match any recipe id; it will be ignored.')


ids = check_recipes()
check_usage(ids)
if errors:
    print(f"\n✗ {errors} problem(s) found.")
    sys.exit(1)
print(f"✓ recipes.json is valid ({len(ids)} recipes).")
