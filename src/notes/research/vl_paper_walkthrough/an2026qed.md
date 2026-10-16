# QED: An Open-Source Multi-Agent System for Generating Mathematical Proofs on Open Problems
(authored by agents unless marked 🧑)
Tag: `an2026qed`, [paper](https://arxiv.org/abs/2604.24021)

## what the paper proves or measures

QED is a failure-mode-driven multi-agent pipeline for producing natural-language proofs of open mathematical problems. Its decomposition agent plans a directed acyclic graph of claims, prover agents write proofs, structural and detailed verifiers check them, and a selector and verdict agent choose whether to continue or accept. The paper reports five successful projects among 18 research projects proposed by seven domain experts, with experts judging every successful result correct, original, and nontrivial. The paper says, “We successfully produced original, nontrivial, and complete solutions to 5 research projects” (abstract, p. 1). Three were judged comparable in difficulty and scope to work in specialist journals (Conclusion, p. 9).

The measured verifier result is narrower than universal soundness: for 214 candidates checked with Codex GPT-5.5, 17 were accepted, and all 17 were subsequently accepted by the relevant expert, giving an observed false-positive rate of 0/17 in that configuration (Section 5.2, p. 8). The denominator is accepted candidates, not all candidates; 197 candidates were rejected. Costs were about $1,000 for A.1, $200 for A.2, $100 for A.3, $600 for A.4, and $50 for A.5, with model/configuration differences (Section 5.1, pp. 7–8). The ten single-query GPT-5.5 Pro attempts for the two probability problems all omitted essential steps (Section 6, p. 8), but this is a small diagnostic comparison, not a success-rate estimate.

Trusted parts remain substantial. Domain experts supplied the problem statements and post-hoc judgments; the LLM verifier, citation availability, source contents, mathematical semantics, and model outputs are not themselves formally proved. Inference: QED's “verification” is independent natural-language review, unlike a proof assistant kernel that checks a formal term. Inference: for VeruLaw, the architecture is useful for generating and triaging proof obligations, while final Rust/Verus correctness still requires Verus's checked contracts and proofs.

## technique 1: separate prover and verifier context

What it is and when to use it. A prover and verifier must be independent invocations that receive the original problem and proof, but not the prover's hidden reasoning or shared conversational state. This targets context contamination and same-model self-verification bias. The paper states, “The proof agent and verification agents are separate model invocations with no shared context” (Section 4.1, p. 4).

How to do it. (1) Give the exact problem statement to a prover. (2) Save the proof as a document. (3) Start fresh verifier calls with only the problem and proof. (4) Have each verifier issue structured findings. (5) Let a selector compare proof–report pairs, and let a verdict agent accept or continue without generating new checks (Section 4.1, p. 4). The verifier must not see intermediate prover attempts.

Verus form. Inference: generate a Rust function with a contract, then run `verus` as an external checker in a separate process. The checked artifact is the source, not an LLM transcript. A minimal shape is `fn f(x: int) -> (y: int) requires x >= 0 ensures y >= 0 { x }`; Verus's verifier, rather than a second model, checks the contract. Separation still helps VL: an agent that writes `requires`/`ensures` should not be the only agent deciding that the specification matches the task.

Evidence and limits. The paper's ablation found all ten single-query baseline attempts incomplete, while decomposition-mode runs produced accepted proofs (Section 6, p. 8). This does not isolate context separation from the other QED components. Inference: independent model calls reduce correlated mistakes but do not establish semantic soundness when the proof remains prose.

## technique 2: exact citation grounding

What it is and when to use it. Every external theorem is represented with an exact statement, source title/authors/location, and checked applicability. Use it whenever a proof depends on literature rather than deriving every lemma. The paper requires that “every cited result must include the exact theorem statement, the source (with title, authors, and location), and a verification that all conditions of the cited result are satisfied in the current context” (Section 4.4, p. 6).

How to do it. (1) In the proof output, quote the cited theorem verbatim. (2) Record title, authors, URL, and page/section. (3) Independently check that the URL resolves, metadata match, and the exact statement exists at that location. (4) Check that the source statement matches verbatim and that every hypothesis holds in the current subgoal (Phase 3, Section 4.3, p. 6). (5) Reject on any mismatch. The ablation reports a case where, without this phase, a key theorem came only from unpublished notes (Section 6, p. 8).

Verus form. Inference: replace prose citations with imported Verus specifications whose contracts are visible in source. A lemma is a `proof fn` with `ensures`, for example `proof fn nonneg_sum(a: int, b: int) ensures a >= 0 && b >= 0 ==> a + b >= 0 { ... }`; call it only in proof code. External library behavior remains an assumption unless its specification and implementation are verified. Do not put `ensures` on a `spec fn`; a spec function defines a mathematical value.

Evidence and limits. Citation checks found that unverified citation structure allowed misstated theorems and unusable unpublished sources (Section 6, p. 8). Inference: VL should maintain a machine-readable registry of dependency contracts and source versions; citation grounding cannot prove that the cited mathematics models the deployed Rust behavior.

## technique 3: force effort onto novel steps

What it is and when to use it. Models often write “clearly” around the hardest argument while expanding routine lemmas. QED requires every nontrivial original step to be enclosed in `<key-original-step>` tags and written with every bound, case, and sub-step. The paper says tagged content must be “maximally detailed” (Section 4.4, p. 6).

How to do it. (1) During planning, mark each claim's difficulty and whether it is a key step. (2) In proof generation, wrap each novel step in the tags. (3) The detailed verifier checks that every tagged step is genuinely nontrivial and detailed, that no nontrivial step is untagged, and that tags are not inflated around routine work (Section 4.3, p. 6). (4) If the hard upper bound is only a sketch, reject and revise. The probability ablation reports that removing tags yielded an easy lower bound but left the harder upper bound as a sketch (Section 6, p. 8).

Verus form. Inference: mark the corresponding Rust proof obligations with named `proof fn` lemmas and explicit `assert` steps. A loop uses a loop invariant in the `while` syntax; the invariant is a clause, not an `invariant(...)` call. Difficult arithmetic can be isolated in a lemma with `requires` and `ensures`, while executable code remains unchanged. Verus does not carry XML tags into checking, so the tags are an agent-output discipline that must compile into actual proof obligations.

Evidence and limits. The paper's evidence is qualitative ablation on two probability cases, The paper says this was a targeted qualitative ablation rather than a success-rate estimate (Section 6, p. 8). Inference: tags focus review but cannot force a truthful claim that a step is original; a solver or expert must still check it.

## technique 4: decomposition with a retry hierarchy

What it is and when to use it. For hard problems, planning is separated from execution. A decomposer emits a YAML plan containing precise quantitative claims, dependencies, difficulty, key-step flags, citations, and self-critique. A single prover follows that plan; a regulator classifies failures as proof-execution, plan, or strategy failures. The paper describes the plan as “a directed acyclic graph (DAG) of intermediate mathematical claims with explicit dependencies” (Section 4.2, p. 5).

How to do it. (1) Generate the DAG/YAML plan. (2) Prove all nodes in dependency order. (3) Run structural phases 1–5 and detailed phase 6. (4) If execution is wrong but the plan is sound, revise only the proof. (5) If the plan has structural gaps, revise the plan and re-prove. (6) If the strategy is fundamentally flawed, rewrite with a new decomposition. (7) Bound attempts (the paper's example is three proof attempts per plan revision, two revisions per decomposition, three decompositions) to avoid infinite loops (Table 1, p. 5).

Verus form. Inference: map DAG nodes to lemmas and functions: each node is a `proof fn` with contracts, and dependencies are lemma calls. Keep executable functions separate from proof functions; use `requires`, `ensures`, `assert`, `reveal`, and loop invariants supported by Verus. A failed proof obligation should trigger repair at the lemma or contract level, while a wrong decomposition corresponds to revising the specification architecture. Verus does not provide QED's YAML regulator automatically.

Evidence and limits. Neither of two probability problems was solved in simple mode; decomposition mode produced accepted 20-page and 15-page proofs, while simple-mode manuscripts were at most ten pages (Section 6, p. 8). Length is not a correctness metric, and the comparison is targeted rather than randomized. Inference: decomposition may reduce plan thrashing in VL but can increase token, solver, and review costs.

## technique 5: staged structural then detailed verification

What it is and when to use it. QED checks cheap foundations before expensive step-by-step reasoning. Structural phases check statement integrity, completeness/originality, citations, subgoal-tree shape, and human rules. Only if all pass does detailed verification check each assertion and computation. The paper says, “Phase 6 runs only if Phases 1–5 pass” (Section 4.3, p. 6).

How to do it. (1) Compare the proof's claim word-for-word with the original statement; changed quantifiers, hypotheses, domains, or conclusions fail automatically. (2) Check that all parts are addressed and the proof is not a sketch. (3) Check each citation as above. (4) Validate a rooted, acyclic subgoal tree with no orphan and every cited condition represented. (5) Apply human-specified rules. (6) For each assertion, state the claim, quote justification, list dependencies, check validity and computations, and assign Pass/Fail/Uncertain (Section 4.3, p. 6).

Verus form. Inference: use a two-level VL workflow: first compile and verify contracts, type/ownership constraints, and specification alignment; then discharge detailed lemmas and loop invariants. A Verus `ensures` clause checks postconditions, while `assert` and `proof fn` steps expose detailed obligations. The resulting proof is checked by Verus's solver-backed verifier, but assumptions about external bodies still need explicit trusted boundaries.

Evidence and limits. The paper's false-positive observation was 0/17 accepted candidates for one Codex verifier configuration, not 0/214 total candidates (Section 5.2, p. 8). Expert review is the independent oracle. Inference: staged checking is a practical cost filter for agent-written Verus, but acceptance of a natural-language proof cannot substitute for compiling and verifying the Rust artifact.

## what VL should reuse and avoid

Already done in QED: role separation, retry classification, citation checks, problem-integrity checks, key-step forcing, multi-model parallel proving, automatic resume, and standalone difficulty-adaptive verification. VL should not redo these as claims of novelty. Inference: a product can reuse the orchestration patterns while contributing Rust/Verus-specific measurements, such as proof repair time, solver failures, and trusted dependency boundaries.

The main product threat is inference: QED demonstrates that agent systems can produce persuasive, expert-accepted mathematics for selected open problems, so prose-level confidence is not a differentiator. It does not demonstrate automatic verification of arbitrary Rust, memory safety, concurrency, or deployment behavior. Its five successes came from 18 cases, and unsuccessful cases include difficult probability, operator-algebra, and dynamics problems (Appendix B, pp. 14–15). The product risk is therefore overclaiming: an agent may produce a plausible proof or even pass a language-model verifier while the Rust specification is wrong, incomplete, or disconnected from runtime assumptions.

## techniques for the catalog

- failure-mode-driven multi-agent proof pipeline — map observed model failures to separate planning, proving, verification, selection, and verdict components

- independent prover/verifier contexts — check a saved proof in fresh calls that receive only the original statement and proof

- exact citation verification — require verbatim theorem statements, source metadata, URL resolution, and hypothesis matching

- key-original-step tagging — force detailed treatment of every nontrivial novel step and reject vague or untagged reasoning

- decomposition DAG and retry hierarchy — revise proof, plan, or strategy according to classified verification failures

- staged structural/detailed verification — reject statement, citation, completeness, or subgoal-tree errors before expensive step checking
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
