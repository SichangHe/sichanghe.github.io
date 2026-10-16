# Beyond Fail-to-Pass: Iterative Hardening of Co-Generated Bug Reproduction Tests and Fixes
(authored by agents unless marked 🧑)
Tag: `tan2026beyondfailtopass`, [paper](https://doi.org/10.1109/ICSE48619.2023)

## what is measured

The paper studies bug-reproduction tests (BRTs) for automated program repair. Its key claim is that a test can fail on buggy code and pass on a golden fix while still accepting incorrect fixes. The authors introduce Mutation Patch Evaluation (MPE), then C O H ARDEN, a two-phase test/fix loop. The abstract reports “C O H ARDEN reaches 69.4% Resolved and 78.9% F→P on SWE-bench Verified” (PDF p. 1). These are empirical benchmark rates, not formal guarantees about arbitrary patches.

## technique 1: mutation patch evaluation (MPE)

what it is and when to use it

Use MPE when ordinary Fail-to-Pass (F→P) is too weak. F→P only checks that a generated test fails on the buggy program and passes on one golden fix. MPE tests whether the same BRT rejects plausible but incorrect fixes. The paper defines the problem with a concrete SymPy example: a rigorous test checks exact bracket output, a lax test checks only that output differs from the buggy string, and a misaligned test expects an algebraically simplified form (Figure 1, PDF p. 2).

how to do it

1. Start with buggy program `cbuggy`, golden fix `cgolden` and golden test `tgolden` (section 2.1, PDF p. 3).
2. Generate a BRT `tgen` and first apply the normal F→P gate: it fails on `cbuggy` and passes on `cgolden`.
3. Build a mutation pool `C={c′1,…,c′N}` by mutating `cgolden` with five semantic operators: vanilla, symptom suppression, incomplete fix, input-specific shortcut and behavior substitution (section 2.1, PDF p. 3).
4. Run every mutant against `tgen` and `tgolden`.
5. Classify the 2×2 outcomes. Rigorous mutants fail `tgen` and pass `tgolden`; Lax mutants pass both; Misaligned mutants pass `tgen` but fail `tgolden` (section 2.1, PDF p. 3).
6. Use the class when deciding whether to give the BRT to a fix agent.

The paper reports 552 Rigorous instances with FIX-ONLY 67.3% Resolved and with-BRT 75.8% (Δ +8.5); 552 Lax instances show 69.5% to 69.5% (Δ 0.0); 474 Misaligned instances fall from 44.5% to 40.9% (Δ −3.6) (Table 1, PDF p. 3). The denominators are instance counts in each test class, not all 433 instances in the later intersection benchmark.

Verus form

Inference: use a verified test oracle plus a generated mutant harness for Rust functions. State the intended behavior with Verus `ensures`; generate candidate incorrect implementations and run the oracle against each. A `proof fn` can establish properties of the oracle and mutation harness, but generated source and test execution remain external unless modeled. Inference: classify a Rust test as rigorous only when it rejects mutants that satisfy superficial or vacuous contracts and still accepts the reviewed implementation.

evidence and limits

MPE exposes that F→P alone overstates utility. Mutant quality depends on the five operators and LLM sampling, so the pool is only an approximation of incorrect-fix space. The paper explicitly says that this space is unbounded (section 2.1, PDF p. 3). Inference: a product should report operator coverage and admissible-mutant counts, never claim completeness.

## technique 2: lax-init before joint fix generation

COHARDEN first asks an agent to write only a reproduction test from the issue, forbidding source edits. Its authors write, “The agent therefore emits only a reproduction test t0 and is forbidden from modifying any source file.” (section 3.1, PDF p. 6)

Steps: provide the issue; direct the agent toward an observable failure such as output, exception or return-value discrepancy; reject internal-hook tests and strict structural assertions; store `t0`; only then permit joint fix/test generation (section 3.1, PDF p. 6). The reason is to reduce test–fix coupling and early Misaligned tests. Inference: in VL, generate an independent executable counterexample harness before editing verified Rust or contracts. Keep the initial witness separate from the candidate's proposed proof so the same model cannot make both mutually self-consistent by construction. This has no direct Verus analogue; it is workflow control.

## technique 3: temporal-matrix hardening

After `t0`, each round jointly emits `(tk,ck)`, mutates `ck`, and compares mutants against the current test and previous-round reference test. The temporal matrix has α (both pass), β (current passes but reference fails), γ (current fails but reference passes) and δ (both fail) (section 3.2, PDF p. 7). Compute laxity `ℓk=β/total`, where `total` is admissible mutants in that round. Accept a nontrivially changed test when `ℓk≤τ`; the default is `τ=0.2`. If `ℓk>τ`, revert the test to `t0`, retain the fix and feed surviving mutants back as feedback (Algorithm 1, PDF p. 18).

Its method notes, “The F→P gate is binary, however, and cannot tell Rigorous from Lax.” (section 3.2, PDF p. 7)

The complete loop is: (1) test-only `t0`; (2) joint agent call; (3) four-operator mutation with N=3 samples per operator, giving |Ck|=12 when all are admissible; (4) temporal-matrix evaluation; (5) render surviving mutants; (6) accept, revert or retry (Algorithm 1, PDF p. 18; section 4, PDF p. 7). Inference: for Verus, make each mutant satisfy the same public type and compile gate, then use verified contracts and independent tests to score β. Verus `assert`, `requires`, `ensures`, loop `invariant` and `proof fn` lemmas can prove local test properties; the model-generated mutant pool is still a search heuristic.

Evidence: on the 433-instance SWE-bench Verified ∩ SWT-bench Verified set with GPT-5-mini, COHARDEN reaches 69.4% Resolved, 78.9% F→P and $0.84 per instance, versus OpenHands+COGEN 61.4%, 72.7% and $0.56 (Table 2, PDF p. 8). With GPT-5.4 and Claude Opus 4.5, COHARDEN reaches 76.2% and 78.7% Resolved on the same 433 instances (Table 3, PDF p. 8). On the 276-instance Lite intersection it reaches 57.6% Resolved and 64.1% F→P (Table 4, PDF p. 9). These denominators and backbones differ and must stay attached to each number.

## technique 4: ablation and convergence diagnostics

The authors remove each phase to test causal contribution. Full COHARDEN is 69.4% Resolved/78.9% F→P; without lax-init 62.4%/70.2%; without hardening 61.0%/82.6%; without both 61.4%/72.7% (Table 5, PDF p. 9). Across rounds, Resolved rises from 61.0% at R1 to 69.4% at R5 while F→P falls from 83.3% at R0 to 78.9% at R5 (Figure 4, PDF p. 9). Inference: VL evaluations should include phase ablations and distinguish test pass rate from rejection of incorrect implementations

## trust, reuse and product threat

Trusted components include LLM mutation operators, test execution, benchmark harnesses, issue descriptions, golden fixes, and the assumption that sampled mutants represent plausible incorrect patches. The paper's method does not prove semantic equivalence to the intended bug; it measures repair outcomes. Inference: threat to agent-written verified Rust is high at the oracle boundary: a vacuous `ensures` can make both candidate and mutant appear correct, and mutation operators may miss a harmful implementation. VL should reuse MPE's orthogonal quality axis, test-first decoupling, temporal feedback and denominator-specific reporting; it should not redo generic APR benchmarks without a contract-aware mutant taxonomy.

## techniques for the catalog

- mutation patch evaluation: classify BRTs as Rigorous, Lax or Misaligned by running semantic mutants against current and golden tests
- test-first lax-init: create an observable reproduction test before allowing a fix
- temporal-matrix hardening: compare each new test with the previous test and reject high-laxity regressions
- bounded mutant sampling: generate admissible variants with targeted semantic operators and record the denominator
- phase ablation: measure each workflow phase separately for causal contribution
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
