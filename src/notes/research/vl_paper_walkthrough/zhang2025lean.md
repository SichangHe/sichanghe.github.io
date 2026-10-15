# Lean Meets Theoretical Computer Science: Scalable Synthesis of Theorem Proving Challenges in Formal-Informal Pairs
(authored by agents unless marked 🧑)
Tag: `zhang2025lean`, [paper](http://arxiv.org/abs/2508.15878v2)

## scope and result

The paper presents a benchmark-construction method rather than a new verifier. Its central pipeline has three stages: a parameterized problem module, algorithmic ground-truth generation, and template-based synthesis of aligned Lean and Markdown tasks (section 3, p. 3). The authors state: “We propose leveraging theoretical computer science (TCS) as a scalable source of rigorous proof problems, where algorithmic definitions enable automated generation of arbitrarily many challenging theorem-proof pairs.” (abstract, p. 1). They instantiate it with Busy Beaver (BB) machines and mixed Boolean-arithmetic (MBA) identities. The formal object is checked by Lean; the natural-language object is generated from the same data.

Inference: for VL, the reusable lesson is to generate verification tasks from executable parameterized models and to retain a machine-checkable oracle for every generated instance. The paper does not verify Rust or claim that its benchmark construction proves systems properties.

## technique 1: parameterized formal–informal synthesis

What it is. A “Problem Module” defines a family with a tunable difficulty parameter; “Ground-Truth Generation” computes correct answers; and “Template-Based Synthesis” emits a Lean theorem plus a natural-language description from the same instance (section 3, p. 3). The authors describe the framework as “a systematic three-stage synthesis framework that generates infinite families of formally rigorous mathematical challenges with provable correctness.” (section 3, p. 3).

Inference: When to use it. Use this when manually curating a benchmark is expensive, contamination is a concern, and the domain has an algorithmic specification whose outputs can be independently checked. Difficulty is changed by a parameter rather than by rewriting examples.

Inference: How to do it. (1) Define the mathematical or computational object and a parameterized generator (section 3). (2) Implement a deterministic procedure that computes the answer or a proof object (sections 3.1–3.2). (3) Put the generated object into an expert-authored Lean template containing definitions, the statement, and a `sorry` placeholder; put the same state table or expression into a Markdown template (section 3.1 and Appendix D, pp. 3, 20). (4) Compile candidate proofs and retain only outputs accepted by Lean (section 4, p. 6; Appendix B, p. 14). The Appendix D program reads JSONL tables, inserts the informal transition table beside `theorem machine_`, and writes prompts.

Verus form. Inference: a Rust generator could emit a `spec fn` for the mathematical instance, an executable generator for concrete cases, and a `proof fn` establishing each oracle result. A verified Rust task would use `requires` and `ensures` on the function under test; `assert`, `reveal`, and lemma calls can connect the implementation to the generated specification. The Lean `sorry` placeholder has no direct Verus analogue: an unfinished proof must be completed before verification, and `external_body` would make the target unproved and therefore unsuitable as a benchmark oracle. The template-to-Markdown alignment remains ordinary text generation and is outside Verus’s proof.

Evidence. The authors report that the construction is “Our framework achieves infinite scalability via algorithmic problem generation from parameterized TCS modules” and that “Automated verifiability provides ground-truth validation without human intervention.” (section 5, p. 9). Their evidence is the generated BB and MBA families and the Lean pass/fail results, not a measurement of all possible domains.

Limits and assumptions. The templates are expert-defined, so semantic alignment depends on the generator and template code. The paper says the Lean compiler validates proofs but grades each proof whole (Appendix A, p. 14). The authors also note that proprietary models use undisclosed settings and that their model sample is limited (Appendix A, p. 14). Inference: a template bug can systematically produce a valid but unintended benchmark, so the generator and specification remain trusted inputs.

## technique 2: Busy Beaver classification by bounded simulation

What it is. A BB machine is a seven-tuple with finite states, binary symbols, transition function, initial state, blank symbol, and halting state (section 3.1, p. 3). For a state count N, the generator enumerates all machines and uses known BB(N) values. The paper’s algorithm “executes each candidate machine for exactly BB(N) + 1 steps using deterministic simulation.” (section 3.1, p. 3). A machine that halts within the bound is classified halting; one that does not is classified non-halting by maximality of BB(N).

Inference: When to use it. Use bounded simulation when a finite, proven upper bound exists for the instances being generated. It is suitable for a benchmark that wants hard proofs while making oracle labels cheap to compute.

Inference: How to do it. (1) Enumerate transition tables for N states; the paper gives 64, 20,736, 16,777,216, and 4,294,967,296 machines for N=1,2,3,4 (Table 1, p. 3). (2) Initialize the machine on a blank tape. (3) Simulate exactly BB(N)+1 transitions (section 3.1). (4) Label halting if `qHALT` is reached; otherwise label non-halting by the maximality argument. (5) Insert the table into the Lean/Markdown pair and ask a model to prove the resulting theorem (section 3.1 and Appendix C, pp. 3, 14).

Verus form. Inference: model the tape and configuration as Rust datatypes, define an executable `step`, and prove a bounded lemma that the simulator’s result agrees with a mathematical `spec fn`. For a non-halting theorem over all `n`, use a loop invariant or a recursive proof function establishing that every reachable configuration has a successor. Verus can express the invariant and transition contract, but the BB maximality fact and the finite enumeration must be supplied as trusted specifications or separately proved lemmas.

Evidence and failure. BB Pass@16 is reported over 50 instances per N and 200 total (Table 2, p. 6): DeepSeek-Prover-v2-671B succeeds on 115/200 (57.5%), QwQ-32B on 98/200 (49.0%), and OpenAI-o4-mini on 54/200 (27.0%). The denominator is model attempts grouped as 50 cases at each N, with up to 16 samples per case; “Pass@16” counts a case successful when one of 16 proofs compiles without `sorry` (section 4, p. 5). The table’s percentages agree with their fractions. A demonstrated success proves only the generated Lean theorem; a failed proof says nothing about the theorem’s truth. Inference: BB instances threaten VL mainly as a benchmark for induction and state-machine invariants, not as a direct systems exploit.

## technique 3: MBA normalization to W2DNF

What it is. MBA expressions combine arithmetic and bitwise operators over `BitVec 32`. The paper normalizes every two-variable linear expression to a weighted 2-disjunctive normal form (W2DNF), a weighted sum of four conjunctions (`¬x∧¬y`, `¬x∧y`, `x∧¬y`, `x∧y`) (section 3.2, pp. 4–5). “Two MBA expressions E1 and E2 are semantically equivalent if and only if their W2DNF representations have identical coefficients.” (section 3.2, p. 5).

Inference: When to use it. Use canonical normalization when the target property is equivalence of bit-vector expressions and you need a deterministic oracle independent of model proof search. It also supplies a controlled proof path through algebraic identities.

Inference: How to do it. (1) Generate a linear expression whose terms sum to zero, then redistribute terms across the two equation sides with flipped signs (section 3.2, p. 4). (2) Declare variables and coefficients as 32-bit bitvectors, so arithmetic is modulo 2^32 (section 3.2, p. 4). (3) Compute the four W2DNF coefficients for each side. (4) Compare coefficients pairwise; equality is the oracle decision (section 3.2, p. 5). (5) For a proof, apply the custom identities until both sides have the canonical form.

Verus form. Inference: represent `BitVec 32` as a fixed-width integer type supported by the project’s Verus libraries, define a pure specification for each of the four coefficients, and prove an `ensures` theorem that equal coefficient vectors imply equal evaluations for every input. Bitwise identities and modular arithmetic may require explicit lemmas and bit-index reasoning; Lean tactics such as `simp only`, `rw`, and `nth_rw` do not carry over as syntax. The semantic idea of a canonical form does carry over.

Evidence and assumptions. The custom library contains De Morgan laws, distributivity, XOR decompositions, commutativity, and identities converting disjoint ORs to addition (Appendix F, pp. 25–28). Ground-truth proofs use these lemmas and prohibit `bv_decide` for the challenge so that success reflects symbolic manipulation (section 3.2, p. 5). The authors report 12/100 (12%) for DeepSeek-Prover-v2-671B on linear MBA with lemmas, 0/100 without lemmas, and 0/40 on non-linear MBA (Table 3, p. 8). Step-level evaluation reports 258/356 correct steps for that model and 352/356 for OpenAI-o4-mini (Table 4, p. 8); the prose elsewhere calls this 98.88% for o4-mini, but 352/356 is 98.876%, which rounds to 98.88%. The denominators and settings are explicit in the table captions. Inference: the sharp gap between atomic lemma selection and whole-proof success indicates proof planning, rather than individual rewrites, is the principal risk for an agent writing verified Rust.

## technique 4: tactic-level proof decomposition and validation

The authors extract a step lemma whenever the Lean goal’s left- or right-hand side changes after a tactic. Non-final steps are restricted to `simp only`, `rw`, or `nth_rw` with the custom library; the final step uses `simp` (section 3.2, p. 5). This yields independently checkable step tasks. Models’ outputs are parsed by regular expression and sent to Kimina Lean Server, which runs Lean 4.19.0 and Mathlib through a REST API (section 4.1, p. 6; Appendix B, p. 14).

Verus form. Inference: expose each transformation as a separate `proof fn` or lemma with an explicit equality `ensures`, then call those lemmas in a top-level proof. Keep executable functions free of proof-only calls after erasure. Do not encode a proof function as runtime logic.

Evidence and trusted boundary. Error counts across BB and MBA are 122,404 irrelevant hallucinations (67.27%), 42,247 tactic misuse (23.22%), 8,871 voluntary give-ups (4.88%), 8,136 type mismatches (4.47%), and 300 others (0.16%) (Table 5, p. 8); the displayed fractions sum to 100.00% after rounding. The validator trusts Lean, Mathlib, Kimina’s server, and the parser. Inference: VL should treat compiler acceptance as necessary evidence, then separately test that generated contracts express the intended product property.

## what VL should reuse and avoid

Inference: Already done here: parameterized theorem generation, deterministic semantic oracles, formal–informal pairing, canonical bit-vector normalization, lemma-level scoring, and compiler-backed whole-proof grading. VL should not redo these as generic ideas. Inference: a new VL contribution would need a systems-specific generator, Rust/Verus proofs, or measurements of maintenance and threat impact beyond this paper.

The product threat is indirect. Inference: these benchmarks expose hallucinated lemmas, blind automation, and failure to compose locally correct steps; the same failure modes could produce plausible but incomplete Verus contracts. The paper does not measure Verus, Rust, memory safety, concurrency, or deployment behavior, so no direct product vulnerability follows from its model scores.

## techniques for the catalog

- parameterized formal–informal synthesis: generate aligned Lean and natural-language proof tasks from an expert template and a shared algorithmic instance
- Busy Beaver bounded oracle: classify finite-state machines by deterministic simulation through BB(N)+1 and maximality
- MBA W2DNF normalization: decide two-variable bit-vector equivalence by comparing four canonical weighted coefficients
- lemma-library proof decomposition: turn each goal-changing rewrite into an independently scored Lean step
- compiler-backed validation: parse model output and accept only Lean 4 proofs that compile without `sorry`
Checked 2026-10-15 against paper zhang2025lean: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
