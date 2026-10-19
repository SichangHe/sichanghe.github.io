# Clarifying Before Reasoning: A Coq Prover with Structural Context
(authored by agents unless marked 🧑)
Tag: `lu2025clarifying`, [paper](http://arxiv.org/abs/2507.02541v1)

## scope and result
This paper argues that LLM theorem-proving failures often come from not understanding overloaded Coq syntax and hidden type information. It extracts compiler and kernel context, presents that context in structured prompts, and searches with a Planner-Executor architecture. Its full system reaches 45.8% on a dataset described as containing 1,300 Coq theorems in §7.2.1, versus 21.8% for its DeepSeek-V3 baseline and 33.2% for Graph2Tac (Table 2, §7.2.2, p. 16). The benchmark is a 10% sample of Graph2Tac’s test set spanning 15 Coq packages (§7.2.1, p. 16). The abstract instead says “1,386 theorems randomly sampled from 15 standard Coq packages” (p. 1); the paper does not reconcile these counts. These are Coq results and do not measure Verus.

## technique: semantic context extraction

what it is and when to use it

The pipeline intercepts Coq compilation and exposes information that source files leave implicit. The paper summarizes the problem: “A term like a + b could represent natural number addition, list concatenation, or boolean operations depending on context” (§5.1, p. 9). Inference: use extraction when overloaded names, implicit arguments, aliases, or notation make model-generated tactics ambiguous.

how to apply it

1. Compile the theorem and intercept the proof state plus the compiler’s internal representation (§5.2, p. 9).
2. Extract each referenced entity as `(n, c, o, i)`: fully qualified name, entity category, source text, and internal type representation after Coq’s type inference (Definition 1, p. 6; §5.2, p. 9). Appendix A.1 describes intercepting elaborated terms at `typed_constr` and extracting names and categories during vernacular command processing (p. 22).
3. Extract complete proof-state transitions, including goals and hypotheses in surface and internal forms (§5.2, p. 9; Definition 3).
4. Apply the domain-specific tokenizer so aliases and context-dependent references map to stable semantic identifiers (§5.2, p. 9; Definition 4).
5. Build a prompt containing the current state, for each entity its origin/internal/intuition fields, module imports, notation definitions, and available theorems (§5.3, p. 10).

The authors identify four effects: notation is mapped to underlying functions, complete types expose implicit instantiation, unique identifiers resolve namespace ambiguity, and internal proof states show the logical context (§5.2, p. 9). Their clarity evaluation samples up to three definitions from each of 1,000 structured prompts and asks a judge to assess whether a generated definition is semantically correct (§7.1.1, p. 14). The clarity score is `exp(log P(YES))/(exp(log P(YES))+exp(log P(NO)))`, judged by DeepSeek-V3 (§4.2, p. 8). No-context clarity is 0.445; complete information is 0.823 (Table 1, p. 15). Inference: this is a 37.8-percentage-point increase, about 85% relative or 1.85×, consistent with the abstract but not the introduction’s “2.5×” (p. 2). The paper also calls the increase from 61.5% to 79.8% “an 18.8% absolute gain” (§7.1.3, p. 15). Inference: those table values differ by 18.3 percentage points.

Verus form (Inference:)

For a Rust/Verus proof state, serialize fully qualified function and type names, imported modules, resolved trait methods, `requires`/`ensures`, loop invariants, and the current verifier diagnostic. Preserve both source-level Rust and the semantic form used by Verus/Z3 where available. Verus does not expose Coq’s `Definition 1` tuple or this tokenizer, so these are an external adapter; do not claim that a generated explanation is a verifier fact.

limits

The clarity judge is itself a model, and the paper does not establish that its YES/NO probabilities are calibrated (§4.2, p. 8). Inference: a high clarity score is a comprehension proxy, not a proof of correct Rust or a substitute for Verus. Extraction depends on compiler instrumentation (Appendix A, pp. 22–24); its cost for large contexts is not measured here.

## technique: Planner-Executor proof search

what it is and when to use it

The Planner consumes structured context and produces strategy; the Executor emits concrete tactics. The paper describes the separation: “The Planner analyzes this structured data to generate strategic guidance, which the Executor then uses—alongside the same structured data—to produce concrete tactics.” (§6.1, p. 10). Inference: use it when a single model call mixes high-level proof planning with syntax-level tactic selection.

how to apply it

1. Initialize a beam with the compiled theorem state, empty trace, summary, and public notes (Algorithm 1, lines 1–3, p. 12).
2. For each state, extract concepts at depth one and ask the Planner for concepts, applicable theorems, proof techniques, relationships, and a strategic summary (§6.1, p. 10; Algorithm 1, lines 7–11, p. 12).
3. Retrieve premises and tactics using the Planner response (Algorithm 1, line 13, p. 12).
4. Ask the Executor for 10 tactic candidates with the structured state and strategy, then compile each candidate (Algorithm 1, lines 14–27, p. 12; Appendix C, p. 26, asks for up to 10).
5. On failures, collect compiler errors, regenerate strategy and retrieval, and retry while the retry count is below `R`, failures remain, and at most 10 valid tactics have accumulated (Algorithm 1, lines 28–47, pp. 12–13).
6. Apply valid tactics, record explanations and summaries, update the public notebook (maximum 15 items), and retain the best `B=3` states (§6.2–6.3, pp. 11–13).
7. Return when a branch discharges all goals; fail if no successors remain or after depth `D=15` (Algorithm 1, lines 48–78, p. 13; §7.2.1, p. 16).

The paper states a maximum budget of 860 tactic evaluations: `1×10×2 + 14×3×10×2 = 860` (§7.2.1, p. 16). Its retry setting is inconsistent: “Maximum retries R = 3 (one retry with error feedback)” (§7.2.1, p. 16). Inference: the budget’s factor of two allows an initial batch plus one retry per state, whereas Algorithm 1 permits up to `R` retries; 860 is not a derived bound for `R=3`. The full system averages 357 tactics and depth 2.7, versus 485 tactics and depth 3.2 for the DeepSeek-V3 baseline (Table 2, p. 16).

Verus form (Inference:)

Use a planner to propose which contract consequence, invariant, or lemma to establish, then an executor to emit Verus proof code. Compile every candidate with Verus and keep a beam of proof states represented by the current Rust source plus verifier facts. Use `assert`, `requires`, `ensures`, and ordinary proof functions only in forms supported by the local Verus guide. A public notebook can store verified lemmas and diagnostic summaries, but cached text must be rechecked after dependency or specification changes.

limits and evidence

The main comparison uses the dataset described as 1,300 theorems, while the clarity-performance correlation uses a random 100-theorem subset (§7.2.3, p. 17). Table 3 reports clarity 0.445→0.823 and success 21%→45% across five configurations; the accompanying text reports `r=0.98`. Inference: this correlation does not establish that every clarity improvement causes higher success. Verus evaluation should use held-out projects and report task denominators rather than extrapolating from this correlation.

## technique: retrieval, error reflection, and persistent proof memory

The search adds three operational aids. Retrieval uses strategic analysis to find semantically similar premises and tactics; error reflection feeds compiler errors into a new strategy; and a fixed-size public notebook retains up to 15 insights (§6.2, p. 11). The information ablation, described as using 1,386 theorems sampled from the Coq Standard Library, reports 37.2% with state/entities/internal representations, 42.6% after retrieved premises/tactics, 46.8% after proof trace, and 48.6% after the notebook (§7.4 and Table 6, p. 18). On the separate 78-theorem Ceres set, Table 8 reports 35.1% with zero retries and shortest-state selection, 40.3% with three retries and shortest-state selection, and 44.2% with one retry and model-based selection (p. 19). The authors write, “A single retry with error feedback provides optimal performance, while excessive retries hurt due to search space explosion.” (§7.4, p. 19). Inference: Table 8 changes both retry count and selection method, so it does not isolate the effect of one versus three retries.

Verus form (Inference:)

Index local Verus specifications and proven lemmas by fully qualified Rust names and normalized contract predicates. Feed exact verifier errors into the next planner prompt. Store only notes whose associated proof still verifies; invalidate them when signatures, dependencies, or contracts change. Bound retries because extra candidates can increase solver load without adding useful coverage.

## what is proved, measured, and trusted

Coq checks candidate tactics, and search succeeds when no goals remain (Algorithm 1, pp. 12–13). The paper measures clarity scores, success rates, depth, tactic counts, and component ablations (§7, pp. 14–19). The clarity metric relies on DeepSeek-V3 as judge (§4.2, p. 8).

## techniques for the catalog

- semantic context extraction — expose compiler-resolved names, types, definitions, and proof states in model prompts
- planner-executor search — separate strategic proof planning from tactic generation while sharing structured context
- bounded beam search — compile multiple candidates, retain the best fixed-width states, and stop at depth/retry limits
- retrieval and error reflection — retrieve premises from the strategy and regenerate candidates using compiler errors
- public proof notebook — retain a bounded cache of insights from successful steps; maintain tactic traces and proof summaries alongside it
