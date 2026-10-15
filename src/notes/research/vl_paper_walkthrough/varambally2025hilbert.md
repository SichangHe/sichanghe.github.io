# Hilbert: Recursively Building Formal Proofs with Informal Reasoning
(authored by agents unless marked 🧑)
Tag: `varambally2025hilbert`, [paper](https://doi.org/10.48550/arxiv.2509.22819)

## scope and result

Inference: This paper presents a Lean 4 proof agent whose useful design pattern for verified Rust is a checked, recursive pipeline: generate an informal plan, turn it into checked subgoals, try a specialized prover, repair with verifier errors, and split failures again. The experiments are mathematical, so transfer to Verus is an inference rather than a paper result.

The abstract states the system's purpose: “We introduce H ILBERT, an agentic framework that bridges this gap by combining the complementary strengths of informal reasoning and formal verification.” It says the four components are “an informal LLM that excels at mathematical reasoning, a specialized prover LLM optimized for Lean 4 tactics, a formal verifier, and a semantic theorem retriever.” The same abstract reports “H ILBERT achieves the strongest known result from a publicly available model on PutnamBench. It solves 462/660 problems (70.0%).”

Inference: The proved object is the Lean theorem supplied by a human, not the semantic adequacy of that statement or a Rust program. The trusted execution chain includes Lean v4.15.0, Mathlib v4.15.0, the Kimina Lean Server, the generated theorem statement, and the verifier; the LLMs propose text but Lean accepts or rejects it.

## technique 1: retrieve lemmas before planning

Use this when a target theorem may be solved by existing library lemmas and theorem names are difficult for a model to recall. The paper's implementation uses sentence-transformer embeddings (`all-mpnet-base-v2`) and FAISS over informal descriptions from `mathlib_informal` (section 3.1, page 4).

The paper's steps are:

1. Ask the reasoner for five search queries for the formal statement.
2. For each query, retrieve the five most semantically similar Mathlib theorems or tactics.
3. Ask the reasoner to select relevant results (section 3.2.1, page 5).
4. Re-run retrieval with missing identifiers when verifier errors identify absent theorem names (Algorithm 8, page 22).

The paper specifies: “For each search query, we use the Retriever to retrieve the top m = 5 most semantically similar theorems and tactics from Mathlib.” It also says retrieval “providing a simple yet effective alternative to custom retrieval models.”

Inference: In Verus, index `spec fn`, lemmas, datatype invariants, and library contracts by their natural-language descriptions. Query generation can precede a `proof fn`; selected facts can be passed in the proof context. Verus syntax and solver behavior differ from Lean, so the embedding index and prompt must be rebuilt for Verus APIs.

Evidence: In the retrieval ablation on MiniF2F, the Gemini 2.5 Pro plus Goedel-Prover-V2-32B configuration reached 99.2% with retrieval and 97.9% without; samples requiring decomposition averaged 548 versus 862 reasoner calls and 2.3M versus 4.0M reasoner tokens (Table 3, page 8). The denominators are the 244 MiniF2F test problems for pass rates and decomposition samples for call/token averages.

## technique 2: make a checked sketch with `have` subgoals

Use this when a direct formal proof attempt fails and the theorem is too large for one proof generation call. The paper's four decomposition steps are:

1. Retrieve and select supporting theorems.
2. Have the reasoner write an informal proof, then a Lean 4 sketch whose intermediate claims are `have` statements containing `sorry` placeholders.
3. Extract every `have` statement as an independent theorem with the needed context, syntax-check each, and add missing extractions if the count does not match.
4. Replace each `sorry` with a call to its corresponding subgoal theorem and verify the assembled proof (section 3.2.1, pages 5–6; Figure 2, page 5).

The paper says: “All subgoals are initially filled with sorry, a placeholder keyword that Lean can temporarily treat as a proof of the subgoal.” It further says extraction “enables us to prune irrelevant premises from the theorem statement of the subgoal.”

Inference: In Verus, write a top-level `proof fn` with intermediate `assert` or lemma calls and separate each claim into a `proof fn` or `lemma` whose `requires` and `ensures` state the needed context. Verus does not use Lean's `sorry` as an accepted proof workflow; placeholders must be removed before a successful verification run. The assembly operation is ordinary Rust/Verus lemma calls, while the verifier checks the combined postconditions.

Evidence: Algorithm 3 validates each extracted subgoal with the prover first, records proved subgoals, and rejects the sketch when the reasoner judges an unprovable or malformed subgoal incorrect (page 17). This catches missing hypotheses and natural-number truncation, which the paper names as common failure modes (section 3.2.2, page 6).

## technique 3: staged subgoal resolution and recursive decomposition

Use this when a checked sketch contains claims that a direct prover cannot close. For every remaining subgoal, the paper orders work as follows:

1. Generate four prover candidates and accept the first proof that the verifier accepts.
2. If those fail, ask the reasoner whether the subgoal is mathematically correct and well formulated; return to sketch refinement if it is wrong.
3. For a correct subgoal, retrieve lemmas and ask the reasoner for a short proof, correcting it with verifier errors for up to six passes. Abandon an incorrect proof after it exceeds 30 lines.
4. If shallow solving fails, recursively decompose the subgoal until depth `D`; the experiments set `D = 5` (section 3.2.2, page 6; Algorithms 1–2, pages 15–16).
5. Concatenate all accepted subgoal proofs with the assembled outline; any unresolved subgoal fails the theorem attempt.

The paper states: “If both strategies fail, it resorts to recursive decomposition until all subgoals are resolved.” It also states that “We prioritize direct Prover attempts over Reasoner verification because the Prover models are computationally cheaper.”

Inference: A Verus implementation can use the same policy around `verus` runs: first ask a code-oriented prover for a lemma, then use an LLM to classify a failed obligation and propose a short repair, then split the obligation into lemmas. The 30-line cutoff is a paper heuristic, not a Verus requirement; Verus proof length and solver cost need calibration.

Evidence: On MiniF2F test (244 problems), Gemini 2.5 Pro plus Goedel-Prover-V2-32B passed 99.2%, failing two problems (Table 1 and section 4.1, pages 7–8). The no-decomposition baseline at depth 0 was 75%; the full system reached 98.36% at depth 2 and 98.7% at depth 3 (Figure 4, page 10). On the September 2025 PutnamBench set (660 problems), the same configuration solved 462/660, 70.0%; the open `gpt-oss-120b` reasoner solved 88/660, 13.3% (Table 2, page 7).

## technique 4: verifier-directed repair

Use this whenever Lean rejects a sketch, extracted theorem, or assembled proof. The paper's repair loop compiles the candidate, gives the error message to the reasoner, optionally augments the theorem list for missing identifiers, regenerates the candidate, and recompiles. Sketch correction allows four theorem-correction attempts; shallow proofs allow six correction passes; assembly also retries up to the theorem-correction bound (Algorithms 3–7, pages 17–21).

The paper says: “Throughout the process, H ILBERT leverages the reasoner to interpret compilation errors, suggest corrections, and guide proof refinement at inference-time.” Algorithm 4 defines `VERIFY PROOF(header + sketch)` and feeds `error_message` to `CORRECT SKETCH ERROR`.

Inference: For Verus, preserve the compiler or verifier error verbatim in the next prompt, then ask for one local edit and rerun `verus`. Error text is evidence about the current obligation, not a proof of a proposed repair; only a successful verifier result should mark the lemma complete.

## what is proved, measured, and trusted

The verifier proves acceptance of Lean terms under the supplied Mathlib environment. The measured outcomes are pass rates, calls, tokens, and proof lengths. Figure 3 reports that the hardest MiniF2F samples used 22.8M tokens with Gemini 2.5 Pro plus Goedel-Prover-V2-32B and 27.0M with DeepSeek-Prover-V2-7B; these are per-sample maxima, not averages (section 4.2, page 9). Average proof lengths are 247 lines on MiniF2F and 1,454 on PutnamBench (Appendix A.8, page 23).

Inference: The results do not establish that recursive decomposition works for systems specifications, unsafe Rust, concurrency, or Verus. They do show a high-threat capability for agent-written verified Rust: an agent can spend large adaptive budgets generating and repairing many small proof obligations while a sound checker filters the output. The main product risks are incorrect specifications, missing preconditions, solver or library assumptions, and compute cost; Hilbert's reasoner can declare a subgoal correct, but that declaration is not trusted once Lean rejects the proof.

The paper's own boundary is explicit: “Given a formal statement in Lean 4,” it generates a proof for that statement. Inference: VL should reuse the staged architecture and verifier feedback, while independently specifying Rust behavior, ownership, concurrency, external-library contracts, and the environmental assumptions that Verus leaves outside a proof.

## what VL should not redo

Inference: VL should not repeat the paper's already demonstrated math-agent pattern: theorem retrieval, `have`/`sorry` decomposition, prover fallback, shallow repair, recursive splitting, and checker acceptance are established for Lean benchmarks. New VL work should measure whether analogous stages reduce proof effort or defect rates on real Rust APIs and Verus specifications, including dependency upgrades and concurrency.

## techniques for the catalog

- semantic theorem retrieval: generate several queries, retrieve top-k library facts, and select the useful lemmas before proof generation
- checked proof sketches: express intermediate claims as independently syntax-checked subgoals, then assemble calls to their proofs
- staged recursive solving: try a specialized prover, validate the subgoal, shallow-solve with retrieved facts, and recursively split failures to a depth bound
- verifier-directed repair: feed compiler errors back to the reasoner, augment missing theorem identifiers, and accept only a checker-verified candidate
Checked 2026-10-15 against paper varambally2025hilbert: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
