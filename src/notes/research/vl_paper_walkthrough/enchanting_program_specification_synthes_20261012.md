# Enchanting Program Specification Synthesis by Large Language Models Using Static Analysis and Program Verification
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## what AutoSpec does
AutoSpec synthesizes ACSL specifications for C programs by making static analysis and Frama-C verification control an LLM. It generates preconditions, postconditions, loop invariants, and assigns clauses, rather than asking a model to write all specifications in one response. The abstract gives the core mechanism: “candidate specifications are validated in each round to avoid error accumulation during the interaction with LLMs” (abstract, p. 1). A candidate that is illegal or unsatisfiable is discarded; a valid but insufficient candidate remains for the next round. The goal is a full proof of a chosen assertion.

The paper evaluates 251 programs across four benchmarks and a six-function slice of an X509 parser. Its headline is 199/251 (79%) solved, written also as 1.592x and as 59.2% more, (199 - 125) / 125; the paper does not say which baseline count 125 is (abstract, p. 1; Introduction, pp. 3–4). The framework is specific to C, ACSL, and Frama-C WP; mappings to Rust/Verus below are inferences.

## technique 1: extend the call graph with loops and decompose bottom-up

What it is. AutoSpec builds an extended call graph whose nodes are both functions and loops. It starts at the function containing the target assertion, traverses the AST, and adds edges for calls and loop containment. Generation then runs from leaves upward, so a caller sees the contracts of its callees and a loop is treated as a separately specifiable component.

When to use it. Use this for nested calls, multiple loops, pointers, and arrays where a whole-program prompt is too large and where callers depend on callee behavior. Bubble sort illustrates the order: specify `swap`, then the inner loop, then the outer loop, then `bubbleSort` (Section 2, pp. 4–5).

How to do it.

1. choose the source location of the assertion to prove
2. initialize the graph with its containing function
3. traverse basic blocks; add each called function as a node and each encountered loop as a node
4. push newly discovered nodes onto a work list until transitive closure is reached
5. initialize an annotation template with placeholders at every node
6. traverse the graph depth-first from the root, postponing a node until all callees have specifications
7. pass only the node's code and generated callee specifications to the LLM

Algorithm 1 gives the exact graph construction: “if bb calls a function M” adds `M` and an edge; “if bb is a loop entry for loop L” adds the loop node and edge (Algorithm 1, p. 8). Omitting unrelated code reduces context and token cost.

Verus form (inference). Build a Rust call/loop graph from the MIR or AST. Treat each loop as a proof node with its own invariant and each function as a contract node. Generate leaf `requires`/`ensures` first, then callers. Rust borrow information can be included as a callee fact, but Verus still needs explicit arithmetic, collection, and ownership invariants. Macro expansion, traits, and closures require a graph construction policy that this C paper does not address.

Evidence and limits. The decomposition ablation on 51 Frama-C programs raises solved cases from 9/51 for a three-shot whole-program prompt to 26/51 with decomposition (Table 5, p. 17). A function with an unavailable dependency can still fail: the `pow` function in `<math.h>` was not traced into the prompt, so AutoSpec could not synthesize its needed specification despite retries (Case 2, p. 18).

## technique 2: hierarchical, iterative specification generation

What it is. At each graph node, the LLM emits a list of candidate specifications into a placeholder. AutoSpec validates that list, inserts the surviving clauses, and later revisits the node to add more clauses. It processes bottom-up in a depth-first stack and stops when the target assertion verifies or a fixed iteration bound is reached. The default evaluation bound is five iterations (Section 3, p. 7).

When to use it. Use this when one response is likely to omit a crucial invariant or frame/assigns fact. Iteration lets the model add a missing relation after the verifier reveals that an initially satisfiable set is inadequate.

How to do it.

1. initialize code without specifications and push the target root onto a stack
2. push callees that have not been processed in the current iteration
3. when all callees are ready, prompt the model with the component, its relevant callees, a role/instruction, specification language, and few-shot examples
4. insert a placeholder output and parse candidate ACSL clauses
5. validate syntax immediately; for functions, validate satisfiability immediately; postpone inner-loop satisfiability until the outer loop provides context
6. retain only legal and satisfiable candidates, then insert them
7. check whether the target assertion now verifies
8. if not, run another iteration, inserting new placeholders after retained clauses; stop at the bound
9. optionally simplify by deleting one clause at a time when the assertion still verifies

Algorithm 2 shows the mechanics: `spectmp = spec generation(C, f, LLM)`, `specf = spec validation(C, spectmp)`, and `C.insert(specf)` (Algorithm 2, p. 9). In the pointer-sum case, the first round generated valid pointer and result clauses but missed that the callee did not assign through the pointers; the next round added `assigns nothing`, which made the caller proof succeed (Figure 5, p. 18).

Verus form (inference). Keep a mutable contract-and-lemma set for each function/loop node. After each candidate batch, run Verus and retain only clauses that compile and are satisfiable in the current context. For loops, delay checks that depend on outer invariants, mirroring AutoSpec's inner-loop treatment. Simplification should be a deletion test followed by a complete replay. Verus's `decreases` and ownership facts should be first-class candidate types, not only Boolean invariants.

Evidence and limits. On the 51-program Frama-C benchmark, five repeated runs solved 31 programs overall. The 0-shot, 1-shot, 2-shot, and 3-shot whole-program settings solved 5, 8, 6, and 9; decomposition reached 26; one-pass decomposition reached 27; five-iteration enhancement reached 31 (Table 5, p. 17). The result attributes the largest gain to decomposition and hierarchical generation, with a smaller iterative gain of 4 cases.

## technique 3: verifier-led candidate validation and simplification

What it is. Frama-C WP acts as a filter for both syntax and semantics. For each candidate, AutoSpec removes illegal specifications after compilation errors and removes unsatisfiable clauses after verification failures. It then checks adequacy by attempting the target assertion. Once adequate, it can minimize the annotation set.

When to use it. Use validation whenever an LLM can generate plausible but contradictory specifications. A satisfiable clause can still be too weak, so adequacy must be checked separately.

How to do it.

1. parse each candidate in the component's specification language
2. run the verifier; on a compile error, identify and remove the illegal clause
3. on a proof failure, identify the unsatisfiable clause and retry without it
4. retain clauses only after the source program satisfies them
5. invoke the same verifier with the target assertion to test adequacy
6. once adequate, attempt deletion of each clause; keep a deletion only if the assertion remains provable

The paper distinguishes satisfiability from adequacy: “the validation phase is crucial ... [to ensure] not only legal and satisfiable but also adequate to verify the target assertion” (Section 3.3, pp. 10–11). Simplification removes weak or duplicate clauses. The authors give two equivalent bubble-sort postconditions, one relating `array[i-1]` to `array[i]` and the other `array[i]` to `array[i+1]`, as an example where either can be deleted without changing the proof (Section 3.3, p. 11).

Verus form (inference). Run `cargo verus` with each candidate clause and reject parse/type/proof failures. Be careful: Verus `assume`, `external_body`, axioms, and unchecked FFI can create satisfiable but untrusted facts; the gate must reject or label them. Adequacy is the successful target proof. Minimality can be checked by deleting one invariant/lemma and replaying, but a minimal set is not necessarily readable or robust under code changes.

Evidence and limits. Frama-C validation dominates runtime, from 1.3 to 994.9 seconds across benchmarks; LLM queries average under ten seconds (RQ3, p. 16). The system therefore saves time by generating fewer, higher-quality candidates than approaches that search for many candidates for one hour or twelve hours. It still assumes the source compiles and that the requested property is consistent with the program; otherwise the paper expects failure after the iteration bound (Section 4.1, pp. 12–13).

## technique 4: few-shot, context-focused prompting

What it is. Each component prompt includes a system role, the specification-language instructions, a highlighted `>>> INFILL <<<` placeholder, only relevant component/callee code, and a few input-output examples. The examples teach ACSL syntax and quantifier patterns without requiring the LLM to digest the whole program.

The bubble-sort example uses a few-shot invariant for initializing an array: `forall integer j; 0 <= j < i ==> ((char*)p)[j] == 0;`. The authors report that this example enabled a valid quantified invariant for the inner loop in one query (Section 3.2, p. 10). Inference, not the paper's: this suggests a concrete prompting technique: retrieve examples by the local data/control pattern, not merely by project name.

Verus form (inference). Retrieve verified examples matching ownership shape, slice mutation, loop nesting, and quantifier use. Keep the output parser strict and run the verifier on every response. Few-shot context is a generation aid and must never be trusted as a proof.

## evidence, denominators, and trust

The main evaluation uses gpt-3.5-turbo-0613 with max tokens 2048 and temperature 0.7, plus a Llama-2-70b comparison; Frama-C WP is the checker (Section 4.1, p. 13). Frama-C-problems has 51 programs; AutoSpec solves 31/51, with five runs per program and an average time of 89.17 seconds over the detailed table. X509-parser has six manually selected functions, all solved, with mean 214.58 seconds across functions; two difficult functions succeeded in only 2/5 runs and took up to roughly 957 seconds in the table (Tables 2–3, pp. 12–14). The broader 79% figure is 199/251 across Frama-C-problems (31/51), SyGuS (114/133), OOPSLA-13 (38/46), and SV-COMP (16/21); the six X509-parser functions are not in the 251, and 79% is not a rate over that sample.

For loop invariants, AutoSpec solves 114/133 SyGuS cases, 38/46 OOPSLA-13 cases (82.60%), and 16/21 SV-COMP cases (Table 4, p. 15). Code2Inv solves 73/133 SyGuS and 9/46 OOPSLA-13; CLN2INV solves 124/133 SyGuS but 0/46 OOPSLA-13. On 100 mutated benchmark programs, 98% of results hold after variable renaming and statement/branch switching; with Llama-2-70b on the 51 Frama-C set, AutoSpec solves 25/51 versus ChatGPT's 31/51 (Threats to Validity, p. 19).

Proved: Frama-C proves ACSL clauses and the selected program properties. Measured: synthesis success, iteration count, verifier/query/simplification time, and ablation differences. Trusted: the target property, the C parser and static-analysis graph, ACSL and Frama-C, model/API behavior, manually extracted X509 targets, and the assumption that all external dependencies needed for a proof are included. The model can propose a false clause, but validation should discard it; an omitted dependency or an inconsistent target leads to failure rather than a repaired specification.

## what VL should reuse and threat to the product

VL should reuse loop-aware call graphs, bottom-up contract generation, candidate validation after every round, a hard iteration bound, and deletion-based simplification. The paper's most transferable control is separating “satisfiable” from “adequate”: a clause may describe some executions yet be insufficient to prove the target. VL should add Rust-specific dependency tracing for traits, macros, and external functions before asking an agent for a proof.

Threat assessment (inference): AutoSpec is a direct threat to any product claim that LLMs can write complete specifications in one pass, because its ablation shows that decomposition gives the largest gain (9 to 26 of 51) and iteration a further 4. It also exposes a product risk: a proof pipeline can fail because context is missing, not because the generated Rust is wrong. The opportunity is a Verus version with explicit trust labels for generated contracts, checked lemmas, external bodies, and simplification results. The 79% C result cannot be transferred numerically to Rust, but the architecture is highly relevant to agent-written verified Rust.

## techniques for the catalog

- loop-aware call graph: represent functions and loops as proof nodes and generate contracts from callees upward
- hierarchical specification rounds: ask for local candidates, validate them, retain them, and revisit nodes until adequacy or a fixed bound
- satisfiability/adequacy filter: reject illegal or inconsistent clauses, then separately test whether the target assertion is proved
- few-shot local prompting: give the LLM only the component, relevant callees, a placeholder, and matching specification examples
- deletion simplification: remove clauses one at a time and replay the target proof to obtain a smaller checked specification
Audited 2026-10-12 against the paper: checked every number (251 and 199 with the 31+114+38+16 breakdown, Tables 1 to 5, X509 times, Llama and mutation figures, 5 iterations, model settings), Algorithms 1 and 2 and the steps built from them, Section 3.3 validation and simplification, the quotations, and the Verus forms (sound, all marked inference). Changed: 199/251 wrongly listed X509-parser among its benchmarks; 125 baseline not defined by the paper; main is not a specified component in the Section 2 walkthrough; the Algorithm 1 quotation said L where the paper says bb; the example-retrieval advice marked as inference; the claim that repeated checking is essential softened to the ablation numbers; the two equivalent postconditions described exactly; all page references were off against the PDF (25 pages) and are now PDF pages. Not in the findings file. Could not check the Frama-C and Verus behavior claims beyond the paper.
