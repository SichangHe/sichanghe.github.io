# Enhancing LLM-based Specification Generation via Program Slicing and Logical Deletion
(authored by agents unless marked 🧑)
Tag: `chen2025slicing`, [paper](https://arxiv.org/abs/2509.09917v2)

## method in one view
SLD-Spec generates C/ACSL specifications in four phases: static slicing, LLM guessing, logical deletion, and whole-function verification. The abstract says it “combines program slicing and logical deletion.” (Abstract, p. 1.) The target problem is that an LLM can emit relevant-looking but unrelated invariants, while immediate verification can discard a correct clause whose preconditions have not yet been generated.

## technique 1: automatic function and slice construction

use
Slice a function when a whole function contains several loops or data-flow regions that confuse specification generation. The implementation targets C and uses a function call graph (FCG) plus static backward slicing.

steps from Algorithm 1 and its explanation (§3.1, pp. 6–8)
1. Build an AST and FCG by traversing source code; process functions bottom up.
2. If the target function has no caller, create a simple wrapper with `GenCallFunc` so the slicing tool has an entry function.
3. Extract function variables with `GetFuncVar`; the paper selects local variables defined outside loops.
4. For each variable, use it as a synthetic function's parameter and insert that call at the end of the target function as a slicing criterion with `InsSliCrit`.
5. Run `Slicing(F, sc)` for each criterion and retain nonempty slices.
6. Simplify overlapping slices greedily: count all statements, repeatedly choose the slice covering the most uncovered statements, update covered statements, and stop when all statements are covered (Algorithm 2).

The variable-selection rule is explicit: “In this work, we select local variables defined in the function, excluding those defined within loops.” (§3.1, p. 7.) Figures 1–2 illustrate two loops updating `*x_res` and `*prod_res` and a slice containing the latter loop.

Verus form
Inference: For Rust/Verus, build a dependency graph from function calls and tracked mutable reads/writes, then partition proof obligations by loop or state component. Use `requires`, `ensures`, loop `invariant` clauses, and `assert` facts in each slice. Verus has no direct `GenCallFunc` or ACSL `loop assigns`; wrappers and slicing remain generator infrastructure. Ownership and borrowing may make a syntactic C slice invalid, so the slice must preserve Rust lifetime and alias constraints.

evidence and limits
On complex-func, the no-logical-deletion variant raises PCRSAV versus the variant with neither mechanism in three categories; both reach 100% for Single Multi-Path Loop (Table 4, p. 16). The authors justify variable exclusion: “The slices generated from such variables are typically subsumed by slices generated from variables defined outside the loops.” (§3.1, p. 7.) Inference: This rationale does not establish that the same selection rule preserves the relevant behavior of Rust iterator state or alias-sensitive code.

## technique 2: few-shot slice specification guessing

For each slice, SLD-Spec builds a prompt containing role instructions, few-shot examples, and slice code; the candidates use ACSL contracts and loop annotations (§2.2, p. 4; §3.2, p. 8). The generation order is explicit: “If a slice contains substructures, specifications are generated for these substructures with priority.” (§3.2, p. 8.) Candidates proceed to logical deletion before verification (§3.3, pp. 8–10).

Verus form
Inference: Prompt an LLM with one Rust/Verus slice, its function signature, relevant types, and a few checked examples. Ask for candidate `requires`, `ensures`, `invariant`, and proof facts. Treat every candidate as untrusted until Verus checks the integrated function. ACSL syntax and pointer contracts need translation to Rust references, ownership, and integer types.

## technique 3: logical deletion before verification

what it is
Logical deletion asks an LLM to remove candidates that are irrelevant or logically false without treating temporary unprovability as falsity. The paper identifies seven error types: incorrect boundary condition, incorrect pattern summarization, invariant misalignment, false modifiability, assigns misalignment, uniqueness conflict, and invalid loop-variant definition (Table 1, p. 9).

steps (§3.3, pp. 8–10)
1. Exclusion: remove specifications whose variables do not occur in the current code.
2. Comprehension: interpret each candidate according to its specification type and describe it informally.
3. Reasoning: treat the informal interpretations as design requirements, provide them with the source code, and ask whether the program satisfies each requirement.
4. Output: emit true or false from the affirmative or negative stance of each explanation. Remove candidates judged incorrect, store the retained specifications, and continue to the next slice (§3, pp. 5–6).

The prompt includes both correct specifications and erroneous few-shot examples instantiated from randomly selected common error types (§3.3, pp. 8–10). The threats section also describes repeated judgments with majority voting: “LLMs are invoked multiple times on the same batch of specifications, and the final decision is made based on majority voting.” (§5, p. 17.) The paper does not give the number of votes.

The exclusion step is: “First, LLMs exclude specifications that are irrelevant to the current code based on the occurrence of variables in the specifications.” (§3.3, p. 10.)

Verus form
Inference: Apply the same four stages to candidate Verus contracts and invariants, but describe `requires`/`ensures` semantics in Rust terms and account for ownership. Logical deletion is an LLM heuristic; it cannot establish a contract. Keep candidates that are currently unprovable because a later precondition may make them provable, then let Verus decide after integration.

## technique 4: delayed integrated verification and deletion loop

After all slices of one function are processed, SLD-Spec aggregates their candidates, removes conflicts, and submits the set to Frama-C; the experiments use its weakest-precondition plugin (§3.4, p. 10; §4.1, pp. 11–12). The stated loop is: “This process is repeated until all specifications are either removed or successfully verified.” (§3.4, p. 10.) The introduction additionally describes stopping when only assertion violations remain (§1, p. 3). Verification is delayed because a clause correct for one slice can be false for the function: a slice's `assigns nothing` is invalid for the whole function if another slice modifies variables (§3.4, p. 10).

Verus form
Inference: Accumulate candidate contracts and invariants for one Rust function, run Verus once on the integrated file, and iteratively remove identified failing clauses. Verus's diagnostics may not uniquely identify a single bad clause, so deletion needs dependency-aware localization or a bounded search. Never weaken the executable function or mark it `external_body` merely to make a candidate pass.

## evidence and numbers

The experiments use DG static backward slicing, the OpenAI API with temperature 0.7 and max_tokens 2048, and Frama-C's weakest-precondition plugin with an eight-second specification-verification timeout (§4.1, pp. 11–12). No specific LLM model is named in the experimental setup. The repetition policy is: “To mitigate the impact of randomness in LLM outputs on the experimental results, we conduct five independent runs for each program.” (§4.1, p. 12.) Metrics other than NPP are averages over those runs. PCRSAV measures the proportion of correct and relevant specifications after verification; NAV counts assertions passing verification; NPP counts program verification passes; RT measures total generation and verification time (§4.1, p. 12).

On the 51-program `frama-c-problems` dataset (Table 2, p. 13), SLD-Spec verifies 37 programs, versus 36 for SpecGen and 27 for AutoSpec; average runtimes are 27.85 s, 42.04 s, and 100.21 s respectively. On the 11-program `complex-func` dataset (Table 3, p. 15), the counts are 10, 2, and 0. Inference: These totals count programs with at least one successful run, as shown by the per-program NPP entries; they do not mean success in all five runs. For example, SLD-Spec's `nested-2.c` entry is 3/5. In the ablation (Table 4, p. 16), the full system verifies 10 programs, the no-program-slicing variant 8, the no-logical-deletion variant 0, and the variant with neither mechanism 0. Each per-program NPP is out of five runs.

The paper reports the mechanism-level interpretation: “Program slicing reduces interference between slices and enables the generation of more complete specifications, while logical deletion preserves logically correct specifications.” (RQ3 discussion, pp. 16–17.) Inference: The results support the method on these C/ACSL benchmarks, without establishing soundness of LLM judgments. The authors acknowledge: “Due to the inherent non-determinism of LLMs, logically correct specifications may be incorrectly judged as incorrect and removed, and vice versa.” (§5, p. 17.) Other stated threats are possible training-data leakage and the limited dataset size (§5, pp. 17–18).

The remaining complex-func failure is `only-single-loop-4.c`, with four branches inside one loop (Appendix A.4, pp. 25–26). The authors explain that SLD-Spec unions multiple generation results, leaving many incorrect or repetitive candidates that make long verification timeouts expensive. Their manual follow-up states: “After a single verification and manual elimination of incorrect specifications, the program was ultimately verified successfully.” (Appendix A.4, p. 26.) This used the 38th retained result from the third independent run and a 300 s timeout. Inference: This follow-up does not count as an automated success under the reported eight-second configuration.

Inference: For VerusLaw, the design directly addresses a product failure mode: an agent's global specification prompt can mix unrelated loops, and immediate solver rejection can erase useful facts. Slicing and delayed integrated checking are therefore plausible workflow components. The threat remains high if logical deletion is trusted as a verifier; only Verus proof discharge under the real Rust dependencies gives the acceptance evidence.

## trusted and unproved parts

Inference: Acceptance evidence comes from Frama-C's checks under the supplied contracts and benchmark assertions; LLM judgments and slicing guide candidate selection rather than establish proofs. Such acceptance depends on the verifier, its C/ACSL model, and the adequacy of the stated properties. The paper gives no proof of semantic completeness of its automatic slice selection, soundness of LLM deletion, or transfer to Rust ownership and concurrency.

## techniques for the catalog

- automatic function slicing — derive slicing criteria from non-loop variables, generate backward slices, and greedily simplify overlapping slices
- slice-conditioned generation — ask an LLM for specifications from one slice with role instructions and few-shot examples
- logical deletion — exclude irrelevant candidates, comprehend and reason about each, then retain logically correct-looking clauses
- delayed integrated verification — aggregate slice clauses, verify the whole function, delete failing clauses, and repeat
- repeated evaluation — run five independent trials and report verification passes, relevance, assertions, and runtime with explicit denominators
