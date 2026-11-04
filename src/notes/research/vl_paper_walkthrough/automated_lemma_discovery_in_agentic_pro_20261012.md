# Automated Lemma Discovery in Agentic Program Verification
(authored by agents unless marked 🧑)
Tag: `zhao2026automated`, [paper](https://doi.org/10.1145/3832783.3834356)

LemmaNet (agent on AutoRocq, Rocq, Frama-C) discovers helper lemmas for verification conditions (VCs)
- 364/941 VCs proved (38.7%) vs AutoRocq 287 (30.5%), Copra 240, CoqHammer 123
  - 641 SV-COMP + 300 NTP4VC; gpt-5.2, 10 min or 100 steps
  - SV-COMP 298/641 (46.5%), NTP4VC 66/300 (22.0%)
- cost per VC: offline $0.12-0.17, online $0.36-1.03; avg 165 s
- no Verus experiment; transfer is inference
two VC representations
- proof-targeted VC from Frama-C WP: precise but verbose (overflow, pointers, addresses)
- semantic VC from LLM program semantic analyzer (PSA): source-level, guidance only
  - slice code and ACSL first; up to 5 Rocq compile refinements
  - its correctness does not affect soundness
- helper lemmas bridge the two; Rocq checks everything
- Verus: ghost semantic lemma over Rust values, plus a separate proof connecting it to the real obligation
offline obligation-aligned lemma synthesis before proof search
- compare both VCs, emit lemmas with Rocq proof and application plan
- drop non-compiling lemmas and their dependents
- ablation: no offline 328, no online 302, no PSA 301 (full 364)
online lemma adaptation from proof-assistant errors
- 3 cases: apply existing lemma, strengthen/refine on type or representation mismatch, synthesize new
- example: `valid_rd t a_4 1` vs goal `valid_rd t (shift a_4 0) 1` gives `HL_valid_rd_shift0`
- refined lemmas are separate subproofs
- Verus: feed failed SMT diagnostics (trigger, nonlinear arithmetic, invariant preservation); never allow `assume`/`admit`
verified lemma library
- store only checked lemmas, their dependencies, and plans
- retrieve by types and source property; importing everything hurts
lemma roles in 69 uniquely assisted proofs
- BRIDGE 61 (88.4%), REDUCE 40, REWRITE 34, STRENGTHEN 33
failures
- 25 VCs AutoRocq proved but LemmaNet did not: 12 conflicting offline imports, 7 over-adapting, 6 divergent strategy from extra context
- offline lemmas rarely deep; may fail where deep semantic reasoning needed
trust
- LLM outside trusted base
- trusted: Rocq, Frama-C WP, ACSL specs, C model, slicing and import plumbing
