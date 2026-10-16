# VIVERRA: Text-to-Code with Guarantees
(authored by agents unless marked 🧑)
Tag: `wu2026viverra`, [paper](https://www.semanticscholar.org/paper/9a9e8f60bbfed6802605efa0bd1d0ce28a411d46)

## claim and boundary

VIVERRA generates a C program and candidate assertions from a natural-language task, then checks assertions with a portfolio of bounded model checkers. Its abstract describes the goal: “we present V IVERRA, a system that automatically produces formally verified annotations alongside generated code to aid user’s understanding of the generated program.” (Abstract, p. 1) The annotations are partial specifications and verified facts, not a complete proof that the program implements the natural-language task.

The paper's key guarantee is bounded. A k-bounded invariant holds at an assertion location on every execution in which every loop back-edge is traversed at most k times (Definitions 3–4, p. 2). The authors state: “A k-bounded invariant provides a formal guarantee for all executions within the stated bound.” (Section 2, p. 2) Inference: this can support VeruLaw as a fast screening and comprehension layer, but it cannot replace unbounded Verus proofs for safety claims that must hold for all loop iterations.

## technique 1: partial co-specification

What it is. From the same task description, one LLM call elicits natural-language safety/correctness properties and another synthesizes a program. A subsequent call inserts `assert` statements corresponding to those properties. The paper calls this “partial co-specification” and says the assertions “serve simultaneously as partial specifications and as targets for formal verification.” (Section 1, p. 2)

How to do it, following Algorithm 1 and Section 3.1.

1. Give the natural-language description D to `PROPERTYE LICIT`, producing properties Π = {π1, …, πn} (Algorithm 1, p. 4).
2. Give D to `SYNTHESIZE`, requesting a verification-friendly C program P0; the paper's prompt treats verifiability as a design constraint and asks the LLM to avoid recursion (Section 3.1, p. 3).
3. Give P0 and Π to `ANNOTATE`, which inserts C `assert` statements at function boundaries, loop-invariant points, or other suitable locations (Section 3.1, p. 3).
4. Map each generated assertion to an elicited property so the final fact can be explained to the developer (Algorithm 1, p. 4).

The Bubble Sort example elicits that the global swap counter equals the number of adjacent swaps and that the final array is sorted, then inserts assertions for those properties (Figure 2, p. 4). Inference: for Verus, replace C assertions with Verus `assert` statements and function `requires`/`ensures` contracts where appropriate. The natural-language property remains an untrusted candidate until a Verus proof discharges it. Inference: asking an agent to co-generate a contract risks specification drift; VL should preserve the task text, generated property, exact code location, and verifier result together.

## technique 2: bound reduction before bounded checking

What it is. Bounded model checkers add an unwinding assertion at the (k+1)-th loop iteration. If a generated loop can legitimately exceed k iterations, that unwinding check creates a spurious failure. VIVERRA therefore asks an LLM to tighten compile-time loop-bound constants so every loop executes at most k times. The paper states: “The goal is to make Pk+ loop-bound tight: no loop should reach its (k+1)-th iteration on any input to Pk+.” (Section 3.1, p. 4)

How to do it.

1. Choose a loop-unwind bound k (the experiments use k = 5; Section 5.1, p. 7).
2. Run `BOUND REDUCE(P+, k)` to rewrite constants so no loop can exceed k iterations (Algorithm 1, p. 4).
3. Verify the bound-reduced program, and record k with every fact (Sections 2 and 3.1, pp. 2–4).

Inference: Verus normally proves loop invariants without imposing a finite unwind bound, so this reduction is a bounded-checking convenience rather than a Verus proof technique. A Verus screening mode could cap test inputs or loop bounds, but must label the result as bounded evidence and not as an `ensures` proof for all executions.

## technique 3: call-graph-ordered compositional verification

What it is. Assertions can depend on facts established in called functions or earlier program points. VIVERRA builds a call graph and orders assertions so callee assertions precede caller assertions after each call. The paper says: “By construction, for every call edge (f → g) at line lc , all assertions of g precede all assertions of f at lines ≥ lc in t.” (Section 3.2, p. 5)

How to do it.

1. Parse the bound-reduced program and construct its function call graph (Algorithm 1, p. 4).
2. Depth-first traverse from `main`, avoiding cycles; collect each function's assertions in logical-line order (Section 3.2, p. 5).
3. Insert a callee's assertions immediately before caller assertions after the call site (Section 3.2, p. 5).
4. For each assertion ai in that sequence, first run a standalone bounded check with no assumptions (Algorithm 2, p. 5).
5. If standalone verification fails or times out, rerun with all preceding assertions promoted to `assume` statements. If that succeeds, record a conditional fact and its dependencies; otherwise mark the assertion failed (Algorithm 2, p. 5).

The formal status distinguishes `VERIFIED`, `C-VERIFIED(S)`, `FALSIFIED`, and `UNKNOWN` (Definition 6, p. 3). Inference: the Verus analogue is to use verified callee contracts as assumptions at call sites and retain dependency metadata. Verus's function contracts and proof lemmas can express these dependencies, but an `assume`-style shortcut must never hide an unproved or external-body function in the product's trusted path.

## technique 4: dependency closure and sound conditional facts

What it is. For a conditionally verified assertion, VIVERRA records the assertions it assumed. It then recursively replaces intermediate dependencies with their root verified assertions. The paper defines: “the dependency closure of assertion ai is defined inductively” (Definition 7, p. 5). The closure makes the natural-language fact's conditions explicit and machine-checkable.

How to do it.

1. Store an implication graph IG mapping each verified assertion to its preceding assumptions (Algorithm 2, p. 5).
2. For a conditional assertion ai, recursively union the dependency closures of each assertion in IG[i] (Definition 7, p. 5).
3. Embed an unconditional fact as `//FACT[k=K]`; embed a conditional one as `//FACT[k=K, cond]` with its dependency indices (Section 3.3, p. 6).
4. Apply Theorem 2's closure guarantee: the assertion holds on k-bounded executions satisfying the root dependencies (Section 3.3 and Appendix A, pp. 6 and 12–13).

Inference: in Verus, store proof dependencies in generated documentation or metadata next to the contract. The closure is useful for auditing which lemmas or callee contracts a proof relies on, but it does not make external assumptions trustworthy. The paper's proof covers the bounded-model semantics and dependency ordering, not the correctness of the generated natural-language mapping.

## technique 5: portfolio checking, normalization, and compile gates

The implementation runs CBMC with and without Bitwuzla and ESBMC with Bitwuzla concurrently; it returns when one reaches a definitive result and reports `UNKNOWN` when all exceed 60 seconds (Section 4, p. 6). The default bound is k = 5. Assertions are flattened to one line so logical line numbers remain stable, and libclang extracts calls and source extents (Section 4, p. 6). Between each LLM generation stage, VIVERRA compiles with gcc and re-prompts on compiler errors before verification (Section 4, p. 6).

Inference: Verus could use a similar gate of syntax/type checking before proof checking, but Verus's verifier should be the acceptance authority. Running several solver configurations may improve bounded coverage, yet results must retain solver, timeout, bound, and status.

## evidence and user impact

Table 1 evaluates 18 tasks and 545 assertions in total (summing the table rows): 503 are `VERIFIED`, 5 are `C-VERIFIED`, and 37 are unverified. The denominator is the 18 generated programs and their generated assertions; the table reports per-task counts, not a random sample of all C programs (Table 1, pp. 7–8). The mean is 27.9 independently verified, 0.3 conditionally verified, and 1.3 unverified assertions per task (Table 1, p. 7). Verification time ranges from 2.4 seconds for `shift_letter` to 2077.6 seconds for `sudoku`, under the 60-second per-solver timeout and k = 5 (Table 1 and Section 5.1, pp. 7–8). The paper attributes failures in `base_addition` to operator over-approximation and spurious counterexamples (Section 5.2, p. 8).

The user study uses 10 multiple-choice questions, at least 20 MTurk workers per question and treatment, and compares unannotated programs with programs containing independently verified `//FACT` comments (Section 5.3, p. 8). Annotated programs had higher accuracy on eight of ten questions, and the first connected-components question took 96 seconds versus 82 seconds while accuracy was 100% versus 40% (Section 5.3, p. 8). Inference: the study supports comprehension for this crowdworker setup, not developer productivity or Verus proof correctness.

## what is proved, measured, and trusted

Theorems 1 and 2 prove soundness of unconditional and dependency-conditional k-bounded facts assuming the bounded model checker is sound (Appendix A, pp. 12–13). The measurements cover assertion statuses, LLM and verification time, and comprehension responses. Trusted pieces include the natural-language task, LLM-generated properties and code, bound-reduction transformation, compiler, libclang extraction, CBMC/ESBMC/Bitwuzla, and the interpretation of verified facts. A bounded fact does not prove behavior beyond k loop traversals.

Inference: the threat to an agent-written verified-Rust product is medium for comprehension and high if bounded facts are mistaken for complete correctness. VIVERRA's partial specifications may leave critical behavior unasserted, and conditional facts can hide a long dependency chain unless closure is shown. Inference: VL should not redo bounded annotation co-generation or call-graph compositional checking as a novelty claim; its open contribution would be a measured bridge from bounded screening to unbounded Verus contracts, including evidence that generated assertions correspond to the user's actual requirements.

## techniques for the catalog

- partial co-specification: elicit properties and synthesize code from one task, then insert assertions linked back to those properties
- bound reduction: tighten loop constants to avoid unwinding failures before bounded model checking
- call-graph assertion ordering: verify callee and earlier assertions before caller assertions that depend on them
- conditional compositional checking: retry failed standalone assertions under explicitly recorded preceding assumptions
- dependency closure: recursively replace intermediate assumptions with root facts and expose the final condition set
- solver portfolio and compile gates: run parallel bounded checkers, normalize assertion locations, and compile after every generated artifact

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
