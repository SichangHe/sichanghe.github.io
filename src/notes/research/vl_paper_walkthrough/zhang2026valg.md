# VALG: An Agentic System for ML Theory Research and Demonstrations on COLT 2026 Open Problems
(authored by agents unless marked 🧑)
Tag: `zhang2026valg`, [paper](https://www.semanticscholar.org/paper/b268734047b501f55518ec58c5f3118420cf2fb5)

## scope and evidence

VALG treats machine-learning theory as joint development of a problem setup, theorem target, and proof. Its distinctive object is a source-relative theorem branch: each branch fixes one mathematical specification, records assumptions and quantifiers, and develops a typed dependency graph from primitive assumptions to a target theorem. The abstract states: “When a proof attempt fails, VALG identifies whether the obstruction lies in a derivation, the proof structure, or the theorem formulation and routes the next attempt accordingly.” (§Abstract, p.1)

The system has two workflows. Workflow 1 surveys literature, selects up to three broad perspectives, generates narrower ideas, and formalizes each surviving idea into exactly one goal. Workflow 2 proves that fixed contract through sketch, global diagnostic, local steps, assembly, and specialized reviews. The paper evaluates nine subproblems from five COLT 2026 open-problem papers. It reports 22 internally finalized theorem candidates: two runs match the source scope and seven produce restricted, special-case, or conditional results. (§1, pp.2–3; §4, p.12) The denominator is nine subproblems, not 22 candidates.

Inference: VALG's most transferable lesson for VeruLaw is to make specification drift explicit before proof generation. It does not produce Verus or Lean kernel-checked proofs in this paper; finalized candidates were independently reviewed by language models and “roughly audited by human” (§4, p.12). Therefore the numerical outcomes measure theorem-development discipline, not formal-verifier soundness.

## technique 1: source-relative formulation before proof

What it is. Workflow 1 separates broad research direction from a concrete theorem contract. A perspective is represented by `(analysis target, model class, data assumption, regime, algorithm)`. An idea may specialize a perspective field but may not broaden or contradict it. The formalizer then fixes notation, primitive assumptions, quantifiers, regime, and exactly one goal. (§3.1, pp.6–8)

When to use it. Use this when the original question leaves model, data, algorithm, or asymptotic regime open. It prevents a proof of a narrower statement from being reported as a solution to the source problem.

Steps from the paper.
1. Map settings, results, proof techniques, and evidence-supported gaps; separate direct theory, foundational frameworks, and empirical practice. (§3.1, p.6)
2. Select a small set of distinct, gap-grounded perspectives in parallel. (§3.1, p.6)
3. Generate a concrete mechanism and candidate result within each perspective; reject unsupported duplicates. (§3.1, p.7)
4. Formalize one viable idea into fixed notation, assumptions, quantifiers, regime, and one goal. (§3.1, p.8)
5. In interactive mode, obtain a human checkpoint after each stage; only a checked branch enters proof development. (§3.1, p.8)

Verus form. Inference: encode the branch contract as a module-level specification. Use `requires` for primitive assumptions and `ensures` for the single target; keep variant contracts in separate modules so a proof cannot silently weaken the source target.

```rust
fn candidate(input: Input) -> (out: Output)
    requires source_assumptions(input)
    ensures source_goal(input, out)
{ /* executable algorithm */ }
```

Inference: `source_assumptions` and `source_goal` would be `spec fn`s or predicates over mathematical ghost values. A relaxed branch needs a distinct function or module with a visibly different predicate; Verus has no automatic notion of “source-relative” scientific scope.

Evidence and limits. Table 1 assigns progress `P = min{C+B+H, applicable cap}` in [0,10], where a hard cap applies when a central quantifier, regime, or rate is missing. (§4, p.12) The paper gives examples: `P ≤ 3` when a theorem assumes a central unresolved property and `P ≤ 7` when it omits a central quantifier, regime, or rate. (§4, p.12) Inference: this cap is a useful audit invariant, but the score is an LLM assessment rather than a proof. The main failure risk for VL is proving a correct contract that omits a product requirement; separating branch contracts makes that omission visible but does not detect it automatically.

## technique 2: typed proof-dependency DAG and global diagnostic

What it is. A proof sketch is a directed acyclic graph whose source nodes are primitive assumptions, internal nodes are lemma-sized claims, and the unique sink is the theorem. Each node stores its claim, dependencies, permitted assumptions, intended proof tool, and output interface. (§3.2.1, p.8) The paper explains why graph shape alone is insufficient: “a structurally coherent dependency graph does not guarantee that every node is derivable from its assigned inputs.” (§3.2, p.8)

When to use it. Use a DAG when a theorem has many interacting lemmas, rates, probability modes, or representation changes. Run a theorem-level diagnostic before paying for local proofs; it catches an upstream guarantee that is too weak or about the wrong object.

Steps from the paper.
1. Sketch the acyclic graph with stable lemma-sized obligations and legal earlier dependencies. (§3.2.1, p.8–9)
2. Expand it into a global proof: trace inputs, establishing mechanisms, output form and strength, quantitative dependence, probability/convergence modes, object compatibility, closure, and boundaries. (§3.2.1, p.8)
3. Reject or revise the graph if a downstream obligation cannot consume an upstream result; specify admissible inputs and required outputs. (§3.2.1, p.8)
4. Pass each accepted obligation to a step worker in dependency order. (§3.2.1, p.8)

Verus form. Inference: model each graph node as a `proof fn` whose `requires` are the predecessor facts and whose `ensures` is the node claim. A global diagnostic can be a proof function that checks interface predicates before local proofs are attempted.

```rust
proof fn lemma_b(x: X)
    requires lemma_a_fact(x)
    ensures lemma_b_fact(x)
{ /* proof */ }
```

Inference: Verus does not accept a run-time graph object as a proof; the DAG must be reflected in Rust function contracts and call order. Loop invariants belong on executable loops that implement an algorithm; they do not replace theorem-node contracts.

Evidence and limits. VALG's case-study table reports two of nine subproblems with exact source-scope matches and seven partial outcomes. (§Abstract, p.1; §4, p.12) The paper's own reason for adding the global stage was that a coherent graph could still fail theorem-level composability. (§3.2, p.8) Inference: a DAG helps expose missing interfaces before solver time, but it can preserve a wrong lemma if the node's statement is itself false or the assumptions are too strong.

## technique 3: split proof production and independent multi-angle review

What it is. VALG decomposes proof work into sketch, global proof, individual steps, and assembly. Different reviewers inspect each artifact against a fixed contract. The abstract says: “Within each source-relative theorem branch, VALG maintains a fixed mathematical specification, checks the theorem-level composition of a typed proof-dependency graph, and constructs and reviews local proofs in dependency order.” (§Abstract, p.1)

When to use it. Use this when monolithic generation produces compact arguments that are hard to audit. Separate producer and reviewer roles so a generator cannot validate its own derivation.

Steps from the paper.
1. A sketch reviewer checks goal fidelity, graph coverage, provenance, interfaces, and viability gates. (§3.2.2, p.9)
2. A global reviewer checks quantitative dependence, convergence, object compatibility, and closure. (§3.2.1–3.2.2, pp.8–9)
3. A step worker proves one obligation without strengthening assumptions or weakening output; a fresh step reviewer audits every local lemma and hidden claim. (§3.2.1–3.2.2, p.9)
4. An assembler composes accepted steps into a self-contained manuscript. (§3.2.1, p.8)
5. Structural, rigor, citation, and adversarial reviewers inspect assembly; an aggregate reviewer returns the controller-facing verdict. (§3.2.2, pp.9–10)
6. Accept only with score at least seven and no blockers; otherwise route a scoped repair. (Figure 1, p.7; §4, p.12)

Verus form. Inference: let Verus be the final executable proof gate and keep human/agent reviews as pre-gates. Each reviewed lemma becomes a contract checked by the Verus verifier. Use `assert` and `reveal` only where needed to expose definitions; do not treat a reviewer score as evidence of a Verus proof.

Evidence and limits. VALG reports final scores using progress, soundness, and novelty, with soundness `S = min{M,D,A}` for intrinsic validity, theorem-critical dependency verification, and audit completeness. (§4, p.12) The seven partial results show that review distinguishes useful restricted theorems from source-scope solutions. Inference: because the paper uses independent LLM reviews and a rough human audit rather than a proof assistant, its “soundness” remains a process metric. The product threat is correlated reviewer error: several reviewers can share the same false mathematical premise.

## technique 4: diagnosis-routed minimal repair

What it is. A failed attempt is classified as a local derivation flaw, dependency/interface flaw, proof-architecture flaw, or theorem-formulation flaw. The controller routes only the smallest affected object to the responsible producer. The paper states: “In every case, the failed review identifies the smallest repair target, the controller selects the responsible stage subject to its retry budget, and the selected producer uses the accepted upstream context, the failed attempt, and the validated diagnosis to change only the implicated part.” (§3.3, p.11)

When to use it. Use this when repeated retries otherwise rewrite a whole proof and accidentally change the theorem. It is especially useful when a real obstruction requires a related relaxation.

Steps from the paper.
1. Attempt one stage against its target and accepted inputs. (§3.3, Figure 2, p.11)
2. Have two independent reviewers diagnose failure type and smallest repair target. (§3.3, p.11)
3. Let the controller validate the diagnosis and route one scoped retry; if a budget is exhausted, escalate to a higher stage. (§3.3, p.11)
4. Re-review the revised artifact before downstream use. (§3.3, p.11)
5. Create a new source-related idea only for a formulation-level obstruction; preserve the relation to the source problem. (§3.3, pp.10–11)

Verus form. Inference: represent repair levels as an enum in orchestration code and retain the old contract as an immutable specification. A repaired proof must still satisfy the same `ensures`; a formulation repair creates a new predicate and requires a separate scope report. Verus can verify transition invariants for this controller but cannot decide whether a relaxation is scientifically acceptable.

Evidence and limits. The paper records exhausted and interrupted branches in Table 1 rather than counting them as solved; “Exhausted indicates that the branch consumed its configured idea-variant budget without finalizing a theory.” (Table 1 caption, p.13) This prevents a failed search from becoming a false theorem. Inference: retry budgets bound cost, but the paper does not report repair-time distributions or compare minimal routing against whole-proof regeneration. A VL implementation should measure proof repair time, changed contract lines, and verifier regressions.

## what is proved, measured, and trusted

The paper measures candidate counts, source-scope progress, mathematical-soundness and novelty scores, branch elapsed hours, ideas tried, and outcomes across nine subproblems. It presents theorem statements and derivations, but no machine-checked Lean or Verus artifact is the acceptance criterion. Trusted components include literature summaries, model reasoning, reviewer prompts, human audits, cited theorem correctness, and the scoring rubric. Inference: product-level verified Rust still trusts the specification, Verus verifier and solver, compiler, libraries, and environment; VALG mainly reduces specification drift and proof-process confusion.

## what VL should reuse and avoid repeating

Inference: VL should reuse source-relative contracts, typed lemma DAGs, theorem-level interface diagnostics, split proof production, independent adversarial review, and diagnosis-routed repairs. Inference: it should not claim a formal-verification capability from VALG's LLM-reviewed results or repeat its open-problem case-study inventory. The missing VL experiment is a benchmark where each branch emits a Verus contract, proof DAG, executable Rust, and verifier log; report denominators separately for source-scope proofs, restricted proofs, failed attempts, specification changes, and repair cost.

## techniques for the catalog

- source-relative theorem contracts — freeze assumptions, quantifiers, regime, and one target before proof work, while recording relaxations as new branches
- typed proof-dependency DAGs — represent assumptions and lemma interfaces as an acyclic graph and run a whole-theorem composability diagnostic
- split proof and independent review — generate sketch, global proof, local steps, and assembly with stage-specific reviewers
- diagnosis-routed minimal repair — classify failure level, retry only the implicated artifact, and create a related variant only for formulation obstructions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
