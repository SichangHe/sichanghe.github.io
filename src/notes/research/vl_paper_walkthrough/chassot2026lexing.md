# Formally Verified Linear-Time Invertible Lexing
(authored by agents unless marked 🧑)
Tag: `chassot2026lexing`, [paper](https://doi.org/10.1007/978-3-032-32526-6_7)

## scope and result
ZipLex is a Stainless-verified Scala lexer whose guarantees include regular-expression semantics, longest-match tokenization, mutual lex/print invertibility, and linear worst-case lexing through verified memoization. The paper’s central design is to make printable token sequences satisfy a local separability relation, then preserve that relation through slicing and concatenation. It combines Brzozowski derivatives, Huet zippers, a verified mutable hash table, and a refinement path from simple executable specifications to optimized code. The abstract states: “We present ZipLex, a veriﬁed framework for invertible linear-time lexical analysis following the longest match (maximal munch) semantics.” (Abstract, p. 141)

## technique 1: enforce invertibility with injective token transformations
Use this when tokens store semantic values but printing must reproduce the exact source substring. Require each lexer rule to provide `transform : String → Value` and `charsOf : Value → String` with `charsOf(transform(s)) = s`. Define token printing through `charsOf`; prove `print(lex(s)) = s` by induction on the input. Surjectivity is unnecessary because values are created only by `transform`; if a natural transformation is not injective, store `(value, original_string)`. The paper states: “ZipLex requires each rule to contain an injective transformation transform together with a corresponding charsOf function and a proof that ∀s. charsOf(transform(s)) = s.” (Sect. 3.1, p. 146)

Inference: In Verus, represent a token with its semantic value and source slice, and require a `spec fn chars_of` equation in the rule contract. Prove the round trip with a recursive proof function over the input sequence; Rust ownership changes representation but not the proof obligation.

## technique 2: R-Path separability for lex(print(ts)) = ts
Use this when adjacent tokens can merge under maximal munch. Define `sep(t1,t2)` to hold when no lexer regular expression can match a string beginning with all of `t1` followed by the first character of `t2`. Define an R-Path predicate over token sequences: every adjacent pair satisfies `sep`. The condition is checked linearly, is preserved by slicing, and concatenation needs only a boundary check. Wrap sequences in an abstract `PrintableTokens` type whose invariant is the R-Path condition. The paper states: “Our predicates are preserved under slicing and concatenation, enabling eﬃcient manipulation of token sequences while maintaining invertibility.” (Introduction, p. 142)

Step by step: compute `prefixMatch` using the regex matcher; reject a pair if any rule can extend across the boundary; establish the predicate once at construction; preserve it for slices; on concatenation check `sep(last(left), first(right))`. This handles the paper’s `[a-z]+` example where `foo` and `bar` merge to `foobar`, while `foo` and `123` remain separable. Separator tokens are a simpler sufficient method, but are less expressive for programming-language whitespace and comments.

Inference: In Verus, encode `PrintableTokens` as a struct with a `closed` sequence invariant and expose only constructors, slicing, and concatenation whose `ensures` preserve the predicate. Quantified regex reasoning may require lemma functions and finite rule sets.

## technique 3: derivative regex matching and zipper refinement
Use derivatives when regex matching must be executable and verified without constructing an automaton. Define regex constructors, Brzozowski derivative, nullability, and `matchR`; prove `matchR(r,s) = matchRSpec(r,s)`. Compute the longest matching prefix by scanning once, deriving after each character, and stopping when the derivative denotes the empty language. To reduce expression blow-up, represent regexes as Huet zippers (contexts plus unions), implement `matchZ`, and prove `matchR(unfocus(z),s) = matchZ(z,s)`. The paper states: “Zippers provide an alternative representation of regular expressions as sets of contexts.” (Sect. 4.2, p. 149)

The authors use the zipper-oriented equivalence because `focus` is not injective; induction on `focus(r)` fails, while induction on zipper contexts succeeds. This proof costs about 600 lines. Lexing applies maximal munch by selecting the longest prefix among rules, breaking equal-length ties by rule order.

Inference: In Verus, define regex and zipper datatypes as recursive enums and prove derivative correctness by constructor lemmas. Keep a simple list-based specification and refine to a zipper implementation, preserving an observational equivalence theorem.

## technique 4: verified memoization for linear time
Use memoization when longest-match lexing repeats derivative computations, especially on adversarial grammar `a` and `a* b` with all-`a` input. Build a generic verified `HashMap[K,V]` over a verified `LongMap`, storing hash buckets as key-value lists. Maintain the cache invariant `∀(k,v) ∈ h. v = f(k)`; prove insertion preserves it. Memoize zipper derivative functions and longest-match computation. For the latter, use a tail-recursive function over one full input plus indices, returning the furthest nullable position; record recursive calls on an explicit stack and fill the cache after completion. The paper states: “As a result, lexing runs in O(n) time, where n is the input string length.” (Sect. 6.2, p. 152)

The correctness proof is independent of cache sampling: storing one of every `k` calls after threshold `M` trades memory for constants while preserving results. The evaluation uses `k=10`, `M=10^6` by default. In the adversarial benchmark, flex and Coqlex are quadratic; ZipLex remains linear up to the reported 30M-character runs. On JSON, full memoization is slower than no memoization, showing that asymptotic guarantees can cost constants.

Inference: In Verus, model a mutable cache with a ghost map and prove each update refines the functional map. Use an explicit work stack for tail-recursive memoization; avoid treating an unverifiable hash implementation as part of the trusted base.

## technique 5: optimize through verified equivalence layers
The authors first implement a simple list-based lexer and regex matcher, then refine in stages: recursive to tail-recursive functions, lists to the verified `BalanceConc` tree, naive derivatives to zippers, and finally memoization. Each optimized implementation is proved observationally equivalent to its predecessor. `BalanceConc` uses balanced trees with immutable arrays (512 elements per leaf in the evaluation) and zero-copy slicing; proofs remain over lists. The paper states: “This methodology yields a fully veriﬁed, executable implementation early on, which we then optimize for eﬃciency while preserving formal correctness.” (Sect. 7, p. 154)

## evidence, limits, and VL implications
The project contains 1,915 program lines and 13,200 specification/proof lines (15,115 total). Stainless generated 21,961 verification conditions, 8,802 cache hits, and took approximately 130 minutes; 44 VCs exceeded 10 seconds and the slowest took 58 seconds (Sect. 7, pp. 153–156). JSON lexing is about 3.5× slower than Coqlex and two orders of magnitude faster than Verbatim++; disabling memoization narrows the gap to 1.37× on GraalVM (Sect. 8, pp. 158–160). These denominators are benchmark input files and the stated JVM/server setup: 96 virtual processors, 128 GB RAM, OpenJDK 21.0.2 unless noted.

Proved: regex semantics, maximal munch, invertibility, data-structure refinement, hash-map behavior, and memoization correctness. Trusted or assumed: Stainless and SMT solvers, the verified LongMap dependency, Scala/JVM runtime, hash-collision behavior for performance, and benchmark harnesses. Inference: For verified Rust products, the strongest transferable lesson is the refinement ladder plus explicit cache invariants; the threat is high if token serialization, mutation, or solver-backed regex reasoning remains outside the verified boundary. VL should reuse the R-Path API and round-trip contracts instead of redoing weaker lexer-only verification.

## techniques for the catalog
- injective token printing: require a semantic transform with a proven source-string inverse
- R-Path separability: preserve adjacent-token non-merging through local boundary checks
- zipper derivatives: refine regex derivatives to Huet zippers and prove matching equivalence
- verified memoization: maintain cache/function agreement to obtain linear longest-match lexing
- equivalence refinement: optimize executable representations only through proved observational equivalence
Checked 2026-10-15 against paper chassot2026lexing: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
