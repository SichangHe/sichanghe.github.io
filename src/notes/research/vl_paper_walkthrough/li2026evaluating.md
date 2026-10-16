# Evaluating the Architectural Reasoning Capabilities of LLM Provers via the Obfuscated Natural Number Game
(authored by agents unless marked 🧑)
Tag: `li2026evaluating`, [paper](http://arxiv.org/abs/2605.00677v1)
source: Lixing Li, arXiv:2605.00677v1 (1 May 2026), 4 pages, no appendix; code at https://github.com/lllx125/Obfuscated-NNG. The paper has unnumbered sections, so references below give the section name and the page.

## what is measured and what stays trusted

The paper measures one thing: how the proof success rate and the response time of five LLMs change when every identifier of a small Lean 4 theory (the Natural Number Game, NNG) is replaced by random characters. Nothing is proved about the models. The Lean 4 compiler decides whether each answer counts: "These proofs undergo Verification via automated validation using the Lean 4 compiler (version v4.27.0) to detect syntax and logic errors." (Experimental Pipeline and Setup, p.2)

The capability under test is defined as: "We define Architectural Reasoning as the ability to synthesize formal proofs using exclusively local definitions, axioms, theorems, and limited tactics within a closed theory." (Motivation: Testing Architectural Reasoning, p.1)

Trusted, by my reading (Inference: the paper does not list a trusted base): the Lean kernel; the parser that extracts the NNG; the renamer, which must rename consistently and keep the file compiling; and the claim that no model output smuggles in a tactic outside the allowed set. The paper does not say whether the tactic restriction is enforced by a check or only requested in the prompt.

## technique 1: a closed theory as the test bed

what it is: pick a theory in which every theorem is built from a handful of axioms, with no library and only primitive proof steps, and give the model the whole of it in the prompt.

when to use: when the question is whether a prover reasons from the definitions in front of it, as opposed to recalling a library lemma by name.

how it is done (Motivation, p.1 to p.2):
1. choose a theory with no external library. The paper's reason for the NNG: "Unlike other benchmarks that rely heavily on Mathlib, the NNG represents a closed theory where every mathematical theorem is derived from the ground up using Peano axioms." (p.1 to p.2)
2. check that the whole local state fits in the context window, so each theorem can be proved from all earlier ones (p.2)
3. restrict the tactics to primitive ones. The paper excludes `linarith`, `simp` and `ring` and keeps "fundamental manipulations such as rw (rewrite) and induction" (p.1)
4. keep the dependency order when the theory is extracted, so that the prompt for theorem k holds the definitions, the earlier theorems and the allowed tactics (Experimental Pipeline and Setup, p.2)

the benchmark that results: "The benchmark is derived from the Natural Number Game and comprises 68 formal problems." (O-NNG Dataset, p.2) It has eight modules: Addition, Implication, Algorithm, Multiplication, Power, Advanced Addition, Less-Than-or-Equal, Advanced Multiplication.

Verus form (Inference throughout this part, since the NNG is a Lean 4 artifact). A closed theory in Verus is a single file of `spec fn` definitions and `proof fn` lemmas over `nat`, with no `vstd` lemma imports and no `broadcast` lemma groups. The third step does not carry over cleanly: in Lean a tactic such as `linarith` can be forbidden, but in Verus the SMT solver is the default prover for every `ensures` and cannot be switched off, so linear arithmetic facts that cost an NNG player an induction are discharged by Z3 with an empty body. What can be restricted is what the model may write: forbid `by (nonlinear_arith)`, forbid `assume` and `admit()`, forbid calls to anything outside the file. The test then has teeth only on theorems Z3 cannot do alone: recursive `spec fn` definitions that need an inductive `proof fn` with `decreases`, and nonlinear facts.

evidence: none separate from technique 2; the unobfuscated NNG is the λ = 0 baseline.

limits: the theory is still Peano arithmetic in disguise. "A primary limitation of the O-NNG is that while it removes semantic labels, it preserves the underlying logical structure of Peano arithmetic." (Limitations and Foundational Weaknesses, p.3) The paper reports that no model was seen mapping the renamed terms back, and proposes inventing non-standard axiom systems as the stricter test (p.3).

## technique 2: graded identifier obfuscation

what it is: rename every definition, operator, axiom and theorem by corrupting its characters, with one dial λ from 0 (original names) to 1 (fully random names).

when to use: to separate success that depends on names from success that depends on structure, on a benchmark whose original form a model may have seen in training.

how it is done (Obfuscation Algorithm, p.2):
1. set a noise level λ in [0, 1] and turn it into a per-character probability P = λ^2.5. The paper's reason is to sample more densely at low noise.
2. apply three edits in order with the `nlpaug` `RandomCharAug` augmenter, drawing from ASCII and the Unicode characters Lean allows: substitute each character with probability P; "Second, insertion injects new characters with probability 0.4P ." (p.2); delete with probability 0.3P, never leaving an identifier empty
3. the 0.4 and 0.3 ratios are chosen so the renamed strings keep about the original length distribution
4. generate one dataset for each λ in {0, 0.2, 0.4, 0.6, 0.8, 1.0}
5. not in the paper: recompiling the reference proofs after renaming to confirm the renamed theory is still valid, and checking that two identifiers did not collide. The paper says only that the character pool is chosen "to ensure syntactic validity".

A point of wording: the paper calls P = λ^2.5 an "exponential relationship"; it is a power law.

Verus form (Inference). Rename `spec fn`, `proof fn`, exec `fn`, parameter and local names in a Verus file with one consistent map, then rerun Verus on the reference solution before using the file. The original and the λ = 1 form of one item would look like:

```rust
verus! {
// lambda = 0
pub open spec fn add(a: nat, b: nat) -> nat
    decreases b
{ if b == 0 { a } else { add(a, (b - 1) as nat) + 1 } }

proof fn zero_add(n: nat)
    ensures add(0, n) == n
    decreases n
{ if n > 0 { zero_add((n - 1) as nat); } }

// lambda = 1: same text with add -> qX7, zero_add -> k3_Zt, a, b, n -> u, w, h
}
```

What changes from Lean: Rust keywords, primitive types (`nat`, `int`, `usize`) and `vstd` names cannot be renamed without also shipping renamed wrappers, so a Verus obfuscator leaves more semantic residue than the Lean one. What needs care: the notes on Verus record that solver proofs can break under changes that do not alter meaning (the Cazamariposas entry in the notes' Verus page), so a reference proof that verified before renaming is not guaranteed to verify after; the rerun in step 5 is needed for that reason.

evidence (Results and Analysis, p.3). Setup: 68 problems, 5 models, 6 noise levels, 5 queries per theorem per level, no compiler feedback returned to the model. Table 1 gives one-way ANOVA p-values across noise levels:
- correct rate: GPT-4o 0.0242 and Claude-Sonnet-4.5 0.0001 (both below 0.05); DeepSeek-R1 0.1573, GPT-5 0.0863, DeepSeek-Prover-V2 0.3077 (not significant)
- average time: GPT-4o 0.0004, Claude-Sonnet-4.5 0.0000, DeepSeek-R1 0.0000, GPT-5 0.0001, DeepSeek-Prover-V2 0.0000 (all below 0.05)

The paper's reading: "In contrast, the general models, Claude-Sonnet-4.5 and GPT-4o, both exhibited a statistically significant drop in success rates for λ > 0." (Robustness of Reasoning Models, p.3) The correct rates themselves appear only as curves in Figure 1; the paper prints no rate as a number, so the size of the drop cannot be read from the text.

limits and assumptions:
- an ANOVA across six levels shows that some level differs; it does not show a drop at every λ > 0, and the paper itself reports non-monotone behaviour: "Our data suggests a non-linear relationship where partial noise occasionally degrades performance more than total obfuscation." (Future Research Directions, p.4)
- Inference: ten tests are reported with no correction for multiple comparisons, and GPT-5's 0.0863 is close to the threshold, so the robustness claim for reasoning models rests on failing to reject at n = 5 runs
- Inference: random characters lengthen the token sequence of each identifier, so longer responses and lower accuracy may come partly from tokenization, not only from lost meaning; the paper does not control for this

## technique 3: draft-then-code output with compiler-only grading

what it is: force each answer into a JSON object with a natural-language plan and a code block, and send only the code to the checker.

how it is done (Experimental Pipeline and Setup, p.2). The six stages are Parsing, Obfuscation, Query Generation, Benchmarking, Verification, Analysis. The prompt holds the renamed axioms and definitions, the target theorem, the earlier theorems and the list of allowed tactics. The model returns a `Draft` field (the plan) and a `Code` field, and the code "is passed directly to the Lean compiler for evaluation" in the paper's words (Output Structure, p.2). Analysis covers success rate, timing and "proof plan length" (p.2); no plan-length result is reported anywhere in the paper.

Verus form (Inference). The same schema works unchanged: the `Code` field holds the body of one `proof fn`, a harness splices it into the file and runs Verus, and pass means zero verification errors. One addition is needed that Lean grading does not need: reject bodies containing `assume`, `admit()` or `#[verifier::external_body]`, since Verus accepts them without proof.

limits: single-shot. The paper names the missing piece: "Furthermore, a critical next step is evaluating model performance in an interactive environment where the Lean compiler provides real-time error feedback." (Future Research Directions, p.4)

## technique 4: latency as a second signal

what it is: record the wall-clock time from sending the query to receiving the answer, and test it across noise levels the same way as accuracy.

how it is done: "Average Time (s) represents the duration between the transmission of the query and the receipt of the response from the LLM." (Results and Analysis, p.3) Run a one-way ANOVA per model over the six levels (Table 1, p.3).

evidence: all five models show a significant time increase (p-values above). The paper concludes that removing names "necessitates a more intensive search or a complex internal reconstruction of the logical context" (The Universal Latency Tax, p.3).

limits (Inference): all runs were API calls (LLM Models, p.2), so the time includes network and provider queueing, and it is not normalised by output tokens. The paper measures a slowdown; that the cause is internal search is its interpretation, with no token count or reasoning-trace evidence given.

Verus form (Inference): for a Verus agent the comparable cheap signals are output tokens and the number of verifier calls until success; both are countable locally and avoid the API-latency confound.

## where the paper disagrees with itself

- the abstract says "reasoning models (DeepSeek-R1, GPT-5, DeepSeek-Prover-V2) maintain the same accuracy"; Table 1 supports only that no significant difference was detected, with p = 0.0863 for GPT-5
- the Benchmarking stage is described as "iterative querying of LLMs" (p.2), while the Future Research Directions section says compiler feedback was not given; iterative here can only mean the five repeated queries
- the Introduction cites "Ma et al. 2025" for a LiveCodeBench perturbation study (p.1), but the reference list entry for Ma et al. 2025 is "SpecEval: Evaluating Code Comprehension in Large Language Models via Program Specifications" (p.4)
- "state-of-the-art models" excludes Goedel-Prover-v2, left out because all runs were API calls (LLM Models, p.2)
- Correct Rate is defined over "68 in total" problems (p.3), with five queries each; the paper does not say whether a problem counts as correct per query or if any of five succeed, only that error bars are the standard deviation over 5 runs (Figure 1 caption, p.3)
- total queries, by my arithmetic and not stated in the paper: 5 models × 6 levels × 68 problems × 5 runs = 10,200

## already done; what VL should not redo

Inference: renaming identifiers to test Verus proof agents already exists. The ExVerus study in the walkthrough notes records an obfuscated Verus benchmark (ObfsBench) with several obfuscation strategies. What this paper adds to that is narrow: a continuous noise dial instead of on/off, a closed theory with no library, and time as a second metric. VL does not need to build a renamer from scratch to learn whether its agent leans on names; running the agent on an existing obfuscated Verus set answers the same question.

Worth taking: the dial. A few noise levels on VL's own evaluation tasks would show whether success falls with name quality, which matters because agent-written code often has poor or misleading names.

## how much this threatens VL's product

Inference: none as a competitor; the paper ships a 68-problem Lean benchmark and no prover. As a warning it is weak to moderate: it suggests general-purpose models lose accuracy when names carry no meaning, and its two general models are the kind VL's agents run on. The evidence is small (68 problems, 5 runs, one theory, numbers shown only as plots), and the stronger models tested showed no detectable loss.

## techniques for the catalog

- closed-theory test bed: evaluate a prover on a self-contained axiom set with no library and only primitive proof steps, with the whole theory in the prompt
- graded identifier obfuscation: corrupt every identifier's characters with probability P = λ^2.5 (substitute P, insert 0.4P, delete 0.3P) at several λ to plot success against name quality
- draft-and-code JSON grading: require a plan field and a code field, and pass only the code to the proof checker
- latency ANOVA: record response time per query and test it across noise levels as a second measure of difficulty
- post-rename revalidation (not in the paper): rerun the checker on reference proofs after renaming, since solver-based proofs can break under renaming
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
