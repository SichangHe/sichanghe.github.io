# An Empirical Study of LLM-Generated Specifications for VeriFast
(authored by agents unless marked 🧑)
Tag: `fan2026empirical`, [paper](https://arxiv.org/abs/2606.26490v1)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and setup

This paper measures whether general LLMs can fill the auxiliary specifications required by VeriFast, a separation-logic verifier for C, rather than merely write compilable code. It studies 303 functions from 60 programs, each supplied in natural-language (NL), functional-behavior (FB), and functional-behavior-plus (FBP) input forms. The ground truth is a fully specified and verified version. The authors first select one prompt from eight and three models from ten pilot candidates, then run the selected setup on all 303 functions. The PDF's abstract states the core result: “The results show that LLMs preserve functional behavior in source code and specifications (both over 91%), but achieve modest verification success (31.4%).” (Abstract, p. 1.)

The study is an empirical baseline for agent-written specifications. It does not prove a new verifier theorem, and its results concern C/VeriFast. The transfer to Rust/Verus below is explicitly an inference.

## technique 1: represent heap behavior with separation-logic specifications

### what it is

VeriFast specifications describe both functional behavior and ownership of heap cells. A points-to assertion such as `from->val |-> ?val` says a cell contains a value and grants ownership. Separating conjunction `&*&` says the chunks occupy disjoint memory. Recursive predicates summarize structures: `lseg(from,to)` describes an acyclic list segment, and `llist(head)` abbreviates `lseg(head,0)`. A predicate's body is not automatically unfolded reliably, so the verifier needs explicit `open` and `close` statements. Loop invariants must carry both data facts and the heap footprint needed by the next iteration. Inductive lemmas connect predicates that the verifier cannot derive automatically, such as concatenating two list segments.

The append-tail example needs 34 lines of specification against 16 lines of C (Section II-B, p. 3). It opens `llist` and `lseg` before traversing, maintains `lseg(head,curr)` plus current-node points-to chunks in the loop invariant, closes the new list segment, and calls `lseg_merge` to establish the final `llist` postcondition. The paper explains the ownership role directly: “The points-to assertion also denotes unique ownership of the given heap location” (Section II-A, p. 2).

### when to use it

Use recursive predicates for linked structures, explicit points-to chunks for fields accessed in a function, loop invariants for every iteration, and lemmas when a postcondition requires composing or transforming predicates. Include allocation chunks such as `malloc_block_node` when leak checking needs them.

### how to apply it

1. State the abstract data property as a recursive predicate.
2. Put the predicate in the function precondition and postcondition.
3. Open predicates until the exact field chunks needed by a read or write are available.
4. State a loop invariant containing non-nullness, the processed prefix, the current node's fields, the remaining suffix, and allocation ownership.
5. Close local predicates after updates and preserve the invariant across the back edge.
6. Add an inductive lemma for any structural composition the verifier cannot prove, then call it at the merge point.
7. Close the top-level predicate before return and ensure every allocated block is accounted for.

### Verus form (inference)

Verus can encode the data property as a recursive `spec fn` over a mathematical sequence or inductive list, and use `requires`/`ensures` plus `invariant` for loops. Ownership is represented by Rust's borrow discipline and Verus `tracked` permissions rather than VeriFast heap chunks. `open`/`close` do not carry over as commands; their role becomes unfolding a recursive predicate in a proof lemma. Allocation and aliasing facts need explicit ghost state or `tracked` tokens. A direct conversion is therefore a conceptual mapping, not a source translation.

### evidence and limits

This technique is background needed to interpret the benchmark. The paper does not claim that every listed predicate pattern is hard: normal separation-logic functions have a 51.2% average generated-specification success rate, while loops average 11.4% (Table VI, p. 9). The verifier and its default Z3 backend remain trusted; passing VeriFast establishes the encoded contract, not that the contract captures an unstated requirement.

## technique 2: prompt in stages with formal behavior and retrieved verifier examples

### what it is

The authors compare Basic, chain-of-thought, sparse retrieval (RAG-sparse), and dense retrieval prompts, each with whole-program or one-function input. CoT explicitly asks for pre/postconditions, loop invariants, and auxiliary statements in sequence. RAG supplies VeriFast tutorials and related programs. Input strength is varied independently: NL gives only an informal memory description, FB gives formal functional pre/postconditions, and FBP additionally gives constructs needed for successful verification, such as allocation status and integer bounds.

Pilot 1 runs eight prompt variants on 45 author-written functions with GPT-4o. RAG-sparse with function splitting wins: 64% verification versus at most 56% for alternatives, with 63 errors versus more than 67. Pilot 2 runs the selected prompt on ten models and retains Claude 3.7 Sonnet, Gemini 2.5 Pro, and GPT-4o because each reaches at least 60% in the pilot, while four models are at or below 24%. An extra 80-combination pilot reduces concern that selecting GPT-4o for prompt selection biased the result: the two sparse prompts tie at median 16 verified functions, and the chosen models have the best medians across prompts.

### when to use it

Use retrieval when the verifier has a specialized syntax and proof idioms. Split input to one function when context size and precision matter. Supply the strongest correct formal contract available; NL is useful only when no formal contract exists. Treat model and prompt selection as an empirical configuration step, not an assumption.

### how to apply it

1. Build a retrieval corpus from verifier tutorials, library declarations, and verified examples.
2. Retrieve text with BM25 or embeddings for the target function.
3. Give the model the function and its dependencies, preserving the existing source and contract.
4. Ask for one complete output code block; if using CoT, require separate steps for contracts, loop invariants, and `open`/`close`/lemma statements.
5. Run the verifier and record success, compiler errors, practical proof failures, and semantic changes.
6. Select prompts/models on a pilot set, then freeze the configuration for the full benchmark.

### Verus form (inference)

For Verus, retrieve examples of `requires`, `ensures`, `invariant`, `proof`, `lemma`, and `tracked` ownership patterns from a version-matched corpus. Function-level splitting is likely useful because Rust modules carry substantial unrelated context. A repair loop should feed verifier diagnostics and counterexamples back to the model, but any contract change must be checked for weakening or strengthening. CoT text itself is not evidence; only Verus acceptance and semantic regression tests are.

### evidence and limits

The chosen prompt and models are justified by pilots, but pilot selection can still bias results. The full study uses temperature zero and one output per configuration, so it measures a deterministic sample rather than the distribution of stochastic generations. Retrieval quality, model costs, and benchmark leakage affect external validity.

## technique 3: detect specification and code drift before counting verification

### what it is

An output that verifies may have changed the program or weakened its contract. The authors therefore classify source behavior as unchanged/changed and contracts as equivalent, strengthened, weakened, or other. Two authors independently inspect each output, review disagreements, and use Cohen's kappa. This separates verifier acceptance from proving the intended function.

### how to apply it

1. Preserve the input source and contract as the reference.
2. Compile the output and compare source semantics; classify a compiler error or changed return behavior as changed.
3. Compare pre/postconditions semantically, not by text. Mark equivalent, strengthened, weakened, or other.
4. Use at least two reviewers and report agreement.
5. Report verification success jointly with drift rates.

### Verus form (inference)

Run Rust tests or reference-model checks on generated code, then compare Verus contracts by implication: output precondition implies input precondition for strengthening (it accepts fewer callers), and output postcondition implies input postcondition for strengthening. A passing Verus proof does not prevent vacuous contracts, so a contract-diff and behavior-diff gate should run before acceptance.

### evidence and limits

Of 2,727 outputs, 246 (9.0%) changed source behavior; 102 of those were small semantic edits and 143 were edits leading to compiler errors, such as hallucinated header files or entire duplicate source blocks (Section IV-A1; the two counts sum to 245, not 246, as the paper states them). Contracts were equivalent in 2,375 (87%), strengthened in 146 (5%), weakened in 116 (4%), and other in 90 (3%). Contract coding had only fair agreement (kappa 0.38) because NL is ambiguous; source coding had substantial agreement (0.73). The paper warns that “LLMs cannot guarantee the absence of behavioral changes” (Section IV-A3, p. 8).

## technique 4: close the verifier loop with error taxonomy and targeted repair

### what it is

For 50 failing functions, the authors inspect all nine variants per function, yielding 354 failing outputs. They manually repair each until VeriFast verifies, recording severity, component, root cause, and fix. Severity is compile, practical (insufficient automation but logically valid), or theoretical (logically wrong/insufficient). Components are predicate/pre/postcondition (PPP), open/close/assert/leak (OCAL), lemma (LEM), loop invariant (LI), source (SRC), and other.

The taxonomy turns verifier failure into an actionable repair policy. Of 1,652 errors, 383 (23%) are compile, 1,167 (71%) practical, and 102 (6%) theoretical. OCAL accounts for 767 (46%), PPP 381 (23%), LEM 331 (20%), LI 61 (3.6%), SRC 55, and other 57. The most common practical issue is a missing required heap chunk: 858 errors (51.9% of all) fail to expose, close, or preserve the ownership facts needed by symbolic execution. The paper finds that 39.4% of open/close errors can be fixed with VeriFast's auto-feature.

### how to apply it (inference; the paper itself only suggests error-message repair loops, auto open/close, and exposing symbolic heap state, Section IV-C)

1. Run the verifier with default integer-overflow and leak checks.
2. Parse diagnostics into syntax/type, heap-chunk, lemma, invariant, source, and logical categories.
3. Prefer automatic open/close inference for simple cases.
4. For remaining failures, expose symbolic heap state and ask the model to add the smallest missing chunk, lemma, or invariant.
5. Re-run verification and the behavior-drift gate after every repair.
6. Reject theoretical fixes that merely weaken the contract or remove a safety obligation.

### Verus form (inference)

The analogue is a compiler/SMT repair loop that classifies failed proof obligations, missing invariants, trigger problems, and ownership-token mismatches. Verus diagnostics should expose the failing assertion and relevant ghost state. Automatic insertion of proof lemmas can help, but every repair must preserve the original contract and pass independent tests. The VeriFast OCAL category suggests that exposing current permission state may matter more than asking an LLM for longer reasoning.

### evidence and limits

Gemini 2.5 has 424 deep-analysis errors versus 546 for Claude and 682 for GPT-4o; its advantage is mostly fewer OCAL errors (129 versus 205 and 322). Input FBP has 446 errors versus 688 for NL and 518 for FB. These are selected failing samples, not all errors in the 2,727-output population, and the open-ended repair coding has no agreement metric. The benchmark's 31.4% overall success (855/2,727) is the most important denominator.

## results and practical guidance

Across the frozen full configuration, FBP verifies 39.9% (363/909), FB 29.5% (268/909), and NL 24.6% (224/909). Gemini averages 39.7% (361/909), Claude 29.8% (271/909), and GPT-4o 24.5% (223/909). By feature, normal SL is 51.2%, recursive predicates 30.9%, concurrency 12.3%, and loop invariants 11.4%. The paper reports model costs of $233 for Gemini, $232 for Claude, and $171 for GPT-4o for the full study. The strongest operational recommendations are therefore: provide formal contracts, retrieve verifier-specific examples, use function-level context, prefer Gemini in this setting, and expose heap state in repair diagnostics.

## what is proved, measured, and trusted

Measured: behavior preservation, verifier acceptance, and manually categorized fixes over the stated denominators. The paper does not prove a theorem about LLM correctness or VeriFast soundness. Trusted elements include VeriFast, Z3, the ground-truth specifications, the reviewers' semantic classifications, and the assumption that the verified contract expresses the intended behavior. Dataset programs mostly come from a public repository, although ten author-written programs reduce leakage risk. Only C is studied, despite VeriFast supporting Java and unsafe Rust.

## reuse boundary for VL

VL should reuse the separation between contract preservation, verifier acceptance, and repair taxonomy. A product can measure whether an agent changed code, weakened a specification, or merely failed to expose ownership facts. The FBP idea maps to giving a Rust agent a strong behavioral contract plus ownership-relevant invariants before asking for proof details. The OCAL finding argues for structured verifier-state feedback and small repair steps.

VL should not treat this benchmark as evidence that LLMs can autonomously verify Rust. Verus's linear ghost types, SMT triggers, integer arithmetic, and Rust ownership differ from VeriFast's separation logic. A Verus benchmark needs Rust functions, explicit contracts, solver diagnostics, and a semantic regression oracle. The paper's C-only acceptance rates are a baseline for specification generation, not a replacement for a Verus-specific evaluation.

## product risk assessment (inference)

The threat to agent-written verified Rust is substantial for specification authoring: formal contracts improve results, yet only 855 of 2,727 outputs verify, and loops/concurrency remain near 12%. The result supports a product architecture with retrieval, verifier execution, drift detection, and targeted repair rather than one-shot generation. It is less a threat to Verus itself than evidence that verifier-specific knowledge is the bottleneck. A product that claims end-to-end assurance must expose these denominators and reject vacuous or behavior-changing proofs.

## techniques for the catalog

- separation-logic heap contracts — use recursive predicates, points-to ownership, loop footprints, folds/unfolds, and inductive lemmas to verify heap behavior
- staged retrieval prompting — select a verifier-aware prompt and model on pilots, retrieve examples, and split context at function boundaries
- behavior-drift auditing — compare generated code and contracts semantically before treating verifier acceptance as success
- diagnostic repair taxonomy — classify compiler, heap, lemma, invariant, source, and logical failures and repair the smallest missing obligation
- symbolic-heap feedback — expose verifier ownership state and combine automatic open/close inference with LLM repairs

## study status

This study was written from the batch PDF whose first page matches the exact title “An Empirical Study of LLM-Generated Specifications for VeriFast”. Quotes are checked against the extracted PDF text by the study gate; the study is staged pending the full gate.

Audited 2026-10-12 against the paper: checked all counts, percentages, fractions and table figures (Tables III-VIII, pilot numbers, costs, 855/2,727 and the per-input and per-model splits) and found them correct; checked page and section references and fixed three (34-line count is Section II-B p. 3, Table VI is p. 9, the no-guarantee sentence is p. 8); removed missing code from the source-change causes (the paper names hallucinated headers and duplicate source blocks; duplicate or missing applies to contracts); corrected the direction of the precondition implication in the Verus form of technique 3; softened the 39.4% auto-feature claim to the paper's can be fixed; marked the technique 4 repair steps as inference. Verus forms are marked inference and sound as conceptual mappings. Not checked: the replication package and the ground-truth programs, which are outside the PDF.
