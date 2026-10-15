# SynCode: LLM Generation with Grammar Augmentation
(authored by agents unless marked 🧑)
Tag: `ugare2024syncode`, [paper](https://www.semanticscholar.org/paper/46a41357eadac1459c81588136c5c053abfeefe4)

## problem and guarantee
SynCode constrains LLM decoding so every selected token keeps the partial output extendable to a string in a supplied context-free grammar (CFG). The paper's abstract says, “SynCode uses an offline-constructed, efficient lookup table, the DFA mask store, created from the DFA (Deterministic Finite Automaton) of the language’s grammar.” (Abstract, p. 1.) The target is syntax: JSON, SQL, Python, and Go. It does not check types, schema meaning, termination, or functional correctness.

The key invariant is that each intermediate string remains a valid prefix. The paper states: “By ensuring that at each intermediate step, the invariant that the LLM partial generation Ck is in the set Lp (G) is maintained, we can guarantee that upon completion of the generation process, Cn will indeed be syntactically valid.” (Section 3.1, p. 6.) Inference: this is analogous to a Verus loop invariant over a parser state, but SynCode enforces the invariant by token masks while Verus proves program properties with contracts and invariants.

## technique 1: parse a partial output and compute accept sequences

At generation step `k`, let `Ck` be the current text. SynCode lexes it with one-character lookahead and no backtracking. It partitions `Ck` into a lexically fixed prefix and remainder `r`, the suffix that might change token type when more characters arrive (Section 3.2 and Section 4.2). If the final token is incomplete, `r` is the unlexed suffix; if the output ends in a complete token, that final token is still retained as `r` because extension may change its lexical type. The paper's example is `ret` becoming keyword `return` when `urn` is appended (Section 4.2).

How to do it.
1. Lex `Ck` with one-character lookahead and preserve all but the final potentially changing token.
2. Return `(Λ□, r)` where `Λ□` is the terminal sequence for the fixed prefix and `r` is the remainder (Definition 5, Section 4.2).
3. Run a bottom-up LR parser on `Λ□`.
4. Enumerate accept sequences `A`: terminal sequences that can follow `Λ□` while remaining a valid partial sentence (Definition 7). For `def is`, the parser returns fixed terminal `{def}`, remainder `is`, and accept sequence alternatives such as `{name,lpar,rpar}` (Section 4.2).

Verus form. Inference: model the lexer/parser state as an enum and prove a `spec fn` relation between bytes and terminal prefixes. Use `requires` for a valid parser state and `ensures` that returned remainders concatenate to the original input. The one-character-lookahead assumption must appear in the contract; Verus cannot infer it from an English parser description.

Evidence and limits. The method depends on the lexer assumption to keep `r` small and previous tokenization stable (Section 4.2). Inference: languages with context-sensitive lexing or unbounded lookbehind need a different remainder model.

## technique 2: offline DFA mask store

A terminal in the grammar is represented by a regular expression and a DFA. For each DFA state and terminal sequence of length `α`, SynCode precomputes a boolean mask over the LLM vocabulary. The store maps `Mα(q, Λ)` to tokens that can continue from state `q` through sequence `Λ` (Definitions 11–12, Section 4.3).

How to do it.
1. Build a DFA for every terminal regular expression.
2. Enumerate all DFA states, grammar terminals, and vocabulary tokens offline (Section 4.6).
3. For each state and terminal sequence, simulate token characters and mark tokens that reach a live DFA state.
4. Store each result as a binary vocabulary mask.
5. At inference, consume remainder `r` by walking the first DFA in each accept sequence, look up `Mα`, and obtain one mask per sequence.
6. Union masks for all `Λ ∈ A`; apply the union to model scores before decoding (Section 3.2 and Algorithm 2).

The paper explains why this is efficient: “The mask store allows more efficient computation of a subset of tokens Vk.” (Section 3.2, p. 7.) The union overapproximates valid tokens, proving soundness; with sufficiently long LR lookahead, Theorem 2 establishes completeness (Section 4.4).

Verus form. Inference: represent a mask as a finite set and prove that every enabled token preserves a `valid_prefix` predicate. A Verus proof can establish set-union soundness for a fixed grammar and tokenizer; the tokenizer vocabulary and DFA implementation remain trusted unless separately specified.

Evidence and limits. Store construction is one-time but costs memory. For Python/Go, Table 5 reports 1.06–1.87 GB and 380.49–603.03 seconds across CodeGen-350M, WizardCoder-1B, and LLaMA-7B (one row per model/grammar). The largest Python grammar has 94 terminals; per-step complexity is `O(T_union · |A|)`, with average `|A| < 10` and worst case equal to the terminal count (Sections 3.3 and 4.6). Inference: changing tokenizer, grammar, or terminal regex requires a new store.

## technique 3: masked generation loop

Algorithm 3 performs constrained decoding with any underlying strategy. Each iteration tokenizes the context, obtains model scores, parses the current output, computes `A` and `r`, generates a grammar mask, multiplies scores by the mask, and decodes one token. It stops at EOS or `nmax` (Algorithm 3, Section 4.7).

How to apply it.
1. Start with prompt `C0` and tokenizer `T`.
2. For each step up to `nmax`, compute scores from the LLM.
3. Parse `Ck` into accept sequences and remainder.
4. Compute the union mask and set scores of disallowed tokens to zero (Algorithm 3, lines 1–12).
5. Apply greedy, sampling, or beam decoding to the masked scores.
6. Append the token and repeat.

Verus form. Inference: use a verified wrapper around a decoder whose `ensures` says the appended token keeps `valid_prefix`. The mask check is an executable guard; a Verus lemma can connect the guard to the grammar theorem. This proves the wrapper's behavior, not model quality or completion.

Theoretical boundary. Theorem 1 proves soundness: accepted tokens preserve syntactic partial validity. Theorem 2 proves completeness only when the accept-sequence lookahead `d` exceeds token length and contains all possible length-`d` sequences (Section 4.4). Shorter sequences can be sound but incomplete, conservatively allowing extra tokens. The paper explicitly warns, “SynCode provides guarantees of completeness for syntactically correct partial programs. However, it does not guarantee convergence to a syntactically correct and complete program.” (Section 6.3, p. 20.)

## technique 4: grammar integration for real languages

A user provides EBNF grammar rules. The grammar must be unambiguous LALR(1) or LR(1) for the corresponding parser (Section 4.7). Python uses a Lark grammar; Go uses an LL(*) grammar converted to LR(1). The implementation supports custom indentation constraints for Python and can add parser rules beyond CFGs, although those extensions are outside the core theorem (Section 4.7).

Inference: for Rust proof synthesis, a Rust grammar can constrain delimiters, item structure, and Verus annotation syntax, while a second semantic stage runs `cargo verus`. Grammar masks cannot ensure ownership, contracts, arithmetic facts, or solver success. Existing Verus syntax must be taken from the project's accepted grammar; inventing grammar productions would make the monitor unsound with respect to the compiler.

## evidence

JSON-Mode-Eval has 100 zero-shot problems (Section 5). Table 1 reports zero syntax errors for SynCode on both Llama-2-7B-chat and Gemma2-2B-it under original and explicit prompts. Validation accuracy is 66%/84% for Llama (original/explicit) and 99%/100% for Gemma; these percentages use the 100-problem dataset. Standard generation has 98% and 59% syntax-error rates on original prompts for Llama and Gemma, respectively (Section 6.1). Remaining SynCode schema failures are semantic: wrong data types, missing required fields, or extra fields (Section 6.1).

For SQL, Spider has 1,034 problems: 250 easy, 440 medium, 174 hard, and 170 extra hard (Section 6.2). With Llama-3.2-3B, SynCode raises execution success from 67.4% to 81.4% and execution accuracy from 28.6% to 34.9%; averages are over all 1,034 queries (Table 2). For GPL generation, HumanEval and MBXP together yield 4,154 samples per language. Table 3 shows syntax-error reductions generally above 90%; for LLaMA-7B Python, 291 to 2 errors (99%), and Go, 725 to 10 (99%) on HumanEval. Functional correctness changes are small: LLaMA-7B Python pass@1 is 11.2% standard versus 11.5% SynCode, and Go 3.8% versus 4.25% (Table 4). Inference: syntax validity is a necessary filter but explains little of the remaining semantic gap.

## trusted boundary and VL implications

Trusted inputs include the grammar, lexer/parser, tokenizer vocabulary, DFA construction, and mask application. The LLM remains responsible for choosing among allowed tokens. Inference: product risk is reduced parser waste and malformed Rust, but false confidence remains if agents treat syntax acceptance as proof acceptance. What is already done is formal token masking with soundness/completeness theorems and broad syntax experiments; VL should not redo this as a generic grammar-constrained-decoding novelty. A relevant extension is measuring compile and Verus-proof success after SynCode masking, with denominators separated by syntax-valid, compile-valid, and proof-valid outputs.

## techniques for the catalog
- remainder-aware incremental parsing — retain only the potentially changing lexical suffix and compute parser accept sequences
- DFA mask store — precompute vocabulary masks for DFA states and terminal lookahead sequences
- sound masked decoding — union masks for accepted sequences and filter logits at every generation step
- grammar-backed language integration — compile EBNF/LR grammars, including indentation extensions, into reusable token constraints

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
