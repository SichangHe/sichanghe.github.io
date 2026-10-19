# SynCode: LLM Generation with Grammar Augmentation
(authored by agents unless marked 🧑)
Tag: `ugare2024syncode`, [paper](https://arxiv.org/abs/2403.01632v4)

## problem and guarantee
SynCode constrains LLM decoding using a supplied context-free grammar (CFG). Its soundness theorem means retaining all valid next tokens; rejecting every invalid token requires the additional conditions of its completeness theorem. The practical implementation uses short accept sequences and can allow invalid tokens (Sections 4.4–4.5, pp. 13–15). The abstract says, “SynCode uses an offline-constructed, efficient lookup table, the DFA mask store, created from the DFA (Deterministic Finite Automaton) of the language’s grammar for efficient generation.” (Abstract, p. 1.) The evaluated targets are JSON, SQL, Python, and Go. SynCode does not enforce semantic constraints or task-specific JSON schemas, and does not guarantee termination with a complete output (Sections 4.4, 4.7, and 6.1).

The desired invariant is that each intermediate string remains a valid prefix, meaning it can be extended to a string in the grammar (Section 3.1, p. 6). This is conditional: “An implementation of SynCode with a short length of accept sequences although sound, may not guarantee completeness.” (Section 4.4, p. 14.) Inference: valid-prefix preservation could be expressed as a Verus loop invariant, but proving it requires the stronger token-rejection property, not merely SynCode’s soundness property.

## technique 1: parse a partial output and compute accept sequences

At generation step `k`, let `Ck` be the current text. SynCode lexes it with one-character lookahead and no backtracking. It partitions `Ck` into a lexically fixed prefix and remainder `r`, the suffix that might change token type when more characters arrive (Section 3.2 and Section 4.2). If the final token is incomplete, `r` is the unlexed suffix; if the output ends in a complete token, that final token is still retained as `r` because extension may change its lexical type. The paper's example is `ret` becoming keyword `return` when `urn` is appended (Section 4.2).

How to do it.
1. Lex `Ck` with one-character lookahead and preserve all but the final potentially changing token.
2. Return `(Λ□, r)` where `Λ□` is the terminal sequence for the fixed prefix and `r` is the remainder (Definition 5, Section 4.2).
3. Run a bottom-up LR parser on `Λ□`.
4. Enumerate accept sequences `A`: terminal sequences that can follow `Λ□` while remaining a valid partial sentence (Definition 7). For `def is`, the parser returns fixed terminal `{def}`, remainder `is`, and the example accept sequence `{name,lpar,rpar}` (Section 4.2). This three-terminal example illustrates the definition; the implementation uses sequences of length 1 or 2 (Section 4.5).

Verus form. Inference: model the lexer/parser state as an enum and prove a `spec fn` relation between bytes and terminal prefixes. Use `requires` for a valid parser state and `ensures` that returned remainders concatenate to the original input. The one-character-lookahead assumption must appear in the contract; Verus cannot infer it from an English parser description.

Evidence and limits. The method depends on the lexer assumption to keep `r` small and previous tokenization stable (Section 4.2). Inference: languages with context-sensitive lexing or unbounded lookbehind need a different remainder model.

## technique 2: offline DFA mask store

A terminal in the grammar is represented by a regular expression and a DFA. For each DFA state and terminal sequence of length `α`, SynCode precomputes a boolean mask over the LLM vocabulary. The store maps `Mα(q, Λ)` to tokens satisfying `dmatch` from state `q` with the subsequent terminal sequence `Λ`. This test also accepts tokens whose prefixes finish the available sequence, even if their remaining characters are invalid (Definitions 8, 10, and 12, Sections 4.3–4.4).

How to do it.
1. Build a DFA for every terminal regular expression.
2. Enumerate all DFA states, length-`α` terminal sequences, and vocabulary tokens offline (Section 4.6).
3. Evaluate `dmatch` for each combination: accept a walk ending in a live state, a walk consuming the terminal sequence before the token ends, or a walk continuing through subsequent terminal DFAs (Definition 10).
4. Store each result as a binary vocabulary mask.
5. At inference, consume remainder `r` by walking the first DFA in each accept sequence, look up `Mα`, and obtain one mask per sequence.
6. Union masks for all `Λ ∈ A`; apply the union to model scores before decoding (Section 3.2 and Algorithm 2).

The paper explains why this is efficient: “The mask store allows more efficient computation of a subset of tokens Vk.” (Section 3.2, p. 7.) The union overapproximates valid tokens: all valid tokens remain, but extra tokens may remain too. Theorem 2 establishes completeness when all length-`d` accept sequences are included and `d` exceeds every vocabulary token’s character length (Section 4.4).

Verus form. Inference: represent a mask as a finite set and express soundness as inclusion of every token preserving `valid_prefix`. Proving that every enabled token preserves `valid_prefix` instead corresponds to the paper’s completeness property and needs its stronger assumptions. The tokenizer vocabulary and DFA implementation remain trusted unless separately specified.

Evidence and limits. Store construction is one-time but costs memory. For Python/Go, Table 5 reports 1.06–1.87 GB and 380.49–603.03 seconds across CodeGen-350M, WizardCoder-1B, and LLaMA-7B (one row per model/grammar). The Python grammar has 94 terminals. Section 3.3 gives per-step complexity `O(T_union · |A|)`, with average `|A| < 10` in the experiments and worst case equal to the terminal count. Here `T_union` is the time for a mask union. Section 4.6 gives the fuller LR(1) bound `O(|Γ| · len(r) + T_union · |Γ|)` and simplifies it by treating remainder length as constant. Inference: changing tokenizer, grammar, or terminal regex requires a new store.

## technique 3: masked generation loop

Algorithm 3 tokenizes the prompt once. Each iteration obtains model scores, decodes the current token sequence to text, parses it to compute `A` and `r`, computes a grammar mask, applies it to scores, and selects one token using the underlying decoding strategy. It stops at EOS or `nmax` (Section 4.4, pp. 13–14).

How to apply it.
1. Start with prompt `C0` and tokenizer `T`.
2. For each step up to `nmax`, compute scores from the LLM.
3. Parse `Ck` into accept sequences and remainder.
4. Compute and apply the union mask, excluding disallowed tokens from selection (Algorithm 3, lines 7–9; constrained masking in Section 2.1).
5. Apply greedy, sampling, or beam decoding to the remaining choices.
6. Stop if the token is EOS; otherwise append it and repeat. SynCode permits EOS only when the output belongs to the grammar’s language (Section 6, p. 18).

Verus form. Inference: a wrapper could require a decoder contract saying each appended token preserves `valid_prefix`. Connecting mask membership to that contract requires the completeness assumptions or a separate validity check. SynCode’s practical short-sequence mask alone does not establish that contract; such a proof would also not establish termination or model quality.

Theoretical boundary. Theorem 1 proves soundness: every token preserving syntactic partial validity is retained. Theorem 2 proves completeness only when the accept-sequence lookahead `d` exceeds token length and contains all possible length-`d` sequences (Section 4.4). Shorter sequences can be sound but incomplete, conservatively allowing extra tokens. The paper explicitly warns, “SynCode provides guarantees of completeness for syntactically correct partial programs. However, it does not guarantee convergence to a syntactically correct and complete program.” (Section 6.3, p. 20.)

## technique 4: grammar integration for real languages

A user provides EBNF grammar rules. The grammar must be unambiguous LALR(1) or LR(1) for the corresponding parser (Section 4.7). Python uses a Lark grammar; Go uses an LL(*) grammar converted to LR(1). The implementation tracks acceptable Python indentation and allows users to add constraints beyond CFGs by overriding functions; the paper also describes handling Go’s semicolon insertion (Section 4.7). Inference: these extensions need separate specifications to connect them to the CFG-based theorem.

Inference: for Rust proof synthesis, a Rust grammar can constrain delimiters, item structure, and Verus annotation syntax, while a second semantic stage runs `cargo verus`. Grammar masks cannot ensure ownership, contracts, arithmetic facts, or solver success. Existing Verus syntax must be taken from the project's accepted grammar; inventing grammar productions would make the monitor unsound with respect to the compiler.

## evidence

JSON-Mode-Eval has 100 zero-shot problems (Section 5). Table 1 reports zero syntax errors for SynCode on both Llama-2-7B-chat and Gemma2-2B-it under original and explicit prompts. Validation accuracy is 66%/84% for Llama (original/explicit) and 99%/100% for Gemma; these percentages use the 100-problem dataset. Standard generation has 98% and 59% syntax-error rates on original prompts for Llama and Gemma, respectively (Section 6.1). Remaining SynCode schema failures are semantic: wrong data types, missing required fields, or extra fields (Section 6.1).

For SQL, Spider has 1,034 problems: 250 easy, 440 medium, 174 hard, and 170 extra hard (Section 6.2). With Llama-3.2-3B, SynCode raises execution success from 67.4% to 81.4% and execution accuracy from 28.6% to 34.9%; averages are over all 1,034 queries (Table 2). For GPL generation, each model generates 20 samples per HumanEval problem and one per MBXP problem, yielding 4,154 samples per language for each model (Section 6.3). Table 3 shows syntax-error reductions generally above 90%; for LLaMA-7B Python, 291 to 2 errors (99%), and Go, 725 to 10 (99%) on HumanEval. Functional correctness changes are small: LLaMA-7B Python pass@1 is 11.2% standard versus 11.5% SynCode, and Go 3.8% versus 4.25% (Table 4). Inference: syntax validity is a necessary filter but explains little of the remaining semantic gap.

## trusted boundary and VL implications

Inference: a verification boundary would include the grammar, lexer/parser, tokenizer vocabulary, DFA construction, and mask application. The LLM chooses among retained tokens, which may include invalid tokens with the practical short sequences. Applying SynCode to Rust could reduce malformed output, but syntax acceptance cannot establish proof acceptance. A relevant VL experiment would measure compilation and Verus-proof success after masking, separately counting syntax-valid, compile-valid, and proof-valid outputs. The paper evaluates JSON, SQL, Python, and Go, not Rust or Verus (Sections 5–6).

## techniques for the catalog
- remainder-aware incremental parsing — retain only the potentially changing lexical suffix and compute parser accept sequences
- DFA mask store — precompute vocabulary masks for DFA states and terminal lookahead sequences
- conservative masked decoding — union masks for accept sequences, retaining all valid tokens while potentially allowing extra tokens
- grammar-backed language integration — compile EBNF/LR grammars, including indentation extensions, into reusable token constraints

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Thereafter, the mask store can be efficiently loaded into memory and used for repeated inference."): checked all quotations, numbers, section/page references, technique steps, and inference labels; corrected soundness/completeness direction, practical token-validity claims, DFA matching cases, generation-loop steps, sample denominators, and the paper link using its arXiv identifier; did not reproduce experiments, inspect implementation code, independently verify proofs, or validate the proposed Verus applications.
