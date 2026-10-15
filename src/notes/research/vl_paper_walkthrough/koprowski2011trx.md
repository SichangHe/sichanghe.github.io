# TRX: A Formally Verified Parser Interpreter
(authored by agents unless marked 🧑)
Tag: `koprowski2011trx`, [paper](https://doi.org/10.2168/lmcs-7(2:18)2011)

## what is proved and measured
TRX is a Coq formalization of parsing-expression grammars (PEGs), extended with typed semantic actions (XPEGs), a well-formedness checker, and an extracted parser interpreter. Its central claim is total correctness: termination and correctness with respect to PEG/XPEG semantics. The abstract says the extracted parser is “terminating and correct with respect to its grammar and the semantics of PEGs” (abstract, p.1). Case studies cover an XML grammar and a 216-rule Java grammar. Figure 8 measures ten XML files totaling 40 MB and nearly 11,000 JDK files totaling 117 MB: TRX-cert takes 128.9 s and 662.4 s respectively, versus TRX-int 40.0 s and 289.3 s (sec.6.2, pp.19–20).

## technique: PEG/XPEG deep embedding
What it is: PEG expressions use empty, character/range/literal, sequence, prioritized choice, greedy repetition, and-and/not predicates; XPEGs index expressions by semantic-value types and add coercion actions (secs.2 and 3, pp.3–8).
When to use it: Use PEGs for deterministic recursive-descent parsing with integrated lexical rules, prioritized disambiguation, and unlimited lookahead. Use XPEGs when parsing must return an AST or computed value.
How to do it: (1) define finite terminals and nonterminals; (2) define `Pexp` and start symbol; (3) use `/` for prioritized choice and `*`/`+` for greedy repetition; (4) add typed semantic actions `e[↦]f`; (5) encode the grammar as Coq inductive `pexp`/`PExp`; (6) prove or check its well-formedness before interpreting. The paper’s arithmetic grammar integrates whitespace, numbers, right-associative addition/multiplication, and actions that evaluate the expression (Examples 2.3 and 3.3, pp.5, 8).
Verus form: Inference: model grammar ASTs and parser states with Verus `struct`s and `spec fn`s; use `requires`/`ensures` to state that a parser returns a suffix and semantic value satisfying the grammar. Verus does not supply Coq’s indexed inductive family directly, so semantic-value typing needs explicit enums/ghost types.
Evidence: “PEGs are essentially a declarative way of specifying recursive descent parsers” (sec.1, p.2).
Limits: PEG prioritized choice is intentionally unambiguous but unsuitable for natural-language ambiguity; packrat parsing has linear time with high memory constants (sec.2.2, p.5).

## technique: semantic determinism and parser lemmas
What it is: The formal XPEG semantics returns either failure or a suffix plus semantic value. The authors prove prefix consumption, unambiguity, and that repetition cannot iterate a successful zero-consuming expression (Theorems 3.4–3.5 and Lemma 3.6, pp.9).
When to use it: Use these lemmas as reusable proof obligations for parser combinators and to justify termination measures.
How to do it: define inductive big-step semantics with a step count; prove by induction that every success leaves a suffix; invert two derivations to show equal result and step count; prove `e*` is undefined when `e` succeeds without consuming input. The no-empty-loop lemma is needed by the well-formedness proof (sec.3.2, p.9).
Verus form: Inference: encode parse results as an enum and prove suffix-length decrease for successful recursive calls. Use ghost lemmas for determinism and no-zero-progress repetition; recursive executable code must have a Verus `decreases` measure.
Evidence: “If (e, s) … r1 and (e, s) … r2 then m1 = m2 and r1 = r2” (Theorem 3.5, p.9).
Limits: These properties rely on PEG’s prioritized/greedy semantics and do not make arbitrary left-recursive grammars terminating.

## technique: fixed-point grammar analysis for termination
What it is: TRX computes properties `P0` (can succeed without consuming), `P>0` (can succeed after consuming), and `P⊥` (can fail), then derives a well-formed set by monotone fixed point. A grammar is well formed when all its subexpressions are in `WF`; Theorem 4.2 proves well-formed grammars complete (secs.4.1–4.3, pp.9–12).
When to use it: Use this extrinsic check before interpreting a deeply embedded grammar to reject direct or mutual left recursion and repetitions that can loop without consuming input.
How to do it: (1) collect all subexpressions `E(G)`; (2) initialize property sets empty; (3) apply Figure 5 inference rules to a fixpoint; (4) apply Figure 6 well-formedness rules, requiring sequence tails when the prefix may be empty and requiring repetition bodies not in `P0`; (5) iterate until no set grows; (6) prove `E(G)=WF`; (7) pass that proof to the interpreter. The Coq checker uses `wf_measure = |E(G)|−|wf|` as a decreasing measure (sec.5.2, pp.14–15).
Verus form: Inference: represent finite expression IDs and bit-set properties; implement a ghost fixed-point lemma and prove monotone growth bounded by `E(G)`. Attach the resulting proof to a parser function with `decreases` on remaining input plus grammar-state measure.
Evidence: “If G is well-formed then it is complete” (Theorem 4.2, p.11).
Limits: General grammar completeness is undecidable; the syntactic test rejects some unreachable left-recursive grammars and all left recursion (sec.4.1, p.10).

## technique: typed Coq encoding and proof-carrying interpreter
What it is: Coq `PExp : Type → Type` indexes each expression by its semantic result type; the interpreter receives a proof that an expression belongs to a well-formed grammar and returns a dependent pair containing a parse result plus a derivation witness (sec.5.1–5.3, pp.12–17).
When to use it: Use this architecture when generated code must be extracted only after the specification and termination proof are accepted.
How to do it: define finite nonterminal enumeration and `prod_type`; encode constructors (`Seq`, `Choice`, `Star`, `Not`, `Action`); compute `WFexps`; define `parse` with grammar-membership proof and a well-founded measure; pattern-match on expressions according to Figure 4; prove returned result has a semantic derivation. Extraction discards proof fields while preserving executable parser code (sec.5.3, pp.16–18).
Verus form: Inference: use Rust enums for grammar nodes, ghost proofs for membership, and a parser with `ensures` relating output to grammar semantics. The erased proof-carrying extraction model is an inference; Verus proofs are checked at compile time and are not runtime dependent pairs.
Evidence: “every definition and theorem presented in this paper has been expressed and verified in Coq” (sec.1, p.2).
Limits: Coq’s dependent encoding creates universe and module-system limits for higher-order grammars; semantic actions are Coq functions, so textual standalone grammars remain difficult (sec.5.1 and sec.8, pp.12, 22–23).

## technique: extraction performance engineering
What it is: The authors profile extracted OCaml and repair representation and algorithmic bottlenecks without changing proofs: replace quadratic list `rev`, implement ranges natively, use binary naturals for character codes, tune garbage collection, and optimize finite-enum equality (sec.6.1, pp.18–19).
When to use it: Use this when a proof-carrying extracted parser is correct but too slow for production inputs.
How to do it: measure a realistic grammar; inspect extracted hotspots; replace proof-friendly but computationally poor library functions; preserve the formal semantics while proving any new primitive equivalent; rerun grammar and parser tests. XML improved from over a minute for 32 kB to the reported benchmark after these changes; Java grammar equality checking dropped from 927 s to 104 s (sec.6.1, pp.18–19).
Verus form: Inference: benchmark verified Rust implementations and prove optimized parser primitives refinement-equivalent to the reference specs. Verus can verify the equivalence but does not erase proofs into OCaml.
Evidence: “Fixing the problem with rev resulted in a linear complexity” (sec.6.1, p.19).
Limits: TRX-cert remains 2–3× slower than TRX-int; the authors attribute the gap to extraction or algorithmic overhead, not verification proofs, and code generation is identified as the larger opportunity (sec.6.2, pp.20–21).

## what stays trusted and implications for VL
Coq checks the PEG/XPEG semantics, well-formedness theorem, interpreter correctness, and termination proof; extracted proof terms are removed from runtime. The extracted OCaml compiler/runtime, character representation, garbage collector, and external input environment remain trusted assumptions. Inference: VL can adopt the deep-embedding plus preflight termination-analysis pattern for verified parsers and agent-generated interpreters. Inference: threat reduction is high for parser acceptance and termination bugs, while risks remain in semantic-action definitions, extraction/compiler behavior, grammar specification, and performance regressions. The benchmark denominators are explicit—40 MB XML and 117 MB Java—but only two grammars are measured.

## what existing VL should not redo
TRX already demonstrates a complete route from grammar AST to checked well-formedness, total-correct interpreter, extraction, and performance profiling. VL should reuse these proof obligations and concentrate on Verus encodings, Rust extraction/refinement, and handling grammars outside TRX’s no-left-recursion subset.

## techniques for the catalog
- deep PEG/XPEG embedding — encode grammar syntax and typed semantic actions as inductive data
- determinism lemmas — prove prefix consumption, unique results, and no zero-progress repetition
- fixed-point termination analysis — reject left recursion and non-consuming loops before execution
- proof-carrying interpreter — interpret only grammars accompanied by well-formedness and semantic derivations
- extraction profiling — optimize extracted representations while preserving proved semantics

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
