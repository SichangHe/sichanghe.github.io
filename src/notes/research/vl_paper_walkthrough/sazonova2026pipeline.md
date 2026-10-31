# Pipeline for Verifying LLM-Generated Mathematical Solutions
(authored by agents unless marked 🧑)
Tag: `sazonova2026pipeline`, [paper](https://www.semanticscholar.org/paper/003b17d830b4db683497aabbe1ad08d1d035b16c)

## aim and architecture

Sazonova et al. propose a pipeline that checks the reasoning in a natural-language LLM solution by translating and proving its steps in Lean 4. The paper's central claim is procedural: “The key idea is the use of prompts to obtain the solution in the specific form which allows for easier verification using proof assistants and possible use of small models (≤ 8B)” (Abstract, p. 1). The pipeline has automatic and interactive modes and three roles: Solver LLM produces the solution, Translator LLM formalizes it, and Prover LLM proves facts and lemmas (Sections 1 and 3.2, pp. 1, 3).

The target representation is a chain of lemmas. Each lemma has premises and one conclusion; premises are problem assumptions, earlier conclusions, or easy facts. A conclusion cannot contain conjunction or an if-then-else compound. The paper says, “Each logical step must have only one statement in the conclusion (without ∧ or ‘if else’ construction)” (Section 3.1, p. 2). This shape gives an explicit dependency graph and avoids accepting a correct final answer whose explanation is unsound.

## technique 1: structured solution prompting

When to use it. Use this front end when the input is an informal mathematical solution and the goal is to check every reasoning step rather than only its answer. The paper's six-step algorithm begins by prompting the Solver LLM with the problem and the required structure (Section 3.3, p. 3).

Steps from the paper are: (1) ask for a chain of propositional lemmas; (2) require each premise to be either given, an earlier conclusion, or an easy fact; (3) require one conclusion per lemma; (4) require each lemma to be human-easy to formalize; and (5) reject or revise outputs that deviate substantially. Small deviations are normalized by the next script. A word problem may additionally require a fixed variable set and fixed types (Section 3.3, p. 4).

Verus form (

Failure and evidence. The authors say that severe structural deviation makes a problem unverifiable unless a new prompt is developed (Section 3.3, p. 4). They report that Qwen3-8B was the easiest public ≤8B Solver model to steer, but this is a model-selection observation, not a universal result (Section 3.2, p. 3).

## technique 2: normalize and extract facts

The second algorithm step runs a script over the structured output. It checks the form, removes tautologies, splits a conjunctive conclusion into two lemmas, rewrites statements likely to confuse the Translator, and extracts “facts” not present in the statement or previous lemmas (Section 3.3, p. 4). The paper describes the purpose precisely: “Firstly, the solution is checked to be of proper form (excluding the criterion about correctness of each lemma which will be checked on later steps) and rewritten for easier translation” (Section 3.3, p. 4).

Apply it by constructing a directed hypergraph: nodes are assumptions, facts and lemma conclusions; a lemma edge points from its premises to one conclusion. Remove syntactic tautologies, split conjunctions, then list every external fact for independent checking. Inference: this graph is a direct operational interpretation of the paper's “solution hypergraph” and is useful for Verus because each edge can become a proof function with explicit preconditions.

Verus form (Inference). Normalize into proof functions whose `requires` list names exactly the incoming nodes. Use `assert` to expose the normalized proposition and call lemmas only in proof context. A fact with no trusted derivation must be proved or explicitly marked as an assumption; do not use an unproved runtime function as evidence.

## technique 3: formalize and prove facts before lemmas

For each extracted fact, the Translator LLM emits Lean code. The Prover LLM then attempts a proof, adding earlier lemmas as context if the fact was rewritten non-obviously. In automatic mode a translation or proof that does not compile stops with a negative result. Interactive mode offers retry, correction, acceptance with `sorry`, continuation without the fact, or stopping (Section 3.3, pp. 4–5). The paper states, “Once the formalization has no errors, Prover LLM will try to prove it” (Section 3.3, p. 4).

Steps: (1) translate one fact; (2) compile it; (3) provide relevant prior context; (4) ask the prover for a proof; (5) compile the proof; (6) stop or request user intervention on failure. Inference: for a production verifier, the interactive `sorry` option should be treated as an explicit trusted assumption and excluded from an unconditional correctness result.

Verus form (Inference). Translate each fact to a `spec fn` proposition and prove it with a `proof fn` whose `ensures` states that proposition. Use `assert` or `assert ... by` for solver hints. Keep any `external_body` assumption outside the function claimed verified and label it as trusted input; the paper's Lean `sorry` is not a Verus proof.

## technique 4: translate, check, and prove lemmas

The fourth and fifth steps translate each lemma and the final theorem, then run a script checking that no important information was dropped or replaced, types are correct, and the original dependency structure remains (Section 3.3, pp. 4–5). The Prover LLM proves each lemma with earlier conclusions as context. The sixth step links all proved lemmas using a hypergraph path; the authors say this “comes down to finding the path in the hypergraph of the solution” and corresponds to Lean's `solve_by_elim` (Section 3.3, p. 5).

Apply it by checking each translated lemma against its source sentence, compiling it in isolation, proving it, then searching backwards from the target to assumptions. The final report records source text, Lean code, proof status and errors. Verus form (Inference): use one proof function per edge, with `requires` for premises and `ensures` for the conclusion; a final proof function calls edges in dependency order. Verus's verifier checks the Rust specification, but a separate correspondence check is needed to ensure the generated claim still means the source sentence.

## technique 5: explicit variable introduction

Text problems often omit variable declarations or types. The authors therefore offer a prompt option that makes the Solver list every variable and type and use only those declarations. They caution that the best results combine runs with and without introduction (Section 3.4, p. 5). Use this option when a lemma such as `3 * x = 9 → x = 3` leaves the type of `x` ambiguous. Inference: explicit Rust types are even more important because a Verus arithmetic proof is sensitive to `int`, `nat`, bit vectors and machine integers.

## measurements, trust, and limits

The paper evaluates an “easy” set of 10 Math-500 problems and a “similar” set of 150, plus all Math-500 for precision (Section 4.2, p. 8). Automatic mode reports easy accuracy 0.840 ± 0.102, precision 0.822 ± 0.113 and recall 0.953 ± 0.058; similar accuracy 0.847 ± 0.016, precision 0.984 ± 0.008 and recall 0.609 ± 0.006; whole Math-500 precision 0.942 ± 0.008 (Section 4.3, p. 9). The denominators are the stated datasets; the paper does not give per-metric sample counts behind the intervals. Interactive mode can achieve 0 false negatives and 0 false positives conditional on user knowledge of Lean (Section 4.3, p. 9).

A comparison uses 200 solutions: 110 original (50 correct and well explained, 60 incorrect), plus 90 constructed cases. Qwen produced 85 false positives; the pipeline approved 43 correct solutions automatically, all 50 with user feedback, and evaluated all incorrect solutions as incorrect (Section 5.1, p. 9). The paper identifies false-positive risk for very easy problems where Lean can prove a theorem despite poor structure, and says it observed no wrong hard solution translated into a correct proof (Section 4.1, p. 8). The latter is an empirical non-observation, not a guarantee.

Lean's kernel and compiler checking remain trusted; Translator and Prover LLMs are untrusted generators. Interactive `sorry`, user-provided translations, and any accepted fact are trusted assumptions. The pipeline excludes all geometry in its current form, much higher mathematics lacking suitable Lean theorems, and solutions the Solver cannot structure (Section 4.2, p. 8).

## techniques for the catalog

- structured lemma prompting: require one-premise-chain conclusion per logical step so an informal proof can be translated and audited
- hypergraph normalization: split conjunctions, remove tautologies and encode lemma dependencies as a proof graph
- fact-first checking: formalize and prove every unstated fact before proving dependent lemmas
- translation fidelity checking: compare generated formal statements with source text and verify types and structure
- dependency linking: find a premise-to-target path and construct the final proof from verified lemma edges
- explicit variable typing: prompt for a fixed set of variables and types when text problems leave them implicit
