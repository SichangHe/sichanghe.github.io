# Language Models Can Teach Themselves to Program Better
(authored by agents unless marked 🧑)
Tag: `haluptzok2022teach`, [paper](https://doi.org/10)

## scope and result
Haluptzok, Bowers, and Kalai turn execution into a correctness filter for language-model-generated programming puzzles and solutions. A puzzle is a verifier `f(·,x)`; a solution `g(x)` is accepted when `f(g(x),x)=True` (§2, p.3). The paper's central claim is operational: "This work demonstrates how LMs, together with an interpreter, can be used to generate diverse datasets of verified-correct code problems and solutions, which can then be used to improve the LMs themselves through fine-tuning." (§1, p.1)

This is testing-based verification, not a proof of arbitrary program properties. The Python interpreter checks the supplied verifier and candidate solution on the puzzle's chosen input and enforces a timeout. A candidate can pass while an untested behavior remains wrong. Inference: for VL, the analogous checker is `verus` compilation and proof checking, but a passing Verus proof still establishes only the stated specification.

## technique: executable puzzle contracts

Use this when natural-language requirements or hidden tests are too ambiguous for a training filter. Steps from §2 (p.3):

1. Write a verifier function `f(solution, input)` that returns a Boolean (§2)
2. Define a solution function `g(input)` and require the executable assertion `f(g(x),x)` (§2 and Fig. 1)
3. Generate candidate code and run it through the interpreter; accept only candidates that parse, satisfy the assertion, and finish within the timeout (§2; §4.1, pp.5–6)
4. Treat the accepted puzzle-solution pair as training data, while retaining the verifier as the test oracle (§3, p.4)

Figure 1's examples include `def f(c: int): return c + 50000 == 174653`, `def g(): return 174653 - 50000`, and `assert f(g())`; a second puzzle checks a palindrome containing exactly 4,600 copies of each requested substring (Fig. 1, p.2). The paper emphasizes: "Programming puzzles are code-based, and any solution can be easily machine verified for correctness and efficiency by execution." (§1, p.2)

Inference: In Verus, encode the puzzle's relation as a `spec fn`, write an executable Rust candidate, and use a proof function with `requires`/`ensures` to establish the relation. The Python assertion and interpreter timeout do not carry over as a formal proof; the Verus checker discharges symbolic obligations, while runtime tests remain useful for performance and integration. Inference: a VL pipeline should reject generated code unless both the Rust build and Verus proof succeed, and should retain the exact specification and proof output with each sample.

## technique: iterative self-improvement pipeline

Use this when a model can generate both tasks and answers and a small trusted seed set is available. The four steps in §3 (p.4) are:

1. LM proposes puzzles by concatenating randomly sampled training puzzles without solutions; constrain the prompt to the context window; syntactically validate outputs and remove trivial solutions (§3)
2. LM proposes solutions for each valid puzzle with the P3 few-shot prompt and a fixed number `a` of attempts (§3)
3. Run each solution with the Python interpreter; retain correct solutions, at most `m` per puzzle, and if there are more, keep the shortest `m` (§3)
4. Fine-tune the LM on the filtered puzzle-solution pairs, then repeat for `n` iterations (§3)

Appendix C defines the anti-triviality filter: integer inputs test −10 through 100, string inputs test a fixed small set, lists test bounded lengths, and every Boolean-input puzzle is deemed trivial because trying both values solves it (Appendix C, pp.14–15). Approximately half of generated puzzles were removed by duplicate, type-hint, parse, and triviality filters (§4.1, p.6). Appendix C also fixes Python hash seeding for deterministic set behavior, and Appendix G compares verified and unverified Codex data. The temperature sweep in Appendix G used a 0.2 step and found 0.8 best for Pass@100 for all three Neo sizes (Appendix G, p.23).

The authors used 155 P3 training puzzles and generated four one-million-pair datasets. Codex used one iteration; the three Neo models used two, with 25,000 unique samples in iteration one and 1M in iteration two (§4.1, pp.5–6). For each puzzle they generated `a=128` candidates, judged them using P3 code with a one-second timeout, and retained at most `m=8` distinct shortest solutions (§4.1, p.6). These are the paper's settings, not general requirements.

Inference: a Verus version should make the verifier/proof run the filtering stage, record compiler and solver versions, and fine-tune only on proofs that are reproducible from a clean checkout. Inference: generation should preserve the prompt's source puzzle and avoid duplicates so that the model does not learn only surface rewrites.

## technique: pass@k evaluation and verified-data ablation

The paper states: "These models more than double their own accuracy on test puzzles when fine-tuned on their own synthetic datasets." (Abstract, p.1)

The paper evaluates the held-out 228 P3 test puzzles with Pass@k. It generates 256 candidates per puzzle and reports `k=1…100` using Chen et al.'s unbiased estimator (§4, p.5). The denominator is 228 test puzzles; Pass@100 is the fraction with at least one accepted solution among the first 100 attempts. Table 1 reports, for Neo-2.7B after one epoch, 7.5% baseline, 15.4% after Verified-125M, 18.9% after Verified-1.3B, 20.6% after Verified-2.7B, 21.5% after Unverified-Codex, and 38.2% after Verified-Codex (Table 1, p.6). The table's dataset denominator is 1M synthetic pairs for each synthetic row; the Human row contains 635 solutions for 95 of 155 training puzzles (§4.3, p.7).

To separate model distillation from interpreter filtering, §4.2 constructs 1M Unverified-Codex pairs without correctness filtering and compares them with 1M Verified-Codex pairs. The reported outcome is that unverified data helps, but verified data gives a considerable additional boost (§4.3, p.8). The experiment therefore measures held-out execution success, not semantic equivalence or formal proof completeness.

Inference: the corresponding VL evaluation should report a fixed denominator of Rust/Verus tasks, Pass@k over independently generated proof candidates, and separate rows for compile-only, proof-checked, and unverified training data. It should not call interpreter success “formal verification.”

## what is proved, trusted, and limited
The paper proves only that accepted candidates execute successfully under its Python judge and time bound, and measures improvement on the 228 held-out puzzles. It trusts the verifier functions, P3 judging code, Python interpreter, timeout behavior, model fine-tuning, and the assumption that train and test puzzles share a distribution (§3, p.4). It explicitly says the process uses five illustrative examples but no human-written solutions for fine-tuning or evaluation (§3, p.4). The authors report that larger generators produce more diverse embeddings, but UMAP and entropy are descriptive analyses, not correctness proofs (§4.3, p.8).

Inference: threat to a product of agent-written verified Rust is high for data-generation and regression automation: an agent can generate candidate specifications, code, and proofs, then a checker can filter them. The threat is lower for specification discovery and semantic completeness because executable tests do not cover all states. VL should reuse the filter/ablation/evaluation discipline and should not redo the basic idea of using an executable oracle to reject invalid generated artifacts.

## techniques for the catalog

- executable puzzle contracts — express a task as `f(g(x),x)=True` so an interpreter can reject invalid candidates
- generated-task filtering — syntactically validate, remove trivial or duplicate tasks, execute candidate solutions, and retain bounded correct outputs
- iterative self-training — fine-tune on verified pairs and repeat task and solution generation
- interpreter-filter ablation — compare identical synthetic data with and without correctness filtering
- Pass@k evaluation — report the fraction of a fixed held-out denominator solved within k generated attempts
Checked 2026-10-15 against paper haluptzok2022teach: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
