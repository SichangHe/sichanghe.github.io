# Large Language Models for Validating Network Protocol Parsers
(authored by agents unless marked 🧑)
Tag: `zheng2025validating`, [paper](https://doi.org/10.1145/3575693.3575731)

## scope and result

PARVAL compares a network parser implementation with its natural-language protocol standard. It uses multiple LLM agents to retrieve parsing code, isolate it, extract a format specification from code and from the RFC, and differentially compare the two specifications. The authors describe the aim: “It transforms both protocol standards and their implementations into a unified intermediate representation, referred to as format specifications, and performs a differential comparison to uncover inconsistencies.” (Abstract, p. 1.) The evaluation uses FRRouting stable/8.4's C BFD parser and RFC 5880 (Section 4.1, p. 4).

The tool finds seven unique implementation bugs, five previously unknown, and two RFC issues. Its reported false-positive rate is 5.6%: 34 true inconsistencies and two extraction errors among 36 reported discrepancies (Table 3, p. 5). Inference: this is empirical validation assistance, not a soundness or completeness proof. The paper explicitly says: “While our approach does not guarantee soundness or completeness, our evaluation on a real-world protocol demonstrates its practical effectiveness.” (Introduction, p. 2.)

## technique 1: dependency-aware retrieval and parser isolation

What it is. PARVAL starts at an entry parsing function and retrieves only code relevant to the input buffer. A retrieval agent follows data dependencies, control dependencies, and calls, while Tree-sitter extracts definitions of structs, macros, and helper functions. A module-isolation agent writes those pieces into a standalone parser that accepts `(buffer, length)` and returns a boolean. The paper states: “Starting from the entry parsing function, it traces input buffer usage through data and control dependencies, as well as function calls, to collect essential context such as structs, macros, and helper functions.” (Section 3.1, p. 3.)

How to do it.

1. Give the agents the entry parsing function and the task requiring a two-argument parser that returns true for valid input and false otherwise (Figure 3, p. 3).
2. Ask retrieval to inspect callees and dependencies iteratively. In the BFD example it retrieves `bfd_recv_ipv4`, `bfd_recv_ipv6`, and `BFD_GETVER`, and identifies `msgbuf` and `mlen` as the packet and its length (Section 3.1, p. 4).
3. Use AST retrieval to read each required definition from the code base (Section 3.1, p. 4).
4. Have the isolation agent write and execute the standalone module, using build errors and missing-definition feedback to request more retrieval (Section 3.1, p. 4).
5. Test that the isolated module preserves parsing behavior. The paper warns that protocols whose accepted inputs depend on configuration or negotiation state may require extra control-flow modeling (Section 4.2.1, p. 5).

Verus form. Inference: represent the isolated parser as a Rust function over a byte slice and length, with a spec predicate for the accepted format. Use `requires` for slice/length bounds and `ensures` to relate the Boolean result to the predicate. Prove that every read is within bounds and that the isolated function refines the original parser's relevant behavior. The LLM retrieval and Tree-sitter tooling remain outside the verified binary; their result is a candidate module that Verus must check.

Evidence and limits. On BFD, manual ground truth gave 100% precision and recall for isolated parsing logic (Section 4.2.1, p. 5). The authors caution that context-sensitive protocols can be broadened or restricted by isolation. Inference: isolation is safe only when environmental state is either irrelevant or modeled explicitly.

## technique 2: extract a code format specification with syntax and semantic refinement

What it is. SpecAgent translates the isolated parser into CodeSpec in a format DSL (the implementation uses 3D language and EverParse for syntax checking). It iterates syntax checks and symbolic semantic tests. The tests generate positive packets that should be accepted and negative packets that should be rejected; discrepancies drive refinement.

How to do it.

1. Feed the isolated executable module to SpecAgent and request fields, types, lengths, value constraints, and ordering in the DSL (Section 3.2, p. 4).
2. Run the DSL grammar checker and revise CodeSpec until syntax-valid (Section 3.2, p. 4).
3. Generate symbolic positive and negative packets from CodeSpec and execute them against the isolated parser (Section 3.2, p. 4).
4. If a positive case is rejected, instrument the parser and give the execution trace to SpecAgent; if a negative case is accepted, identify the violated constraint and strengthen CodeSpec (Section 3.2, p. 4).
5. Repeat until tests agree, then retain CodeSpec for differential comparison.

The paper says: “If a positive case fails or a negative case passes, it indicates a semantic mismatch.” (Section 3.2, p. 4.) On the isolated BFD module, CodeSpec extracted all 11 field names, 11 field types, and 4 field constraints with 100% precision and recall (Table 1, p. 4). The full implementation produced the same 11/11/4 result (Table 4, p. 5).

Verus form. Inference: make the DSL format a Verus `spec fn` predicate over a byte sequence and prove parser postconditions in terms of that predicate. Positive/negative generated packets become proof lemmas or bounded executable tests. A test-guided refinement loop is useful for finding missing constraints, but passing generated tests does not prove the predicate is complete; Verus requires quantified reasoning or exhaustive finite enumeration for that claim.

## technique 3: extract and normalize a specification from natural-language standards

What it is. SpecAgent reads an RFC and writes DocSpec in the same DSL as CodeSpec. It converts prose into field names, types, lengths, ranges, and constraints so that code and documentation are comparable. The paper reports: “This transforms the natural language description of the message format—such as field definitions, length constraints, and value ranges—into a formal representation.” (Section 3.3, p. 4.)

How to do it.

1. Provide the RFC and the DSL grammar to SpecAgent (Section 3.3, p. 4).
2. Extract explicitly stated fields and types, then constraints and ranges.
3. Run the DSL syntax checker and revise malformed expressions (Section 3.3, p. 4).
4. Compare the resulting DocSpec with a manually built ground truth when measuring extraction quality.
5. Preserve uncertainty: implied constraints can be absent even when names and types are correct.

For BFD, DocSpec contained 37 field names and 37 field types with 100.0% precision and recall; it extracted 15 field constraints with 100.0% precision and 58.3% recall (Table 2, p. 5). The denominator for constraint recall is the 15 manually identified constraints. The authors attribute missing constraints to implications rather than explicit RFC text (Section 4.2.3, p. 5).

Verus form. Inference: treat DocSpec as a candidate specification that must be reviewed against the RFC and linked to Rust parsing contracts. Use Verus predicates for explicit constraints and mark omitted implied rules as assumptions until formalized. Do not present an LLM's prose interpretation as a proved requirement; prove only the concrete predicate that reviewers accept.

## technique 4: differential comparison and manual triage

What it is. PARVAL compares CodeSpec and DocSpec, ignoring field-name differences that do not alter behavior, and flags type or constraint mismatches. Humans classify each mismatch as a parser bug, an RFC issue, or an extraction error. The paper describes the final step: “Using Differential Analysis, we identify discrepancies such as mismatched fields or constraints. Each inconsistency is manually examined to determine whether it is a false positive or a true semantic mismatch.” (Section 3.4, p. 5.)

How to do it.

1. Align CodeSpec and DocSpec fields by semantic position and format role (Section 3.4, p. 5).
2. Report type and constraint differences; do not treat names alone as behavioral differences (Section 4.2.4, p. 5).
3. Trace each discrepancy back to source and RFC text.
4. Classify true discrepancies as implementation bugs or standard issues; group entries with the same root cause.
5. Confirm bug novelty against existing reports.

Table 3 reports 21 field-type inconsistencies and 15 field-constraint inconsistencies, 36 total. Of the 36, 34 are true and two are extraction errors, yielding 5.6% false positives (Table 3, p. 5). Table 5 classifies the 34 true inconsistencies as 32 implementation bugs and two RFC issues. Table 6 groups them into seven unique implementation bugs, five marked new; Table 7 lists two previously undocumented RFC issues (Section 4.4, p. 5).

Verus form. Inference: differential comparison can generate proof obligations: for every flagged field, require a Rust parser contract to imply the accepted-format predicate and require the RFC-derived predicate to be reviewed. A mismatch should block release until either the code, specification, or extraction is corrected. Verus can prove the chosen parser contract, but cannot prove that an RFC interpretation is the intended standard without a human-approved formalization.

## what is proved, measured, and trusted

PARVAL's measurements support extraction and bug-finding claims for one BFD implementation and RFC. It does not prove soundness or completeness; both CodeSpec and DocSpec are LLM-generated and manually inspected (Section 5, p. 6). The trusted or assumed components include the DSL grammar, EverParse syntax checker, Tree-sitter dependency extraction, test-generation adequacy, manual ground truth, differential alignment, and the human classification of true inconsistencies. The manual effort is about 10 minutes to identify the entry parser and about 20 minutes to compare and analyze discrepancies; Stages 2 and 3 are fully automated (Section 4.5, p. 6).

The result is informative but narrow: one protocol, one implementation, and one RFC. Inference: the 5.6% rate should not be generalized to other parsers, languages, or standards. A parser whose behavior depends on negotiated state can invalidate the isolation assumption, and an RFC's implied constraints can depress recall without causing false positives.

## what VL should not redo and product threat

Prior model-checking, static lifting, and differential-fuzzing tools already detect some parser errors, but the paper identifies their limitations: formal models require manual effort, fuzzers often target crashes rather than semantic violations, and differential testing needs multiple independent implementations (Section 6.1, p. 6). Inference: VL should not treat an LLM-extracted format as a replacement for a verified parser contract; the reusable contribution is the staged path from retrieval to isolation to differential proof obligations.

Inference: threat to agent-written verified Rust is moderate. PARVAL could expose missing length, type, and constraint checks before Verus proof work, especially when standards are prose. It does not generate Verus proofs, does not establish parser completeness, and leaves manual triage. Its strongest product use is as a front-end that supplies explicit candidate predicates and counterexamples to a subsequent Verus proof.

## techniques for the catalog

- dependency-aware parser retrieval — recursively follow input data/control dependencies and calls from the entry parser
- executable parser isolation — refactor parsing into a two-argument standalone module for direct testing
- code format lifting — translate parser behavior into a DSL and refine it with positive/negative symbolic tests
- RFC format lifting — turn prose fields, types, and constraints into the same DSL representation
- differential specification analysis — compare code and document formats and triage mismatches
- trace-guided refinement — instrument rejected positive inputs and use parser traces to correct extracted formats
Checked 2026-10-15 against paper zheng2025validating: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
