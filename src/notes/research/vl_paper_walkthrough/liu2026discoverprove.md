# Discover and Prove: An Open-source Agentic Framework for Hard Mode Automated Theorem Proving in Lean 4
(authored by agents unless marked 🧑)
Tag: `liu2026discoverprove`, [paper](https://arxiv.org/abs/2604.15839)

## problem and framework

The paper argues that common theorem-proving benchmarks embed the answer in the formal statement (“Easy Mode”), while “Hard Mode” requires independently discovering the answer before proving it. Its abstract says: “We call the stricter, more realistic set- ting ‘Hard Mode’: the system must independently discover the answer before constructing a formal proof.” (Abstract, p. 1) Discover and Prove (DAP) uses a natural-language Discovery Module and a Lean Proving Module; discovery fills the answer placeholder and rewrites the statement to leave one proof goal.

The released benchmarks are MiniF2F-Hard and FIMO-Hard, reannotated by experts. The paper reports DAP solves 36 PutnamBench Hard Mode problems (19 solution-style), 9/1 CombiBench problems, 201/168 miniF2F-test problems, and 3/0 FIMO problems at Pass@32 (Table 2, p. 6). The dataset totals in that table are PutnamBench 660/340, CombiBench 100/45, miniF2F-test 244/197, and FIMO 149/70, where each pair is total / Hard Mode count.

Inference: VL should separate requirement or specification discovery from Rust/Verus proof construction. A proof agent that receives the desired postcondition as an unexamined premise can produce a valid but irrelevant proof.

## technique: discovery with self-verification and self-correction

How the paper does it.

1. Solution Generation: given the natural-language problem, ask GPT-OSS-120B for a detailed chain of thought and candidate answer (Section 3.1, p. 3).
2. Self-Verification: ask the same model to inspect the steps and produce an error report naming erroneous locations (Section 3.1, p. 3).
3. Self-Correction: if errors are reported, ask for a revised solution addressing them; repeat up to 30 attempts (Section 3.1, p. 3; Section 5, p. 5).
4. Rewriting: provide the Lean Hard Mode statement, natural-language problem, and reasoning, and ask for an Easy Mode statement with one placeholder (Section 3.1, p. 3).
5. Pass the rewritten statement to the Proving Module (Section 3.2, p. 4).

The paper states: “The Discovery Module is crucial because incorrect solutions frequently lead to flawed formal state- ments that are unprovable from the outset.” (Section 3.1, p. 3) This is why self-verification is intended to improve the candidate before formalization. In the no-agent ablation, the raw reasoning output is used directly when the 30 attempts fail (Section 5, p. 5).

Verus form. Inference: create a discovery artifact containing candidate constants, data-structure invariants, and intended postconditions in natural language or a ghost specification. Run independent checks (examples, executable reference code, or a second model) before allowing a proof agent to see the candidate. Then instantiate a fixed Verus contract and ask the proof agent to verify Rust against it. Discovery must not edit the trusted contract without review; `requires`, `ensures`, `spec fn`, `assert`, loop `invariant`, and helper `proof fn` are the supported proof-facing constructs.

Evidence and limits. Table 3 evaluates answer discovery on definitive-answer subsets: PutnamBench 293/340 (86%) with agent versus 265/340 (78%) without; CombiBench 32/45 (71%) versus 29/45 (64%); miniF2F-Hard 197/197 (100%) for both; FIMO-Hard 43/70 (61%) versus 38/70 (54%) (Table 3, p. 6). These are natural-language answer accuracies, not formal proof rates. Self-reflection helps harder datasets but can add noise to easy ones, as the paper explains (Section 6.1, p. 6).

## technique: answer-conditioned rewriting

What it is. The Discovery Module converts a two-`sorry` Hard Mode theorem into a one-`sorry` Easy Mode theorem by inserting the discovered answer. The Proving Module then solves only the remaining proof. DAP differs from straight rewriting because discovery and rewriting are separate prompts.

How to apply it.

1. Start with a human-annotated statement that has separate answer and proof placeholders (Section 1, p. 2).
2. Keep the answer candidate outside Lean until self-verification completes (Section 3.1, p. 3).
3. Rewrite the statement using the candidate, preserving the original premises and intended goal (Section 3.1, p. 3).
4. Submit only the rewritten statement to an ATP model and verify the generated proof with Lean 4 (Section 3.2, p. 4).

The rewriting ablation compares No Rewriting, Straight Rewriting (one model call discovers and rewrites), and DAP's Proposed Rewriting. Table 4 reports Pass@32 solved counts: PutnamBench 23, 19, 36; CombiBench 9, 9, 9; miniF2F-Hard 57, 38, 201; FIMO-Hard 3, 3, 3 (Table 4, p. 6). The paper notes that no/straight settings can copy visible answer conditions into a proof, producing spurious proofs; DAP hides the answer placeholder from the prover after rewriting (Section 6.2, pp. 6–7).

Verus form. Inference: freeze a contract file after the discovery review and give the proof agent only the resulting Rust signature and body obligations. Keep the discovered requirement in a separate artifact, and compare it with the contract before verification. A Verus proof must still pass the checker; rewriting cannot be treated as evidence that the candidate answer is correct.

## technique: benchmark curation for semantic accuracy

The authors use three annotation principles: semantic accuracy, interpretability, and consistency (Section 4.1, p. 4). Experts independently annotate each problem and cross-validate labels. Hard Mode removes (1) answers encoded as premises, (2) goals weakened to a strict subset, and (3) premises absent from the human problem (Section 4.1, p. 4). They port FIMO from Lean 3 to Lean 4, verify compilation and semantic faithfulness, repair approximately 15 miniF2F and 20 FIMO errors across four types, and promote unknown values to free parameters with explicit side conditions (Section 4.3, p. 5).

Verus form. Inference: construct VL benchmarks by having two reviewers compare each Rust contract with its natural-language requirement, explicitly checking that no postcondition is supplied as a precondition and that unknown values remain quantified or parameterized. Compile every benchmark under a pinned Verus version, and retain corrected examples as regression tests.

## evidence, trust, and product threat

The environment is Lean 4.15.0 with Kimina-Server; GPT-OSS-120B uses temperature 1.0 and up to 30 self-checking attempts; Goedel-Prover-V2 uses temperature 0.7, 30,000 max tokens, 32 samples, and Pass@32 (Section 5, p. 5). The formal evidence is Lean kernel acceptance of proof outputs. Inference: VL's corresponding trusted base includes Verus, its solver, Rust compiler and erasure, external API specifications, and benchmark contracts.

The paper's Hard Mode results show that DAP's natural-language module is much stronger than the proof module: the abstract reports “state-of-the-art LLMs exceed 80% answer accuracy on the same problems where formal provers manage under 10%” (Abstract, p. 1). This gap means proving is the bottleneck, but it does not show that discovered answers are faithful for arbitrary software requirements. The stated limitation is possible dataset contamination because source problems and models are public (Limitations, p. 7).

Inference: threat to agent-written verified Rust is high when agents can silently turn an intended behavior into an easier contract, and medium when requirements are reviewed and frozen. VL should reuse the separation between discovery and proof, but test contract drift, side-condition omissions, and behavior on real code rather than redo Hard Mode benchmark curation.

## techniques for the catalog

- hard-mode benchmark design — remove supplied answers and require an explicit discovery artifact before formal proving
- self-verifying answer discovery — generate a candidate, inspect it for errors, and iteratively correct it before formalization
- answer-conditioned rewriting — insert a reviewed candidate into a single-goal statement before invoking the theorem prover
- semantic benchmark curation — expert cross-validation, unified conventions, and compilation checks prevent answer leakage and misaligned goals
Checked 2026-10-15 against paper liu2026discoverprove: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
