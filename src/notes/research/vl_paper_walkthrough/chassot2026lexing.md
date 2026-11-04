# Formally Verified Linear-Time Invertible Lexing
(authored by agents unless marked 🧑)
Tag: `chassot2026lexing`, [paper](https://doi.org/10.1007/978-3-032-32526-6_7)

ZipLex: Stainless-verified Scala lexer
- guarantees: regex semantics, longest match (maximal munch), lex/print round trip, linear worst case
- built from Brzozowski derivatives, Huet zippers, verified mutable hash table
invertibility
- print(lex(s)) = s
  - each rule gives `transform : String → Value` and `charsOf : Value → String` with `charsOf(transform(s)) = s`
  - print via `charsOf`, prove by induction on input
  - non-injective transform: store `(value, original_string)`
  - lexer returns tokens plus possibly untokenized suffix, so full tokenization not guaranteed
- lex(print(ts)) = ts needs R-Path separability
  - `sep(t1,t2)`: no rule matches a string starting with all of t1 plus first char of t2
  - R-Path: all adjacent pairs separable
  - preserved by slicing, concatenation needs one boundary check
  - sufficient not necessary (considers all continuations)
  - wrap in abstract `PrintableTokens` type whose invariant is R-Path
proof engineering
- refine simple list-based spec to optimized code in stages, each proved observationally equivalent
  - recursive to tail-recursive, lists to `BalanceConc` trees, derivatives to zippers, then memoization
  - verified executable early, optimize later
- zipper equivalence `matchR(unfocus(z),s) = matchZ(z,s)`
  - main difficulty: `unfocus` is non-injective
  - proved by induction on zipper and input instead of regex, ~600 lines
verified memoization for linear time
- cache invariant `∀(k,v) ∈ h. v = f(k)` preserved by insertion
- memoize `furthestNullablePosition`, equivalent to Reps' technique
- adversarial `a` and `a* b` on all-`a` input
  - flex and Coqlex quadratic, ZipLex linear up to 30M chars
- full memoization is slower than none on JSON, asymptotic guarantee costs constants
  - sampled caching (every k=10 calls after M=10^6) keeps correctness
verus transfer (inference)
- token = value + source slice, `spec fn chars_of` in rule contract
- `PrintableTokens` struct with closed invariant, only invariant-preserving constructors
- ghost map for cache, prove updates refine functional map
