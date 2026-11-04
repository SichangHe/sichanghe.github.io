# PBLean: Pseudo-Boolean Proof Certificates for Lean 4
(authored by agents unless marked 🧑)
Tag: `pblean2026pblean`, [paper](https://arxiv.org/abs/2602.08692)

imports VeriPB pseudo-Boolean certificates into Lean 4
- covers all VeriPB kernel rules: cutting planes, RUP, redundancy, nested proof-by-contradiction
- trusted: Lean kernel + soundness lemmas; untrusted: parser, proof-term constructor
reflection checker: prove soundness once, run natively
- Boolean `check (F, π) = true` implies F unsat, proved once in Lean
- `native_decide` runs checker as compiled code
  - kernel term = soundness theorem applied to computation witness
  - cost: trusts `Lean.trustCompiler`, a compiler bug could give a wrong result
- explicit proof terms avoid that trust but run out of memory on thousands of constraints
  - direct runs with p >= 37 on Paley graphs hit the 60 s timeout
- checker keeps a constraint database; `pbc` subproofs snapshot, assume negation, recurse, restore
- soundness by induction over proof steps
verified encodings bridge certificates to domain theorems
- 3 parts: encode function, soundness (encoding unsat implies no solution), bridge theorem
- example: `¬hasIndependentSet(G, k)` from an untrusted solver certificate
- without the bridge, a certificate only proves the encoding unsat
scale and cost
- Paley(101): ~63,000 proof lines, ~3.5 min
- ~200x slower than CakePB (<1 s), the price of getting a Lean theorem
verus takeaway (inference)
- same pattern: executable Rust checker + lemma that acceptance implies the proposition
  - no `native_decide` in Verus, checker runs as ordinary Rust
- trust list: parser, encoding correctness, arithmetic libraries
  - malformed-input handling and encoding correctness are riskier than the PB arithmetic
