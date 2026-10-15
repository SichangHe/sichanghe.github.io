# Enhancing LLM-based Specification Generation via Program Slicing and Logical Deletion
(authored by agents unless marked 🧑)
Tag: `chen2025slicing`, [paper](https://doi.org/10.1145/2914770.2837628)

## method in one view
SLD-Spec generates C/ACSL specifications in four phases: static slicing, LLM guessing, logical deletion, and whole-function verification. The abstract says it “combines program slicing and logical deletion.” (Abstract, p. 1.) The target problem is that an LLM can emit relevant-looking but unrelated invariants, while immediate verification can discard a correct clause whose preconditions have not yet been generated.

## technique 1: automatic function and slice construction

use
Slice a function when a whole function contains several loops or data-flow regions that confuse specification generation. The implementation targets C and uses a function call graph (FCG) plus static backward slicing.

steps from Algorithm 1 and its explanation (§3.1, pp. 6–8)
1. Build an AST and FCG by traversing source code; process functions bottom up.
2. If the target function has no caller, create a simple wrapper with `GenCallFunc` so the slicing tool has an entry function.
3. Extract function variables with `GetFuncVar`; the paper selects local variables defined outside loops.
4. For each variable, insert a synthetic slicing criterion with `InsSliCrit`.
5. Run `Slicing(F, sc)` for each criterion and retain nonempty slices.
6. Simplify overlapping slices greedily: count all statements, repeatedly choose the slice covering the most uncovered statements, update covered statements, and stop when all statements are covered (Algorithm 2).

The algorithm's core shape is quoted exactly: “for v ∈ Svar do sc ← InsSliCrit(F, v )” (Algorithm 1, p. 7). The paper's example function has two loops updating `*x_res` and `*prod_res`; slicing separates the loop-specific code.

Verus form
Inference: For Rust/Verus, build a dependency graph from function calls and tracked mutable reads/writes, then partition proof obligations by loop or state component. Use `requires`, `ensures`, loop `invariant` clauses, and `assert` facts in each slice. Verus has no direct `GenCallFunc` or ACSL `loop assigns`; wrappers and slicing remain generator infrastructure. Ownership and borrowing may make a syntactic C slice invalid, so the slice must preserve Rust lifetime and alias constraints.

evidence and limits
On the complex-func set, slicing raises relevance in the ablation: the no-logical-deletion variant raises PCRSAV versus the variant with neither mechanism. A greedy cover is a heuristic: overlapping or semantically dependent slices can still be separated incorrectly. The authors note that variables defined inside loops are excluded because their slices are usually subsumed; that assumption may fail for Rust iterator state or alias-sensitive code.

## technique 2: few-shot slice specification guessing

For each slice, SLD-Spec builds a prompt containing role instructions, few-shot examples, and slice code; the LLM emits candidate invariants, assigns clauses, variants, and contracts (§3.2, p. 8). If a slice contains substructures, specifications for those structures are generated first. This smaller context reduces interference from unrelated loops. The candidates are retained for logical deletion rather than immediately rejected by a verifier.

Verus form
Inference: Prompt an LLM with one Rust/Verus slice, its function signature, relevant types, and a few checked examples. Ask for candidate `requires`, `ensures`, `invariant`, and proof facts. Treat every candidate as untrusted until Verus checks the integrated function. ACSL syntax and pointer contracts need translation to Rust references, ownership, and integer types.

## technique 3: logical deletion before verification

what it is
Logical deletion asks an LLM to remove candidates that are irrelevant or logically false without treating temporary unprovability as falsity. The paper identifies seven error types: incorrect boundary condition, incorrect pattern summarization, invariant misalignment, false modifiability, assigns misalignment, uniqueness conflict, and invalid loop-variant definition (Table 1, p. 9).

steps (§3.3, pp. 8–10)
1. Exclusion: remove specifications whose variables do not occur in the current code.
2. Comprehension: interpret each candidate according to its specification type and describe it informally.
3. Reasoning: judge whether the described property is logically true for the code, using positive or negative wording as appropriate.
4. Output: retain the candidates judged correct; store them and continue to the next slice.
5. Include few-shot examples instantiated from common erroneous types so the LLM can recognize them.

The method's four-step statement is: “First, LLMs exclude specifications that are irrelevant to the current code based on the occurrence of variables in the specifications.” (§3.3, p. 10.)

Verus form
Inference: Apply the same four stages to candidate Verus contracts and invariants, but describe `requires`/`ensures` semantics in Rust terms and account for ownership. Logical deletion is an LLM heuristic; it cannot establish a contract. Keep candidates that are currently unprovable because a later precondition may make them provable, then let Verus decide after integration.

## technique 4: delayed integrated verification and deletion loop

After all slices of one function are processed, SLD-Spec aggregates their candidates, removes conflicts, and submits the set to Frama-C's weakest-precondition plugin. If verification fails, the system locates and deletes incorrect specifications, then re-verifies repeatedly until all remaining clauses pass or all are removed (§3.4). Slice-level verification is intentionally delayed because a clause that is correct for one slice can be false for the whole function; e.g., an `assigns nothing` clause can conflict with another slice that writes the same object.

Verus form
Inference: Accumulate candidate contracts and invariants for one Rust function, run Verus once on the integrated file, and iteratively remove identified failing clauses. Verus's diagnostics may not uniquely identify a single bad clause, so deletion needs dependency-aware localization or a bounded search. Never weaken the executable function or mark it `external_body` merely to make a candidate pass.

## evidence and numbers

The experiments use Frama-C with its weakest-precondition plugin and an eight-second specification-verification timeout (§4). Each program is run five independent times; metrics except NPP are averages. On `frama-c-problems` (Table 2), SLD-Spec verifies 37 programs, versus 36 for SpecGen and 27 for AutoSpec; average runtimes are 27.85 s, 42.04 s, and 100.21 s respectively. The denominator is the dataset's listed programs, with NPP shown as passes out of five per program. On `complex-func` (Table 3), SLD-Spec fully verifies 10 programs; SpecGen verifies 2 and AutoSpec 0. In the ablation (Table 4), the full system verifies 10 programs, the no-program-slicing variant 8, and the no-both baseline 0; each pass count is over five runs per program.

The paper reports the mechanism-level interpretation: “Program slicing reduces interference between slices and enables the generation of more complete specifications, while logical deletion preserves logically correct specifications.” (RQ3 discussion, p. 17.) The results support this C/ACSL benchmark claim. They do not establish that LLM logical judgments are sound in general; the threats section says non-determinism can cause correct clauses to be removed and incorrect clauses retained, and repeated calls are used to improve stability.

Inference: For VerusLaw, the design directly addresses a product failure mode: an agent's global specification prompt can mix unrelated loops, and immediate solver rejection can erase useful facts. Slicing and delayed integrated checking are therefore plausible workflow components. The threat remains high if logical deletion is trusted as a verifier; only Verus proof discharge under the real Rust dependencies gives the acceptance evidence.

## trusted and unproved parts

Frama-C, ACSL semantics, C compiler and libraries, slicing analysis, LLM outputs and judgments, timeout behavior, and benchmark annotations are trusted or assumed. The final claims are about generated specifications that Frama-C accepts on the listed programs. The paper does not prove semantic completeness of slices, soundness of LLM deletion, or transfer to Rust ownership and concurrency.

## techniques for the catalog

- automatic function slicing — derive slicing criteria from non-loop variables, generate backward slices, and greedily simplify overlapping slices
- slice-conditioned generation — ask an LLM for specifications from one slice with role instructions and few-shot examples
- logical deletion — exclude irrelevant candidates, comprehend and reason about each, then retain logically correct-looking clauses
- delayed integrated verification — aggregate slice clauses, verify the whole function, delete failing clauses, and repeat
- checker-gated evaluation — run five independent trials and report verification passes, relevance, assertions, and runtime with explicit denominators
Checked 2026-10-15 against paper chen2025slicing: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
