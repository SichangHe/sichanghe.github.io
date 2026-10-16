# Large Lemma Miners: Can LLMs do Induction Proofs for Hardware?
(authored by agents unless marked 🧑)
Tag: `peled2025large`, [paper](http://arxiv.org/abs/2511.02521v3)
## scope and result

Large Lemma Miners studies a neurosymbolic workflow in which LLMs propose auxiliary invariants for SystemVerilog designs and a formal engine checks them. The abstract says: “We present a neurosymbolic approach that includes two prompting frameworks to generate candidate invariants, which are checked using a formal symbolic tool.” The framework searches for an inductive strengthening of a safety property, rather than asking the model to prove the property directly. Its dataset has 109 design/property pairs. Across six LLMs and both prompting setups, the virtual-best Agentic setup solves 98/109 examples (90%), while the virtual-best Non-Agentic setup solves 90/109 (83%). Eleven examples are unsolved by every setting.

Inference: this is a close analogue of generating Verus loop invariants or state-machine facts. The formal checker, rather than the model's plausibility, decides whether a candidate can support the target proof. The paper studies hardware transition systems and SVA, so its percentages do not establish performance on Rust or Verus.

## the verification object: inductive strengthening

A transition system `T` has state variables, initial-state formula `Init`, and transition relation `Tr`. An invariant `Inv` must satisfy initiation, `Init(v) -> Inv(v)`, and consecution, `Inv(v) and Tr(v,v') -> Inv(v')`. A safety property `AGp` is proved when an inductive strengthening is a set of lemmas `L = {AGq1, ..., AGqk}` such that the conjunction of the `qi` and `p` is inductive. This is the mathematical target for the lemma miner.

The motivating round-robin arbiter demonstrates the distinction between truth and inductiveness. The property is true but “not an inductive invariant.” The generated lemma `not (ack0 && ack1)` holds and, conjoined with the property, forms an inductive invariant. The example shows why an auxiliary lemma can make a true but non-inductive property tractable.

Verus form. Inference: for a Verus loop, use a loop invariant that is established before the loop and preserved by every body execution; for a concurrent state machine, use a transition invariant that relates each allowed transition to the abstract state. The exact Rust proof structure depends on the Verus API and is not specified by this paper. Inference: generated facts must be expressed as contracts or proof functions and checked by Verus before being reused.

## technique 1: few-shot non-agentic candidate generation

What it is. Algorithm 1 builds a fixed few-shot prompt from a pool of examples. Each example contains an RTL design, property, candidate lemmas, and chain-of-thought reasoning explaining why those lemmas form an inductive strengthening. The prompt embeds the target design and property and selects the k most similar examples using sentence-transformer embeddings and dot product.

How to do it.

1. Construct a pool of verified design/property/lemma examples.
2. Embed the target `(D, phi)` and every pool entry.
3. Select the k most similar examples; the experiments use k in `{0,1,2,3,4,5}`.
4. Add the fixed task template, examples, target RTL, and target property to the prompt.
5. Sample the same prompt n times and collect all candidate lemmas.
6. Pass the union of candidates to `FIND_INDUCTION_STRENGTH`.

The paper's algorithm states: “S ← GetFewShotPrompt(D, φ, k);” and then repeatedly calls the model before invoking the formal search. The output is a set of candidate lemmas, not a proof accepted merely because the model generated it.

Verus form. Inference: build a corpus of verified Rust examples indexed by obligation text, type names, APIs, and invariant shapes. Retrieve a small number of examples and ask the model for candidate `requires`/`ensures` facts or loop-proof facts. Inference: examples should be checked under the target crate and dependency versions; text similarity alone cannot establish a valid invariant. This adaptation is not in the paper.

Evidence and limits. The few-shot ablation reports a virtual-best success rate increasing from 82% at k=0 to 86% at k=4, with no improvement at k=5. This denominator is the 109-example dataset for the virtual-best aggregate. The increase is nonmonotonic per model and category, so more examples are not automatically better.

## technique 2: agentic proposal, checking, and repair

What it is. Algorithm 2 wraps candidate generation in a verifier feedback loop. The LLM proposes a batch; the formal search checks it; if no strengthening is found, the system records every candidate and appends a repair message describing whether each candidate held. The next prompt includes the accumulated conversation. The experiments allow at most seven iterations in the main Agentic setup and vary the iteration count from 1 to 10 in an ablation.

How to do it.

1. Build the same few-shot prompt as in the Non-Agentic setup.
2. Ask the LLM for candidate lemmas.
3. Run `FIND_INDUCTION_STRENGTH` on the new candidates.
4. Return immediately if a nonempty strengthening is found.
5. Otherwise add the candidates to `All`, run the checker on all accumulated candidates, and return if successful.
6. Append a repair message that identifies each candidate's verification status.
7. Repeat until success or the iteration bound is reached.

The paper describes this as “an iterative interaction between an LLM and a verifier.” It reports that most examples are solved within five iterations and all models saturate at approximately ten iterations in Figure 1.

Verus form. Inference: after each Verus run, feed the model the exact diagnostic, obligation context, and which candidate facts were accepted or rejected. Keep accepted facts and rejected facts separately; do not let a timeout masquerade as a counterexample. Inference: cap both model turns and total Verus invocations to control solver cost. The paper's seven-iteration limit is not a Verus requirement.

Evidence and limits. Table 1's virtual-best row gives 98 solved tasks for Agentic and 90 for Non-Agentic, out of 109. The authors attribute part of the Agentic advantage to checking more subsets over several rounds, so it can spend more formal-engine calls. Inference: comparing success rates without equalizing checker calls would overstate the benefit of prompting alone.

## technique 3: formal subset search with inductive and bounded checks

What it is. `FIND_INDUCTION_STRENGTH` partitions candidates into those that are individually 1-inductive and those that merely hold up to a bounded depth N. It orders individually inductive candidates first, then bounded-correct candidates lexicographically, and checks prefixes of that list for an inductive strengthening.

How to do it.

1. Translate the RTL and property into transition system `T` and reachability property `AGp`.
2. For each candidate `ell`, call `IsOneInductive(T, ell)`.
3. If `ell` is individually inductive and `ell and p` is inductive, return `{ell}`.
4. Otherwise call `HoldsUpToBound(T, ell, N)`; retain candidates passing the bounded check and discard candidates with a counterexample.
5. Sort the individually inductive candidates before bounded-only candidates, using lexicographic order within each category.
6. Add candidates in prefix order and test whether the conjunction of the prefix and `p` is inductive.
7. Return the first successful prefix or the empty set.

Algorithm 4 checks initiation and consecution with a SAT solver: it rejects a candidate if `Init and not psi` is satisfiable or if `psi and Tr and not psi'` is satisfiable. The paper uses k=1 for induction checks and BMC bound 30 for bounded checks; every query has a 120-second timeout.

Theorem 1 states: “If FINDINDSTRENGTH returns a non-empty set L, then L is an inductive strengthening for φ, and consequently φ holds in the design D.” This is the formal soundness hinge of the pipeline.

Verus form. Inference: the closest analogue is to check each generated invariant as a Verus proof obligation, then test combinations in a deterministic order. A bounded execution check can find short counterexamples but cannot prove a Rust invariant; only Verus's full initiation and preservation proof should certify it. Inference: prefix-only search may miss a useful non-prefix combination, so a Verus implementation should record this incompleteness and optionally use a separate subset strategy.

Evidence and limits. Table 1 distinguishes Total Lemmas, Correct candidates that hold to BMC bound 30, 1-Inductive candidates, verifier Error, and Solved tasks. For example, GPT-5 Agentic produces 8,090 candidates, 5,976 BMC-correct, 3,187 1-inductive, 175 errors, and solves 84/109 tasks. These columns have different denominators: candidate counts for the first four and the 109-task benchmark for Solved. They must not be interpreted as percentages of the same population.

## technique 4: bounded checking as a filter, not proof

What it is. `HoldsUpToBound(T, ell, N)` invokes bounded model checking to reject candidates with short counterexamples. A candidate that survives bound 30 is retained as a possible lemma but is not called inductive until initiation and consecution succeed.

When to use it. Use bounded checks to cheaply discard obviously false model suggestions before expensive induction checks. Do not use bounded survival as the final proof criterion.

How to do it.

1. Choose a bound N; the paper uses 30.
2. Unroll the transition relation for N steps.
3. Ask the BMC engine whether the candidate is violated within the bound.
4. Discard a candidate with a counterexample.
5. Pass survivors to inductive checking and subset search.

Verus form. Inference: execute bounded test traces or model checks only as triage for generated Rust invariants. A bounded pass cannot replace the Verus proof of all loop iterations or state transitions. This distinction follows from the paper's separate `Correct` and `1-Inductive` columns.

Evidence and limits. The paper reports that the bounded check keeps the cost manageable while detecting short counterexamples. Its use of a 120-second timeout means some candidates may be marked unavailable because of resource limits rather than logical failure. Inference: Verus evaluation should report timeout and verifier-error counts separately from false candidates.

## technique 5: sampling and prompt repair

Non-Agentic runs sample up to five responses for one prompt and aggregate all candidate lemmas. Agentic runs sample one response per message sequence and use conversation repair. The models include GPT-5 and five Claude variants. The paper observes syntax familiarity failures: models misstate SVA operators, use undefined next-state variables, emit invalid loop constructs, or produce non-ASCII symbols such as Unicode `⇔` instead of ASCII `<->`.

How to do it.

1. Choose the model and inference configuration.
2. For Non-Agentic, repeat the identical prompt up to five times.
3. For Agentic, make one proposal per iteration and append verifier feedback.
4. Aggregate candidates and invoke the formal subset search.
5. Stop when a strengthening is found or the time/iteration bound expires.

Verus form. Inference: sample multiple proof candidates, normalize diagnostics, and ensure generated source uses valid Rust and Verus syntax. Inference: syntax repair should be separated from logical repair so a parser error does not contaminate the learned invariant pool. The paper's syntax examples are SVA-specific.

## what is proved, measured, and trusted

The formal engine proves that a returned lemma set is an inductive strengthening and therefore implies the target safety property for the modeled hardware. The main benchmark has 109 design/property pairs from 57 SystemVerilog designs. Runtime experiments use 1,519.9 Amazon EC2 hours, 20% LLM and 80% symbolic engine; all runs generate 277.41 million tokens. Mean and median solve times are 232.54 s and 85.1 s, respectively, but these are over framework runs and include model and formal-engine work.

For 31 challenging examples, the pipeline solves 27/31 against state-of-the-art tools, with a one-hour timeout for those comparisons. Some reported timeout cases contain a valid strengthening whose induction check exceeded the two-minute per-query limit. The tools and settings are therefore part of the evidence denominator.

Trusted components include the RTL translation, SVA semantics, EBMC 5.9, SAT/BMC engines, model APIs, manually selected Chain-of-Thought pool, and the design/property formalization. The paper warns that dataset representativeness and data contamination threaten validity; most public netlists lack source RTL and cannot be used by this framework.

## Verus translation and product boundary

Inference: the core Verus workflow is candidate generation, verifier feedback, deterministic subset search, and final proof checking. A candidate Rust invariant should be attached to the relevant loop or transition API and checked with Verus. Any generated fact that is not accepted by Verus remains a suggestion. The paper does not give Verus syntax, ownership treatment, or Rust concurrency models.

Inference: hardware induction differs from local loop invariants because hardware lemmas can include temporal operators and global reachable-state claims. A Verus state-machine proof may encode related global facts, but the mapping is an engineering hypothesis requiring a benchmark. Inference: tests should include sequential loops, ownership-heavy data structures, and concurrent state machines, with proof success and solver cost denominators.

## contradictions, assumptions, and failure modes

The abstract says the Agentic setup succeeds for 90% of the problem set, which is 98/109 = 89.91%, rounded to 90%; Non-Agentic is 90/109 = 82.57%, rounded to 83%. The paper calls these “virtual best,” meaning at least one model and few-shot configuration solved each task, not that one fixed model solved 98 tasks. Table 1's per-model solved counts are therefore not directly comparable with the virtual-best row.

The paper reports 11/109 tasks unsolved by any setting, a 10.09% remainder. It also reports that models often copy CoT-pool lemmas on seen examples, so generalization is stronger evidence in the “others” and C-example categories than in the seen category. The manually selected pool introduces selection bias, and the dataset may not represent industrial designs.

Inference: VeruLaw faces analogous contamination and benchmark overfitting risks if prompt examples come from the same projects used for evaluation. Inference: model-generated invariants can be syntactically valid but semantically irrelevant, and solver timeouts can conceal whether the candidate is wrong or merely expensive. Inference: a product must retain the exact verified source, dependency versions, and contract so that a mined lemma cannot silently outlive its assumptions.

## transfer notes for VL implementation

The reusable contributions are verifier-in-the-loop proposal and repair, bounded triage, formal subset selection, deterministic ordering, and explicit separation of candidate correctness from final inductiveness. The paper has already tested this architecture on a hardware benchmark and compared it with industrial model checkers; VL should not repeat a generic claim that LLMs can propose invariants.

Inference: VL should test whether Verus diagnostics can guide a bounded candidate filter, whether a prefix search misses useful combinations, and whether generated lemmas remain valid after Rust dependency upgrades. Measure accepted invariants, full proofs, timeouts, repair rounds, verifier calls, and human interventions separately.

Product relevance for peled2025large. Inference: the threat is substantial to proof-authoring cost because this pipeline could automate invariant discovery, one of the most manual parts of Verus work. The final runtime artifact remains subject to Verus, but stale specifications, external assumptions, and incomplete state models can still make a formally verified product wrong for its intended environment. The paper provides no evidence about Rust executables, unsafe code, or production deployment.

## techniques for the catalog

- few-shot invariant prompting — retrieve similar verified examples and sample candidate lemmas from a fixed prompt
- agentic verifier feedback — iterate proposal, formal checking, and diagnostic-guided repair until a strengthening appears
- bounded candidate filtering — reject lemmas with short counterexamples before expensive inductive checks
- inductive subset search — classify candidates, order them deterministically, and test prefixes for a strengthening
- initiation and consecution checking — prove that a candidate holds initially and across every transition
- sampled neurosymbolic mining — aggregate multiple model responses while retaining formal verification as the acceptance gate

## evidence references

Definitions and the round-robin motivating example are Sections 3–4.1, PDF pages 3–5. Prompting and Algorithms 1–2 are Section 5.1, PDF pages 5–6. Subset search and Algorithm 4 are Section 5.2, PDF pages 6–7. Configuration and dataset details are Section 6, PDF pages 7–8. Aggregate results and Table 1 are Section 7, PDF pages 8–9. Challenging benchmarks and ablations are Sections 7.4–7.5, PDF pages 9–11. Limitations and threats are Section 8, PDF pages 11–12.
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
