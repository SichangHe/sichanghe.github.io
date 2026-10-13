# 🧑 "Also have it do the program verification, Verus stuffs"
from pathlib import Path
from collections.abc import Callable
import subprocess
import json
import hashlib
import time

root = Path(__file__).resolve().parent
binary = "/ssd1/sichangheagent/verus/source/target-verus/release/verus"
ops: list[tuple[str, str, Callable[[int, int], int]]] = [
    ("add", "x + y", lambda x, y: x + y),
    ("mul", "x * y", lambda x, y: x * y),
    ("conditional", "if x < y { x } else { y }", min),
    ("division", "x / (y + 1)", lambda x, y: x // (y + 1)),
]
results: list[dict[str, str | int | float]] = []
for name, expr, oracle in ops:
    table = " ||\n".join(
        f"(x == {x} && y == {y} && z == {oracle(x, y)})"
        for x in range(4)
        for y in range(4)
    )
    for mode in ["valid", "invalid"]:
        body = (
            f"let z = {expr};\nassert({table});"
            if mode == "valid"
            else f"let x: int = 3; let y: int = 2; let z = {expr}; assert(z == {oracle(3, 2) + 1});"
        )
        args = "x: int, y: int" if mode == "valid" else ""
        req = "requires 0 <= x <= 3, 0 <= y <= 3," if mode == "valid" else ""
        s = f"use vstd::prelude::*;\nverus! {{\nproof fn check({args})\n{req}\n{{ {body} }}\n}}\nfn main() {{}}\n"
        p = root / f"{name}_{mode}.rs"
        _ = p.write_text(s)
        start = time.monotonic()
        try:
            run = subprocess.run(
                [binary, str(p), "--crate-type", "lib"],
                capture_output=True,
                text=True,
                timeout=45,
            )
            _ = (root / f"{name}_{mode}.stdout").write_text(run.stdout)
            _ = (root / f"{name}_{mode}.stderr").write_text(run.stderr)
            results.append(
                dict(
                    case=p.name,
                    expected="accept" if mode == "valid" else "reject",
                    exit_status=run.returncode,
                    seconds=time.monotonic() - start,
                    stdout=run.stdout,
                    stderr=run.stderr,
                    sha256=hashlib.sha256(s.encode()).hexdigest(),
                )
            )
        except subprocess.TimeoutExpired:
            results.append(dict(case=p.name, expected=mode, status="timeout"))
_ = (root / "results.json").write_text(json.dumps(results, indent=2))
print(json.dumps(results, indent=2))
