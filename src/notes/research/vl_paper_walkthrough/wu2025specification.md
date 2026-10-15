# Specification-Guided Repair of Arithmetic Errors in Dafny Programs using LLMs
(authored by agents unless marked 🧑)
Tag: `wu2025specification`, [paper](https://www.semanticscholar.org/paper/089f33c768eb660d0f491d256a1d18d27d4baefa)

## scope and result

The paper presents an automated program-repair tool for arithmetic faults in Dafny. Its central design is to use the Dafny specification as the correctness oracle, use Hoare-logic entailments for static fault localization, ask an LLM for a replacement line, and accept a replacement only after Dafny verification. The abstract states: “In this paper, we present an APR tool for Dafny, a verification-aware programming language that uses formal specifications — including pre-conditions, post-conditions, and invariants — as oracles for fault localization and repair.” (Abstract, p. 1)

The reported benchmark is DafnyBench. The abstract reports “89.7% fault localization success rate and GPT-4o mini yields the highest repair success rate of 74.18%.” (Abstract, p. 1) The body separates two datasets and gives more specific denominators. Inference: VeruLaw could reuse the architecture, but the Dafny syntax and verifier integration must be replaced by Verus-compatible Rust and Verus proof checking.

The method assumes one bug per input and a correct specification. The approach section says: “We assume that each program contains a single bug and that the formal specification is correct.” (Section 4, p. 6) Inference: this assumption is a direct threat to an agent-written Verus product because an agent can change a contract, omit a needed invariant, or generate a semantically wrong but provable specification.

## technique 1: specification-guided static fault localization

What it is. The tool computes the logical program state at key control points with Hoare rules, then checks whether that state entails the method's formal postconditions. The paper says: “At each key control point — such as return statements and loop boundaries — we compute the expected post-state using Hoare rules.” (Section 4.1, p. 7) A failed entailment marks the statement associated with that state as suspicious. No concrete execution or test suite is needed. The authors emphasize: “Note that we only use Hoare logic rules to reason about the program, thus not relying on symbolic execution.” (Section 4.1, p. 8)

When to use it. Apply this when a verified-language program has a failing specification and the repair search needs a ranked set of likely statements. The paper focuses on arithmetic bugs and uses developer-provided preconditions, postconditions, and loop invariants.

How to do it, following the paper.

1. Parse the buggy Dafny member and its specification (Section 4.1, p. 7).
2. Propagate state conditions through each statement using Hoare rules. For an `if`, create separate states for true and false branches; for assignments, substitute the updated value; for loops, check initialization, maintenance, and termination entailments (Section 5.1, p. 9).
3. At returns and loop boundaries, form an entailment from the computed state to each applicable postcondition (Section 4.1, p. 7).
4. Encode each entailment as a Dafny lemma: the left side becomes `requires` and the right side becomes `ensures` (Section 4.1, p. 7).
5. Submit those lemmas to the Dafny verifier. If one fails, mark its associated statement suspicious and rank the resulting lines (Sections 4.1 and 5.1, pp. 7–9).

The paper's worked example is an incorrect absolute-value method. In the negative branch it returns `x*1`; the resulting state is `x < 0 && res == x*1`, and the failed implication is “(x < 0 && res == x*1) ==> (x < 0 ==> res == -x)” (Listing 1.2, p. 7). The tool therefore marks line 14 as suspicious (Section 4.1, p. 8).

Verus form. Inference: represent the executable Rust function with a `requires` precondition and `ensures` postconditions, then write a separate `proof fn` whose `requires` states the computed state and whose `ensures` states the desired postcondition. Use `assert` and ordinary Verus proof steps to establish each entailment. Inference: a Rust `if` can be analyzed by proving each branch's postcondition; a loop needs a Verus loop `invariant` declaration (the invariant is written on the loop, not called as a function). Inference: Dafny AST state tracking and automatic lemma generation do not carry over directly; a Verus integration would need to parse Rust/Verus syntax or instrument proof obligations at the source level.

Evidence and boundary. Across both datasets, the paper says the suspicious list contained the original buggy line in 89.7% of considered programs (Section 6.2, p. 13). The detailed counts are 397/447 (88.8%) for `hints_removed` and 2387/2657 (89.8%) for `ground_truth` (Sections “Evaluation on hints_removed” and “Evaluation on ground_truth,” pp. 14–15). The 89.7% aggregate is consistent with 2784/3104 = 89.69% after rounding. Inference: this is evidence for the particular mutated arithmetic benchmark, not for arbitrary Rust bugs.

Failures are concrete. The authors report output-parsing errors, state entailments that point to a later update when a variable is updated twice, missing termination reasoning, incorrectly validated lemmas, 20-second timeouts, unsupported statements or ghost variables, and lexicographic sorting that associates `check_10` before `check_2` (Section 6.2, pp. 14–15). They also report that about 50% of `hints_removed` lines and about 70% of `ground_truth` lines were flagged on average, with entire methods often flagged (Section 6.2, pp. 14–15). Inference: a Verus repair agent should treat localization as a candidate generator, not as proof that the flagged line is the root cause.

## technique 2: bounded LLM patch synthesis with verifier feedback

What it is. For each suspicious line, the tool sends the surrounding method, specification, and a `//buggy line` marker to an LLM. It asks for only a replacement line, inserts that line, and reruns Dafny. The paper's pipeline is explicit: “For each suspicious line, it then queries an LLM to generate candidate fixes. Each candidate is inserted into the program and checked by the verifier.” (Section 4, p. 6)

When to use it. Use this after static localization has produced suspicious lines and the specification is trusted enough to serve as an oracle. The authors evaluate GPT-4o mini through an API and local Llama 3, Mistral 7B, and Llemma 7B models (Sections 4.2 and 5.2, pp. 8–10).

How to do it, following the paper.

1. Iterate over the ranked suspicious lines (Section 4, p. 7).
2. Build a system prompt that assigns a Dafny formal-methods role, explains that a verifier error identifies a line marked `//buggy line`, and asks for a correction (Section 5.2, pp. 9–10).
3. Put the complete method context and marked source in the user prompt and request a fixed line (Listing 1.5, p. 11).
4. Insert the returned line into the original source and run the Dafny verifier (Sections 4.2 and 5.2, pp. 8–10).
5. If verification succeeds, save the patch. If it fails, query again, up to three attempts for that line and model; after the third failure, continue to the next suspicious line (Section 4.2, p. 9).
6. Return the verified patches; if none verifies, report that the fault could not be fixed (Section 4.2, p. 9).

The final prompt explicitly says: “Do not include explanations.” and “Return only the fixed line.” (Listing 1.5, p. 11) The paper caps output at 30 tokens (Section 5.2, p. 11). Inference: for Verus, substitute Rust/Verus context, a Verus error or failed proof obligation, and a request for a syntactically valid replacement or proof fragment. Candidate acceptance must invoke the Verus verifier; a model response that merely compiles is insufficient. Inference: Verus proof edits may require changing an invariant or adding an `assert`, so the one-line restriction should be relaxed only when the proof obligation requires a multi-line change.

Evidence. Table 2 reports success rates over 447 `hints_removed` mutations and 2657 `ground_truth` mutations: GPT-4o mini repairs 320/447 (71.59%) and 1985/2657 (74.71%); Llama 3 repairs 206/447 (46.09%) and 1256/2657 (47.27%); Mistral 7B repairs 191/447 (42.73%) and 1233/2657 (46.41%); Llemma 7B repairs 18/447 (4.03%) and 13/2657 (0.49%) (Table 2, p. 14). These fractions match the displayed percentages. The table caption gives the model setting and denominators: “Repair Success Rate and Efficiency by Model for all 447 and 2657 hints_removed and ground_truth Mutations” (Table 2, p. 14).

Most successful repairs were early. Table 1 gives 596, 95, and 44 for `hints_removed`, displayed as 81.09%, 12.93%, and 5.99%, and 3472, 692, and 322 for `ground_truth`, displayed as 77.40%, 15.43%, and 7.18% (Table 1, p. 13). Inference: the displayed percentages imply denominators 735 and 4486, whereas the evaluation datasets contain 447 and 2657 mutations. The paper does not explain this discrepancy; the raw counts and percentages cannot both describe the stated mutation denominators. The summary's 74.18% also differs from the weighted GPT-4o mini fraction 2305/(447+2657) = 74.26%. These are reporting inconsistencies, not evidence to silently correct.

The paper reports that among successful repairs averaged over all models, 95.33% modified a suspicious line, while GPT-4o mini averaged 97.05% (Section 6.2, p. 13). For `ground_truth`, 91.34% of successful patches modified the correct line and 80.78% exactly matched the original correct line (Section 6.2, p. 15). Inference: verifier acceptance proves conformance to the supplied Dafny specification, not that the patch matches the historical intended implementation.

## what is proved, measured, and trusted

The verifier proves the supplied Dafny program satisfies its formal specifications after a patch. The experiments measure localization and repair success on artificially mutated DafnyBench programs. The implementation uses Dafny's AST and built-in Z3-based verifier (Section 5, p. 9). Trusted assumptions include specification correctness, the soundness and behavior of Dafny/Boogie/Z3, the mutation benchmark, model/API execution, and the mapping from failed entailments to statements. The authors state: “Bugs can also reside in the specification, but repairing or suggesting improvements to specs is outside the scope of this work.” (Limitations, p. 15)

The threat to an agent-written verified-Rust product is Inference: medium to high. The architecture can reject many locally invalid patches, but it cannot detect a wrong contract, unsupported behavior, missing environment assumption, or a repair that changes the intended semantics while preserving the written postconditions. Inference: the paper's artificial arithmetic mutations and single-bug assumption understate multi-edit, concurrency, ownership, unsafe-code, and dependency failures that Verus agents may encounter.

## what VL should not redo

The paper already implements and evaluates the basic loop of localization with formal entailments, LLM patch generation, verifier checking, and retries. Inference: VL should not claim this pipeline, bounded retries, or specification-as-oracle validation as new contributions. Inference: a useful VL extension would measure the same design on Verus-specific obligations, ownership and borrowing, loop invariants, proof-only code, and multi-line proof repairs, while recording the exact contract and verifier configuration.

## techniques for the catalog

- specification-guided Hoare localization: propagate states, encode state-to-specification entailments as verifier lemmas, and rank statements whose entailments fail
- verifier-in-the-loop LLM repair: prompt an LLM for a marked-line replacement, insert it, verify it, and retry at most three times before moving on
- strict output prompting: assign a formal-methods role, provide full marked context, cap output length, and require only the replacement line
- mutation-based verification evaluation: filter verified benchmark programs, inject arithmetic operator/coefficient/variable mutations, and score localization and verified repair by explicit denominators

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
