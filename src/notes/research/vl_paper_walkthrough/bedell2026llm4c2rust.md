# LLM4C2Rust: Large Language Models for Automated Memory-Safe Code Transpilation
(authored by agents unless marked 🧑)
Tag: `bedell2026llm4c2rust`, [paper](https://doi.org/10.48550/arxiv.2604.15485) (arXiv:2604.15485v1, 16 Apr 2026, as printed on the paper's first page)

## scope and central finding

LLM4C2Rust is a retrieval-augmented, two-stage C-to-Rust transpilation pipeline. It first generates Rust that may be unsafe, then asks a model to remove raw-pointer dereferences and unsafe casts. A Rust compiler and a custom bash script count safety-related diagnostics and unsafe lines; model self-reports are compared with those measurements. The paper calls o3-mini a Small Language Model (SLM) and GPT-4o and GPT-4-Turbo LLMs (Section 4.2, p. 10). The paper's abstract describes the approach as “a Retrieval-Augmented Generation (RAG)–assisted framework that integrates an LLM with a Small Language Model (SLM) to perform a C/C++-to-Rust transpilation with a focus on enhancing memory safety.” (Abstract, p. 1).

The paper does not teach a formal proof technique. Its “verification” is compiler checking plus syntactic counting. The paper states functional equivalence with the C code as a goal (Section 1, contribution 2, p. 2) but reports no test or differential execution of the Rust output, and does not report whether each final program compiles; its conclusion lists “differential verification” as future work (Section 8, p. 18). It evaluates seven GNU Coreutils programs—uniq, cat, pwd, truncate, head, split, and tail—using GPT-4o, GPT-4-Turbo, and o3-mini (Section 4.2, p. 8; Section 5.1, p. 10).

## technique 1: balanced source segmentation

What it is. The pipeline scans C source character by character, tracks `{` and `}`, and emits a segment only when braces are balanced and the accumulated text exceeds 500 characters. This avoids splitting a function or other unbalanced block while keeping prompts within model limits (Section 4.2, p. 8). The paper states: “This approach ensures that the code is never split in the middle of a function or other unbalanced block.” (Section 4.2, p. 8).

When to use it. Use balanced segmentation when a whole source file exceeds context limits but correctness depends on preserving function or block structure. It is suitable as a prompt-preparation step, not as a semantic decomposition proof.

How to apply it.

1. Read the file one character at a time and increment/decrement a brace balance counter (Section 4.2, p. 8).
2. Append characters to a temporary buffer; when balance returns to zero and the buffer exceeds 500 characters, save the segment (Section 4.2, p. 8).
3. Attach a program-level natural-language summary to every segment (Section 4.2, p. 9).
4. Re-segment generated Rust that exceeds a 5,000-character limit per segment; the file is re-chunked into 4,000-character segments with a 15-character overlap (Section 4.2, p. 9).

Verus form. Inference: represent the scanner state with a Rust struct and prove a balance invariant with a loop `invariant` that the counter equals opens minus closes in the consumed prefix. Use `requires` for balanced input boundaries and `ensures` that each emitted segment starts and ends at balance zero. This does not prove that braces are the only syntactic delimiters or that splitting preserves cross-function semantics.

Evidence and limits. Segment counts vary with structure: uniq 12, cat 10, pwd 12, truncate 4, head 20, split 22, and tail 42; original sizes range from 333 to 2,205 C lines (Table 1, p. 8). Inference: the method tracks braces only, so preprocessor conditionals, comments, strings, macros, and language constructs with non-brace dependencies can still make a segment semantically incomplete. The paper does not report an ablation against function-based or token-based segmentation.

## technique 2: two-stage unsafe-to-safer transpilation

What it is. Stage one translates each C segment into Rust while allowing unsafe constructs needed to preserve behavior. Stage two passes each generated segment through an LLM prompt that requests improved memory safety and specifically reduced or eliminated raw-pointer dereferences and unsafe type casts (Section 4.2, p. 9). The refined segments are then reassembled into one Rust file per program.

When to use it. Use this decomposition when direct safe-Rust synthesis is too difficult and a behavior-preserving intermediate can be refined separately. It is especially relevant to legacy C with pointer-heavy code.

How to apply it.

1. Produce a short program-purpose summary and attach it to every source segment (Section 4.2, p. 9).
2. Ask the model for an initial Rust segment with unsafe constructs permitted (Section 4.2, p. 9).
3. Ask a second model call to improve memory safety, remove raw-pointer dereferences, and remove unsafe casts (Section 4.2, p. 9).
4. Reassemble refined segments while preserving the original program's functional intent (Section 4.2, p. 9).
5. Compare both versions with compiler diagnostics and unsafe-line counts (Section 4.2, p. 9).

Verus form. Inference: treat the initial and refined functions as separate implementations of a shared mathematical specification. Put the specification in `spec fn`s, use `requires` for input validity and `ensures` for behavioral equivalence, and write proof functions connecting the refinement to the original model. Rust's `unsafe` code is not made safe merely by reducing syntactic pointer operations; Verus requires a model and proofs for any unsafe or external behavior.

Evidence and limits. GPT-4-Turbo's compiler counts show cat falling from 5 to 0 raw-pointer diagnostics, split from 0 to 0, and tail from 0 to 0, while tail still has UTCs 1 to 1 and unsafe lines 45 to 24 (Table 5, p. 15). GPT-4o reduces cat from 29 to 0 RPDs and 97 to 2 unsafe lines, but truncate gains a UTC from 0 to 1 (Table 5, p. 15). o3-mini regresses on cat: RPDs 7 to 8, UTCs 9 to 11, and unsafe lines 52 to 66 (Table 5, p. 15). These are seven-program, model-specific counts, not universal safety guarantees.

## technique 3: retrieval-augmented safety prompting

What it is. RAG retrieves relevant Rust documentation, safe pointer-handling patterns, and casting examples, then appends them to each refinement prompt. The paper's RAG background describes embedding external documents and a query, then selecting the most similar chunks with a similarity check (“e.g., Cosine Similarity”, Figure 1 caption, p. 3; Section 2.4, p. 4). For external documents it first tries 200-character chunks with 20-character overlap, then moves to 500-character chunks with 50-character overlap, which the authors say lowered retrieval latency and token usage “without degrading relevance” (Section 4.2, p. 9; no relevance measurement is reported). The paper does not name the embedding model, the retrieval depth, or how retrieved text is inserted into the prompt.

When to use it. Use retrieval when the model needs domain-specific Rust ownership, borrowing, pointer, or casting guidance that may not be reliably recalled from the prompt alone.

How to apply it.

1. Build an external corpus from Rust documentation, safety practices, and safe coding examples (Section 4.2, p. 9).
2. Embed corpus chunks and the query; retrieve semantically similar chunks (Section 2.4, p. 4; Figure 1, p. 3).
3. Use 500-character chunks with 50-character overlaps for the documented configuration (Section 4.2, p. 9).
4. Provide the retrieved context to the LLM during the refinement step (Section 4.2, p. 7, second component; p. 9). The summary-plus-segment user query is shown in Figure 4 (p. 10).
5. Set temperature to zero and select the first returned choice (`.choices[0]`) for reproducibility (Section 4.2, pp. 9–10).

Verus form.

Evidence and limits. The authors compare model self-reported safety counts with compiler counts to study hallucination. GPT-4o's tail RPD estimate is 25 versus compiler-verified 34, an undercount of about 26.5% (Section 5.3.1, p. 11). o3-mini self-reports tail RPDs 29 to 14 while the compiler counts 3 to 14 (Section 5.3.3, p. 13; Table 5, p. 15), and the paper says o3-mini “exhibits the highest hallucination rate among the evaluated systems” (Section 5.3.3, p. 13). The paper concludes that RAG “substantially reduces hallucinations” (Section 6, p. 16). Inference: the evidence does not isolate RAG. The comparison is “Original Rust (w/o RAG)” against “Final Rust (w/ RAG)”, so RAG is confounded with the second refinement call; the paper reports no run with refinement but without retrieval, no significance test, and the hallucination rate H defined in Section 4.1 is never computed (Section 5.2 says hallucination was assessed “qualitatively”). The paper does not evaluate retrieval precision or sensitivity to chunk size beyond the stated engineering choice.

## technique 4: compiler-based safety oracle and self-report audit

What it is. The framework compiles both original and refined Rust with `rustc`, extracts error codes associated with raw-pointer dereferences (E0133, E0392, E0793) and unsafe casts (E0604–E0607), and scans source text for `unsafe { ... }` blocks and unsafe functions. It reports raw pointer dereferences (RPDs), unsafe type casts (UTCs), unsafe blocks (UBs), and unsafe lines of code (ULoCs) (Section 4.2, p. 9; Section 5.2, pp. 10–11). The authors explicitly say: “Rather than relying solely on the models’ self-reported counts of RPDs and UTCs, we compile each Original Rust (w/o RAG) and Final Rust (w/ RAG) program and extract safety-relevant diagnostics.” (Section 5.3.4, p. 13).

When to use it. Use this as a cheap post-generation filter for compiler-detectable unsafe constructs and to detect when model claims disagree with executable tool output.

How to apply it.

1. Compile each original and refined program with `rustc` (Section 5.3.4, p. 13).
2. Count RPD-related and UTC-related diagnostics by error code (Section 5.3.4, pp. 13–14).
3. Scan source for unsafe blocks/functions and count UB and ULoC (Section 5.3.4, p. 14).
4. Compare these counts with the model's self-reported RPD/UTC counts (each segment is examined by the LLM to estimate its own RPDs and UTCs, Section 4.2, p. 9) and compute percentage change as `(Count_original − Count_final) / Count_original × 100` when the original count is nonzero (Section 5.2, p. 11).
5. Mark a previously zero count that becomes nonzero as a regression (“!–”) rather than forcing a percentage; mark zero-to-zero as “–” (Section 6, p. 15).

Verus form. Inference: use compiler diagnostics as triage only. The Verus equivalent is to state memory-safety and behavioral properties in `requires`/`ensures`, prove loop and ownership facts with `invariant` and proof functions, and reject outputs with unproved assumptions. A scan for `unsafe` or error codes cannot prove pointer safety, aliasing, data-race absence, or functional equivalence.

Evidence and limits. The compiler counts are objective relative to the selected error codes, but the paper itself concedes that these proxies “do not capture all semantic aspects of unsafe behavior (e.g., logical data races or misuses within safe blocks).” (Section 7.3, p. 17). Thus “compiler-verified” in this paper means counted compiler diagnostics, not a formal memory-safety theorem. The study covers only seven Coreutils programs and reports no execution-equivalence test; model-reported trends can be wrong even when they sound plausible. Inference, from my own knowledge of rustc and not checked in the paper: E0133 flags unsafe operations used outside an `unsafe` block, E0392 flags an unused type parameter, and E0793 flags references to packed-struct fields, so these codes may not count raw-pointer dereferences that sit inside correctly written `unsafe` blocks; the paper states only that the codes “correspond to undefined behavior or violations caused by raw pointer dereferences” (Section 5.3.4, p. 13).

## what is measured, trusted, and already done

The headline measurements are per-program counts, not pass rates over a large benchmark. GPT-4o compiler counts give final RPDs of zero for uniq, cat, pwd, truncate, head, and split (split from 12), and 1 for tail (from 34); final UTCs are 0, 1, 0, 1, 0, 0, 3 for uniq through tail (Table 5, p. 15). GPT-4-Turbo leaves no final RPDs in any of the seven rows, and its only final UTC is 1 for tail; final unsafe lines are 24 for tail (Table 5, p. 15). o3-mini has final RPDs 4, 8, 3, 0, 7, 0, 14 for uniq through tail and final UTCs 0, 11, 0, 0, 4, 14, 13 (Table 5, p. 15). The numbers use one row per model/program pair; there is no denominator beyond the seven programs for each model. The paper also compares its percentage changes with C2SaferRust and LAC2R columns (Tables 6–8, p. 16) and concludes that GPT-4o and GPT-4-Turbo “outperform prior approaches” (Section 6, p. 16); it does not say whether the baseline columns were re-run on these seven programs or taken from the cited papers, so Inference: that comparison is weak evidence.

Trusted components include the C input and its intended behavior, segmenter, retrieval corpus and embedding/search procedure, LLM outputs, Rust compiler version and diagnostics, the custom bash scanner, and the error-code mapping. Compiler diagnostics do not establish that a translated program matches C behavior, and zero unsafe-line counts can coexist with logical bugs or unsafe external calls. The study's threat section states that model outputs vary with prompt, retrieval, and API versions, and that seven Coreutils utilities are a limited external-validity sample (Section 7, intro and 7.2, p. 17).

## techniques for the catalog

- balanced structural segmentation: scan brace balance and emit sufficiently large complete blocks so prompts do not split functions or unbalanced regions
- two-stage unsafe-to-safe refinement: first preserve behavior with permissive Rust, then prompt a second pass to remove pointer dereferences and unsafe casts
- retrieval-augmented safety prompting: embed Rust safety documentation and retrieve overlapping chunks into each refinement prompt
- compiler safety oracle: count selected rustc diagnostics, unsafe blocks, and unsafe lines independently of model self-reports
- self-report hallucination audit: compare model-estimated unsafe counts with compiler counts and mark zero-to-nonzero regressions explicitly
