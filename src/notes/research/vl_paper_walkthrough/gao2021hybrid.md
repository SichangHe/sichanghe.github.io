# A Hybrid Approach to Formal Verification of Higher-Order Masked Arithmetic Programs
(authored by agents unless marked 🧑)
Tag: `gao2021hybrid`, [paper](https://doi.org/10.1145/3428015)

## what is verified

Gao, Xie, Song, and Chen verify higher-order masking security for arithmetic cryptographic programs. Their security property is distributional: every observable set of size equal to security order `d` must be statistically independent or uniform with respect to the secret. The abstract says: “we first propose a sound type system, equipped with an efficient type inference algorithm, for verifying masked arithmetic programs against higher-order attacks.” (abstract, p. 1). The tool, HOME, combines type inference, pattern matching, and model counting. It decides security under the paper's probing/ISW-style leakage model; it does not prove Rust memory safety or hardware power-model correctness.

Inference: For VeruLaw, this is a reusable architecture for security proofs where a cheap sound analysis handles common cases and an exact fallback resolves the residual cases. The mapping to Verus is an inference because HOME targets C-like arithmetic expressions, not Rust or Verus.

## technique 1: staged hybrid verification

HOME first preprocesses a masked program by unrolling static loops, inlining calls, and converting to SSA. The paper states: “Given a masked program P and the order d, the pre-processor unfolds the static loops (i.e., loops with a predetermined bound of iterations) and inlines the procedure calls, and then transforms the program into the SSA form.” (overview, §3.2, p. 8). It then checks every size-`d` observable set with the type system. If no type can be inferred, pattern matching compares its expression with a known set; if that fails, model counting decides exactly. The result is fed back and cached for later pattern matching (overview, §3.2, p. 8). The authors summarize: “This procedure gives a sound and complete approach for verification of higher-order security.” (§3.2, p. 8).

Apply it as follows: (1) classify public, secret, random, and observable variables; (2) unroll and inline, then build SSA; (3) run type inference over candidate observable sets; (4) mark unresolved sets as potential leaks; (5) try expression-isomorphism against cached solved sets; (6) invoke exact model counting only for remaining sets; (7) cache the result and return all genuinely leaky sets. The paper's Algorithm 1 stores `PLS` (potential leaky sets), `λ` (simplified expressions), and `π` (dominant variables), then recursively explores subsets (Algorithm 1, §4.4, pp. 15–17).

Inference: In Verus, an analogous pipeline could normalize verified Rust into a ghost expression model, discharge simple obligations with SMT-friendly lemmas, and send only unresolved predicates to a decision procedure. Verus's `proof fn` can establish the reduction lemmas; executable Rust must remain independent of proof-only analysis. The paper's completeness claim applies only to its finite arithmetic model and algorithms.

## technique 2: distribution types and sound inference

The type system assigns each observable set a distribution type: leak (`τlk`), secret-independent (`τsi`), uniform (`τuf`), or related public/key/random types (type system, §4, pp. 10–12). Rules reason about dominant random variables and independence. The soundness theorem states that a valid `τuf` or `τsi` judgment implies the corresponding security property, while `τlk` implies the set is leaky (Theorem 4.5, §4, p. 13). Type inference is intentionally incomplete: unresolved sets proceed to the later methods.

Use the rules by simplifying each observable expression, identifying whether a random mask dominates it, and combining judgments for independent expressions. The authors give three sound transformations: `SimplyAlg` repeatedly simplifies algebraic identities; `SimplyDom` replaces a dominated subexpression by its dominant random variable; `SimplyCol` collapses common subexpressions. These transformations make expressions fit inference rules; they preserve the relevant distribution type (transformations, §4.3, pp. 14–15). Algorithm 1 explores larger sets and relies on the fact that security of a set implies security of every subset, reducing exhaustive enumeration (algorithm, §4.4, p. 16).

Inference: A Verus encoding would represent distribution facts as ghost predicates and prove each transformation with `ensures` equalities or equivalence lemmas. Use `requires` to state independence and uniformity assumptions; use loop `invariant` only for the recursive exploration state. Do not call a `proof fn` from runtime code.

## technique 3: exact model counting and GPU parallelization

For unresolved sets, HOME converts leakage into satisfiability/model-counting formulas. Proposition 5.1 states that the formula `Ω_O` is satisfiable exactly when observable set `O` is leaky (model counting, §5.1, p. 19). The paper provides a brute-force enumerator and a SAT/SMT encoding, then synthesizes a CUDA program per candidate set. The GPU program enumerates valuations in parallel and outputs SAT iff `Ω_O` is satisfiable (GPU method, §5.3, pp. 21–23).

Apply it by constructing the two secret assignments and random assignments that witness unequal observable distributions; encode the equality/inequality constraints; run the exact count or SAT test; classify the set; and cache its distribution type. Inference: Verus can state the finite-domain counting theorem and verify the encoder for a bounded domain, but external CUDA execution, GPU arithmetic, and solver correctness remain trusted unless separately verified. This method is a decision procedure for the paper's model, not a general theorem prover.

## technique 4: pattern matching for repeated masked structure

Masked cryptographic programs repeat algebraic blocks. HOME normalizes computation expressions and searches an isomorphism between an unresolved set `O` and a solved set `O'`. The authors write: “If such an isomorphism exists, we can conclude that these two observable sets O and O′ have the same distribution type” (§3.2, p. 8). Theorem 5.9 proves that equivalent normalized expressions have the same distribution type (§5.4, p. 24). This avoids expensive counting and summarizes recurring leaky patterns for debugging. Cached solved sets are reused when a program is revised (§5.4, p. 24).

Inference: For Verus, a ghost normalization function plus a proved congruence lemma could justify reuse across structurally identical expressions. The normalization algorithm and isomorphism checker must themselves be trusted or verified; syntactic similarity without a semantic equivalence proof is insufficient.

## evidence, assumptions, and limits

Experiments used byte-domain arithmetic programs on Ubuntu 16.04.4, an Intel Xeon E5-2690v4 at 2.6 GHz with 256 GB RAM and one CPU core; GPU experiments used an NVIDIA GeForce GTX 1080 (evaluation setup, §6, p. 26). Benchmarks ranged from conversions and multiplication to round-reduced/full AES and MAC-Keccak (§6.1, p. 26). On common benchmarks, Algorithm 1 checked fewer observable sets than baseline [6] despite sometimes considering more variables, and reported speedups of 110× for Key schedule, 64× for Full AES (4), and 31× for fourth-order Sbox [98] (results, §6.1, pp. 27–28). The denominator is each benchmark's set count and elapsed verification time under the stated single-core or GPU setting; the paper compares to replicated statistics from [6], whose hardware differed (dual-core 2 GHz VM, one core used).

The paper reports two potential-leak cases where Algorithm 1 matched [6], then resolves them with counting and pattern matching (§6.1, p. 27). Sbox [98] fourth-order masking is tested at third-order security solely for comparison; other benchmarks use their masking orders (§6.1, p. 27). The claims assume the probing leakage model, correct random-mask independence, finite byte arithmetic, parser/SSA correctness, and soundness of transformations and solvers. Inference: These assumptions are trusted components when a Verus product calls an external cryptographic analyzer.

Inference: Product threat is high if an agent emits masked cryptographic Rust without explicit leakage-model contracts: ordinary functional verification can pass while a joint observable set leaks a key. VL should reuse the staged pattern—cheap proof, structural reuse, exact fallback—and record model, order, set denominators, and trusted tool boundaries. Existing HOME already covers the paper's higher-order arithmetic workflow; VL should not claim novelty for simply adding type inference plus model counting.

## techniques for the catalog

- staged hybrid security checking — preprocess to SSA, apply sound type inference, resolve residual sets by pattern matching, then exact model counting
- distribution-type inference — classify observable sets as uniform, secret-independent, or leaky with sound algebraic rules and dominant-mask analysis
- sound expression transformations — use algebraic simplification, dominant-variable replacement, and common-subexpression collapse before inference
- exact model counting — decide unresolved leakage by satisfiability/counting formulas and cache each result
- pattern matching — prove equal distribution types for normalized isomorphic observable expressions and reuse solved cases
- verus translation (inference) — model distribution facts as ghost predicates and prove normalization/reuse lemmas, while trusting external solvers or GPUs unless verified
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
