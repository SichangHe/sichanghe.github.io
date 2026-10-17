# TRX: A Formally Verified Parser Interpreter
(authored by agents unless marked 🧑)
Tag: `koprowski2011trx`, [paper](https://doi.org/10.2168/lmcs-7(2:18)2011)

## what is proved and measured
TRX is a Coq formalization of parsing-expression grammars (PEGs), extended with typed semantic actions (XPEGs), a well-formedness checker, and an extracted parser interpreter. Its central claim is total correctness: termination and correctness with respect to PEG/XPEG semantics. The abstract says the extracted parser is “terminating and correct with respect to its grammar and the semantics of PEGs” (abstract, p.1). Case studies cover an XML grammar and a 216-rule Java grammar. Figure 8 measures ten XML files totaling 40 MB and nearly 11,000 JDK files totaling 117 MB: TRX-cert takes 128.9 s and 662.4 s respectively, versus TRX-int 40.0 s and 289.3 s (sec.6.2, pp.19–20).

## technique: PEG/XPEG deep embedding
What it is: PEG expressions use empty, character/range/literal, sequence, prioritized choice, greedy repetition, and/not predicates; XPEGs index expressions by semantic-value types and add coercion actions (secs.2 and 3, pp.3–8).
When to use it: Use PEGs for deterministic recursive-descent parsing with integrated lexical rules, prioritized disambiguation, and unlimited lookahead. Use XPEGs when parsing must return an AST or computed value.
How to do it: (1) define finite terminals and nonterminals; (2) define `Pexp` and start symbol; (3) use `/` for prioritized choice and `*`/`+` for greedy repetition; (4) add typed semantic actions `e[↦]f`; (5) encode the grammar as Coq inductive `pexp`/`PExp`; (6) prove or check its well-formedness before interpreting. The paper’s arithmetic grammar integrates whitespace, numbers, right-associative addition/multiplication, and actions that evaluate the expression (Examples 2.3 and 3.3, pp.5, 8).
Verus form: Inference: model grammar ASTs and parser states with Verus `struct`s and `spec fn`s; use `requires`/`ensures` to state that a parser returns a suffix and semantic value satisfying the grammar. Verus does not supply Coq’s indexed inductive family directly, so semantic-value typing needs explicit enums/ghost types.
Evidence: “PEGs are essentially a declarative way of specifying recursive descent parsers” (sec.1, p.2).
Limits: PEGs are unambiguous because choice is prioritized and repetition greedy, which the paper says “makes them unfit for processing natural languages”; packrat parsing gives linear time but “the constant of this correlation can be very high” in memory (sec.2.2, p.5). Left-recursive rules lead to non-terminating parsers (sec.1, p.2).

## technique: semantic determinism and parser lemmas
What it is: The formal XPEG semantics returns either failure or a suffix plus semantic value. The authors prove prefix consumption, unambiguity, and that repetition cannot iterate a successful zero-consuming expression (Theorems 3.4–3.5 and Lemma 3.6, p.9).
When to use it: Inference: use these lemmas as reusable proof obligations for parser combinators and to justify termination measures.
How to do it: define inductive big-step semantics with a step count; prove by induction that every success leaves a suffix; invert two derivations to show equal result and step count; prove `e*` is undefined when `e` succeeds without consuming input. The paper introduces the no-empty-loop lemma as one “that we will need later on”; the proof of Lemma 4.1 uses it for the `e∗` case (secs.3.2 and 4.2, pp.9, 11).
Verus form: Inference: encode parse results as an enum and prove suffix-length decrease for successful recursive calls. Use ghost lemmas for determinism and no-zero-progress repetition; recursive executable code must have a Verus `decreases` measure.
Evidence: Theorem 3.5 (p.9) concludes “then m1 = m2 and r1 = r2” for two derivations of the same (e, s).
Limits: Theorem 3.5 holds because choice is prioritized and repetition greedy (sec.2.2, p.5). Termination is a separate problem: the paper handles it by the well-formedness check of Section 4, since left recursion leads to non-terminating parsers (secs.4.1, pp.9–10).

## technique: fixed-point grammar analysis for termination
What it is: TRX computes properties `P0` (can succeed without consuming), `P>0` (can succeed after consuming), and `P⊥` (can fail), then derives a well-formed set by monotone fixed point. A grammar is well formed when all its subexpressions are in `WF`; Theorem 4.2 proves well-formed grammars complete (secs.4.1–4.3, pp.9–12).
When to use it: Inference: use this extrinsic check before interpreting a deeply embedded grammar to reject direct or mutual left recursion and repetitions that can loop without consuming input.
How to do it: (1) collect all subexpressions `E(G)`; (2) initialize property sets empty; (3) apply Figure 5 inference rules to a fixpoint; (4) apply Figure 6 well-formedness rules, requiring sequence tails when the prefix may be empty and requiring repetition bodies not in `P0`; (5) iterate until no set grows; (6) prove `E(G)=WF`; (7) pass that proof to the interpreter. The Coq checker uses `wf_measure = |E(G)|−|wf|` as a decreasing measure (sec.5.2, pp.14–15).
Verus form: Inference: represent finite expression IDs and bit-set properties; implement a ghost fixed-point lemma and prove monotone growth bounded by `E(G)`. Attach the resulting proof to a parser function with `decreases` on remaining input plus grammar-state measure.
Evidence: “If G is well-formed then it is complete” (Theorem 4.2, p.11).
Limits: The paper says “In general it is undecidable whether a PEG grammar is complete”; its syntactic check “will reject left-recursive grammars even if the part with left-recursion is unreachable” (sec.4.1, p.10). Lemma 4.1 and Theorem 4.2 are attributed to Ford [For04], here extended to XPEGs.

## technique: typed Coq encoding and proof-carrying interpreter
What it is: Coq `PExp : Type → Type` indexes each expression by its semantic result type; the interpreter receives a proof that an expression belongs to a well-formed grammar and returns a sigma-type value: a parse result `r` together with a proof that `[e, s] ⇒ [n, r]` holds for some step count `n`. Its termination measure is the pair `(e, s)` ordered by derivation step count, which is well-founded because the semantics is complete (sec.5.1–5.3, pp.12–17).
When to use it: Inference: use this architecture when generated code must be extracted only after the specification and termination proof are accepted.
How to do it: define finite nonterminal enumeration and `prod_type`; encode constructors (`Seq`, `Choice`, `Star`, `Not`, `Action`); compute `WFexps`; define `parse` with grammar-membership proof and a step-count measure; pattern-match on expressions (the paper says the body follows “the semantics from Figure 2” while the result type encodes Figure 4); prove the returned result has a semantic derivation (sec.5.3, pp.16–18). Extraction discards the proofs: “the second component of the sigma type {x : T | P (x )} is discarded during the extraction” (sec.6.2, p.20).
Verus form: Inference: use Rust enums for grammar nodes, ghost proofs for membership, and a parser with `ensures` relating output to grammar semantics. The erased proof-carrying extraction model is an inference; Verus proofs are checked at compile time and are not runtime dependent pairs.
Evidence: “every definition and theorem presented in this paper has been expressed and verified in Coq” (sec.1, p.2).
Limits: Coq’s dependent encoding creates universe and module-system limits for higher-order grammars; semantic actions are Coq functions, so textual standalone grammars remain difficult (sec.5.1 and sec.8, pp.13, 22).

## technique: extraction performance engineering
What it is: The authors profile extracted OCaml and repair bottlenecks: fix the quadratic list `rev` used to convert input strings, implement the range operator natively (extending the XPEG semantics with a range rule), compare characters via binary instead of Peano naturals (2x faster), tune OCaml garbage collection (85% of time was GC; 3x gain), and speed up the proof of decidable equality on the 216-rule enumeration type with a dedicated Ltac tactic (sec.6.1, pp.18–19).
When to use it: Inference: use this when a proof-carrying extracted parser is correct but too slow for production inputs.
How to do it: the paper’s sequence was: measure a realistic grammar (XML); inspect the extracted code for the hotspot (`rev` from Coq’s standard library); replace library functions that suit reasoning but not computing (Peano-based character-to-ASCII conversion); profile again (GC). The first extracted TRX-cert parsed 32 kB of XML in “more than one minute”; the Figure 8 run parses 40 MB of XML in 128.9 s. For Java, proving decidable equality on the rule enumeration took 927 s with `decide equality` and 104 s with the dedicated tactic; the well-formedness test of the XML and Java grammars took 0.1 s and 0.7 s (sec.6.1, pp.18–19). Native `range` was added by extending the semantics (p.13); the paper does not describe a separate equivalence proof.
Verus form: Inference: benchmark verified Rust implementations and prove optimized parser primitives refinement-equivalent to the reference specs. Verus can verify the equivalence but does not extract to OCaml.
Evidence: “Fixing the problem with rev resulted in a linear complexity” (sec.6.1, p.19).
Limits: the paper says TRX-cert is “approximately 2 − 3x slower” than TRX-int; the authors believe there is no verification overhead, so the gap comes from extraction or algorithmic overhead (and Coq’s 8-boolean `ascii` characters), and “the main opportunity for improving performance seems to be in switching from interpretation to code generation” (sec.6.2, pp.20–21). TRX-cert is slower than JAXP (2.3 s) and TRX-gen (5.1 s) on XML (Figure 8, p.20).

## techniques for the catalog
- deep PEG/XPEG embedding — encode grammar syntax and typed semantic actions as inductive data
- determinism lemmas — prove prefix consumption, unique results, and no zero-progress repetition
- fixed-point termination analysis — reject left recursion and non-consuming loops before execution
- proof-carrying interpreter — interpret only grammars accompanied by well-formedness and semantic derivations
- extraction profiling — optimize extracted representations while preserving proved semantics
