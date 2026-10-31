# Cumulative Reasoning with Large Language Models
(authored by agents unless marked 🧑)
Tag: `zhang2023cumulative`, [paper](https://arxiv.org/abs/2308.04371)

## what the paper proposes

Cumulative Reasoning (CR) decomposes a problem into small propositions, checks each proposition, and stores only checked propositions in a directed acyclic graph (DAG). Three roles operate over this graph: a Proposer suggests a step, Verifier(s) accept or reject it, and a Reporter decides when to synthesize an answer (Section 3, pp. 4–5). The paper says: “The specific contribution of each role is crucial: the Proposer explores, the Verifier ensures reliability, and the Reporter synthesizes, all operating on the shared, growing DAG of verified knowledge.” (Section 3, p. 4.)

The authors allow the Verifier to be an LLM, a symbolic reasoner, a theorem prover, or a code environment (Section 3, p. 4).

## technique 1: proposer–verifier–reporter loop over a verified DAG

What it is. CR maintains a history of validated nodes. The Proposer conditions on the current graph and proposes a new proposition; the Verifier checks it and either accepts it for addition or discards it; the Reporter reads the accumulated graph and emits the final solution once enough validated information exists (Section 3, pp. 4–5). A new proposition can depend on any combination of existing validated nodes (Figure 2, p. 5). The method states: “Only verified steps are added to the DAG.” (Section 3, p. 4.) The authors attribute avoidance of invalid paths to verification and prevention of logical loops to the DAG's acyclic structure (Section 3.1, pp. 5–6).

How to apply it.

1. Encode the problem premises as initial graph nodes (Figure 2, p. 5).
2. Ask a Proposer for one candidate proposition using the current validated nodes as context (Section 3, p. 4).
3. Send the candidate to a Verifier. Add it to the DAG only if the Verifier accepts it; otherwise discard it and propose again (Section 3, p. 4).
4. Allow later proposals to depend on any subset of validated nodes, retaining the complete history (Section 3.1, pp. 5–6).
5. Let the Reporter synthesize the answer once sufficient validated information exists (Section 3 and Figure 2, pp. 4–5).

Verus form. Inference: represent each node as a ghost/specification fact with a machine-checkable relation to its parent facts. A Proposer can write candidate assertions; the Verus verifier decides whether they follow from `requires`, `ensures`, invariants, and proof lemmas. Inference: persist accepted nodes as proof artifacts or a dependency graph, but do not treat an LLM acceptance as evidence. The final Reporter should serialize a checked value or postcondition result rather than inventing a new conclusion.

Evidence and limits. CR’s role separation is tested with same-model role prompts in most experiments, so role names do not imply independent trust (Section 4, p. 8). The paper itself notes that conditioning on more nodes increases context complexity, a trade-off managed by the iterative process (Section 3.1, p. 6). Inference: a large Verus proof graph can likewise make solver contexts expensive; graph retention needs measured limits.

## technique 2: formal arrival-probability comparison

What it is. The authors define arrival probability as the probability of reaching the correct conclusion from an initial state (Definition 3.1, pp. 6–7). For two reasoning stages, CR has `P_CR = p1_CR p2_CR`; the paper then refines both stage probabilities to condition on accumulated validated history (Section 3.1, p. 7). Under the assumptions described below, Theorem 3.4 gives `P_CoT-SC ≤ P_ToT ≤ P_CR` (p. 8). The assumption is explicit: “This assumption posits that CR, by conditioning on a potentially larger set of verified intermediate results from its DAG, is at least as likely, and potentially more likely, to generate the next correct step compared to ToT (which might condition on a more limited history from a single path in its tree).” (Section 3.1, p. 7.)

How to apply it. Inference: the following adapts the paper's conceptual analysis into an evaluation procedure.

1. Define stages and the event that each proposed step is correct (Definition 3.1, pp. 6–7).
2. Measure or estimate first-step and conditional next-step probabilities for the chosen model and verifier, using the quantities defined in Section 3.1 (pp. 6–7).
3. State whether verifier accuracy is near-perfect and whether adding validated context is assumed not to reduce the next-step probability (Assumption 3.2, p. 7).
4. Compare CR with independent CoT trials and ToT under equal breadth using the theorem’s inequality (Theorem 3.4, p. 8).

Verus form. Inference: use the model only to estimate proof-obligation proposals and use Verus acceptance as the step-correctness event. The probability model can compare proof-search strategies, but it does not prove a Rust contract. Inference: Assumption 3.2 must be tested rather than silently adopted because larger solver contexts can hurt automation.

Evidence and limits. The theorem is conditional on a unique correct path, near-perfect verification, independent CoT trials, equal maximum breadth, and Assumption 3.2's dominance and monotonicity conditions (Section 3.1, pp. 6–8). Inference: the result does not establish these conditions for deployed LLMs. The paper’s Game of 24 conceptual experiment repeats each puzzle 1,000 times; for puzzles `(2,7,12,13)`, `(6,11,12,13)`, and `(8,8,10,12)`, direct rates are 3.0%, 0.0%, and 1.8%, while products `p1 p2` are 5.0%, 5.2%, and 4.4% (Table 1, p. 8). The table does not report confidence intervals.

## technique 3: verified state search for Game of 24

What it is. CR maintains a reachable-state set `S`, beginning with the four input numbers. Each iteration selects a state, proposes an arithmetic operation on two numbers, verifies that operation, and adds the resulting state if valid. The Reporter traces back from a state evaluating to 24. Search stops on a reported solution or when the iteration count exceeds `L=50`; breadth `b` runs parallel branches (Section 4.4, pp. 10–11).

How to apply it.

1. Initialize `S` with the four input numbers and set a 50-iteration limit (Section 4.4, p. 11).
2. Select a state `u` and choose two numbers from it (Section 4.4, p. 11).
3. Propose an addition, subtraction, multiplication, or division producing `v` (Section 4.4, p. 11).
4. Verify the operation and add `v` to `S` only when valid (Section 4.4, p. 11).
5. When a state encodes a valid equation equal to 24, have the Reporter trace the derivation and output it; otherwise continue until the iteration count exceeds `L` (Section 4.4, p. 11).

Verus form. Inference: represent a state as a Rust value with a specification for arithmetic validity and input usage. Prove each transition preserves the condition that each input is used exactly once, and that a reported solution evaluates to 24. A `spec fn` can define the mathematical transition relation, while executable code performs the search; proof functions establish transition lemmas but do not run as the search. These are Verus adaptations, not paper results.

Evidence. The evaluation uses 100 curated puzzles (Section 4.4, p. 11). With GPT-4, CR breadth 5 reaches 98% accuracy and visits 14.86 states on average, compared with ToT breadth 5 at 74% and 61.72 states (Table 7, p. 11). The paper reports CR breadth 1–5 accuracies of 84%, 94%, 97%, 97%, and 98%; each denominator is the same 100-puzzle set. Inference: the lower visited-state count is evidence for this benchmark and prompt setup, not a general complexity bound.

## technique 4: formal or executable verifiers inside the loop

What it is. The Verifier role can be a symbolic reasoner, theorem prover, or Python interpreter rather than another LLM (Section 3, p. 4). In the code-enabled MATH experiment, the Proposer emits arithmetic or symbolic expressions and Python executes them before they enter the knowledge DAG (Section 4.5, pp. 12–13). Figure 16 (p. 49) prompts for preliminary contents, hints, intermediate question–answer-sketch–code–output–answer pairs, and a final solution with code and an answer. Inference: execution checks the submitted computation; it does not by itself establish that the computation models the original problem correctly.

How to apply it. Inference: the following generalizes the paper's verifier options into an implementation procedure.

1. Define a machine-checkable representation of each candidate step (Section 3, p. 4).
2. Execute the candidate in a trusted interpreter or theorem prover (Section 4.5, p. 13).
3. Add only candidates that pass the check to the DAG (Sections 3 and 4.5, pp. 4, 13).
4. Feed accepted nodes back to the Proposer and let the Reporter use only the accepted graph (Section 3, p. 4).

Verus form. Inference: compile generated Rust/Verus and accept a step only after Verus verifies its obligations. Keep solver and compiler outputs as evidence, but track trusted specifications and external contracts. Inference: the Verus verifier is stronger than an LLM critic for logical validity, yet it still checks only the written specification.

Evidence. On the 500-example MATH subset, CR without code and four-shot prompting scores 58.00% overall with progressive-hint prompting and 54.20% without it (Table 9, p. 12). With Python code and two-shot prompting, CR scores 72.2% overall in the subset comparison (the starred row of Table 11, p. 13); exact per-subtopic test counts are not given. Level 5 code-enabled accuracy is 52.2% versus ToRA reproduction 46.3% and PAL reproduction 31.3% (Table 12, p. 13); these rates concern Level 5 items within the subset, not all 500 items. Inference: these are answer accuracies, not proof soundness rates.

## technique 5: dataset curation and component ablation

What it is. The authors inspect FOLIO-wiki for missing or contradictory knowledge, ambiguity, inconsistent premises, vague or mistyped statements, and wrong annotations. Removing 74 problematic examples from the 534-example testable collection leaves 460 curated examples (Sections 4.1–4.2, pp. 9–10).

How to apply it. Inference: the following adapts the paper's curation and ablation procedures to another benchmark.

1. Review each benchmark item for contradictions, ambiguity, premise inconsistency, annotation errors, and wording defects (Section 4.2, p. 10).
2. Remove or separately label defective items and report the remaining denominator (Section 4.2, p. 10).
3. Ablate the Verifier and premises-random-choice mechanism separately to identify which components supply gains (Section 4.3, p. 10).

Evidence. On curated FOLIO-wiki, GPT-4 with CR reaches 98.04% versus 96.09% for GPT-4 CoT-SC (Table 3, p. 9), with denominator 460 examples. On the uncurated 534-example FOLIO-wiki set, GPT-4 CR is 87.45% versus 85.02% CoT-SC (Table 2, p. 9). GPT-3.5 ablation on the uncurated set gives CR 73.03%, CR without Verifier 64.23%, CR without premises-random-choice 68.73%, and both removed 67.23% (Table 5, p. 10); each percentage uses the same 534-example test collection. The gap between 73.03% and 64.23% is 8.80 percentage points, while the table labels CR’s improvement over direct prompting as +10.11 because the direct baseline is 62.92%; these are different comparisons and should not be conflated.

## broader evaluation and trust boundary

FOLIO contains 1,435 total examples, of which 52.5% are Wikipedia-derived; after few-shot and unlabeled exclusions from the Wikipedia-derived portion, 534 are testable as FOLIO-wiki (Section 4.1, p. 9). AutoTNLI contains 1,478,662 table–hypothesis pairs, but the paper evaluates only the first 1,000 (Section 4.3, p. 10). CR improves LLaMA-13B from 52.1% CoT-SC to 57.0% and LLaMA-65B from 61.7% to 72.5%; each rate uses those 1,000 pairs (Table 6, p. 11). Inference: selecting the first 1,000 is a sampling limitation, not evidence over the entire dataset.

The CR implementation uses Microsoft Guidance; GPT-3.5-turbo, GPT-4, LLaMA-13B, and LLaMA-65B; and same-model role prompts. The default temperature is 0.1, with 0.7 for majority voting (Section 4, p. 8); Tables 9 and 11 specify greedy decoding at 0.0 for MATH (pp. 12–13). The MATH code comparison reports 72.2% overall versus PAL 52.0% and ToRA 60.8% reproductions (Table 11, p. 13). Inference: the differences are 20.2 and 11.4 percentage points respectively; the paper's 18.8% improvement over ToRA (Section 4.5, p. 13) is a rounded relative percentage.

Inference: the Verifier determines which steps enter the graph. An LLM verifier can accept incorrect steps. With Python, a theorem prover, or Verus, the interpreter or prover and the written computation or specification remain part of the trust assumptions. The Reporter can still misstate accepted facts. A checked Verus result should be emitted directly and explanations should remain non-authoritative.

Inference: CR's combination of iterative decomposition, self-critique, graph reasoning, executable checking, and benchmark ablations limits novelty claims based on those features alone. A possible Verus contribution would measure a DAG of Rust proof obligations and proof-state reuse, with evidence from Verus checks rather than answer accuracy alone.

## techniques for the catalog

- verified DAG reasoning: propose, check, and cumulatively retain intermediate propositions in an acyclic dependency graph
- role-separated loop: assign generation, checking, and reporting to explicit Proposer, Verifier, and Reporter roles
- arrival-probability analysis: compare reasoning strategies under explicit verifier and monotonic-context assumptions
- executable state search: maintain reachable states, verify each transition, and report a checked terminal state
- verifier integration and ablation: use theorem provers or interpreters as step checkers and measure each component’s contribution
