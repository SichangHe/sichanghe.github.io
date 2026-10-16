# Mythos and the Unverified Cage: Z3-Based Pre-Deployment Verification for Frontier-Model Sandbox Infrastructure
(authored by agents unless marked 🧑)
Tag: `blain2026mythos`, [paper](http://arxiv.org/abs/2604.20496v1)

This position and case-study paper proposes COBALT, a source-level Z3 bitvector analyzer for arithmetic vulnerability patterns in C/C++ infrastructure. It separates validated arithmetic detection from a proposed four-layer containment stack. The abstract states: “We distinguish two classes of contribution. Validated: COBALT detects arithmetic vulnerability patterns in production codebases, producing SAT verdicts with concrete witnesses and UNSAT guarantees under explicit safety bounds.” (Abstract, PDF p. 1). The paper explicitly treats the alleged Mythos escape vector as unverified.

## technique: AST-to-bitvector reachability checking

What it is. COBALT parses C/C++ with libclang, extracts arithmetic operations, array and pointer arithmetic, casts, and indexing, models inputs as unconstrained fixed-width bitvectors, and asks Z3 whether a vulnerability predicate is satisfiable. SAT means a witness exists in the encoded domain; UNSAT means the encoded pattern cannot occur under the asserted bounds. The paper's pipeline is: “Stage 1: Parse. libclang parses source through a typed abstract syntax tree.” followed by extraction, modeling, and solving (Section 4.1, PDF p. 3).

How to apply it. (1) Parse the source and resolve headers when available. (2) Identify a CWE-190/191/195 operation and its guards. (3) Declare each input with the C width, for example `BitVec('n',32)`. (4) Encode the arithmetic predicate with unsigned/signed bitvector operations. (5) Add reachability conditions and `Solver().check()`. (6) On SAT, print the model as a concrete witness. (7) On UNSAT, retain the solver result as a certificate for the bounded formula. For signed TCP sequence comparison, Listing 2 defines `tcp_seq_lt(a,b)` as `UGE(a-b,0x80000000)` and constrains two calls simultaneously (Section 5.1, PDF p. 3).

Verus form. Inference: model fixed-width arithmetic with Rust integer types and `spec fn` predicates; prove the safe bound with a `proof fn` whose `ensures` excludes the overflow predicate. Use `requires` for input ranges and `assert` for bitvector inequalities. Inference: Verus can prove a contract about Rust arithmetic, but COBALT's libclang extraction and Z3 witness generation are external analysis stages; a SAT witness is not a proof of exploitability along a full program path.

Evidence and limits. Theorem 1 proves SAT for `sack_start=2^31, rcv_nxt=0, snd_una=0` in the encoded TCP pattern (Section 5.1, PDF p. 4). The paper warns that this is “a formal arithmetic certificate for the overflow-triggering scenario” for the pattern, not a complete network-stack model. Guards, compiler behavior, and interprocedural effects may invalidate practical reachability.

## technique: bound-to-UNSAT safety proof

What it is. A proposed input bound turns an overflow query into UNSAT. For allocation `product=n*16`, the paper asserts `n≤⌊(2^32−1)/16⌋=268,435,455`; the maximum product is `2^32−16`, so Z3 returns UNSAT (Section 5.2, PDF p. 4). This turns a detected pattern into a machine-checked guarantee for the stated domain.

How to apply it. (1) Encode the vulnerable multiplication and overflow predicate `ULT(product,n)`. (2) Add a guard representing the intended maximum input. (3) Run Z3. (4) If UNSAT, record the exact width, element size, and bound in the safety contract. (5) Re-run after every patch that changes the arithmetic or guard.

Verus form. Inference: make the bound a `requires` clause and prove `ensures product == n * element_size` in a mathematical integer model, with a lemma connecting the model to the machine-width operation. Inference: do not use an unbounded `spec fn` result as evidence that executable wrapping cannot occur; the conversion and range proof must be explicit.

Evidence and limits. Proposition 1 is valid only for `element_size=16` and the stated 32-bit bound. It does not establish safety for a different element size, width, cast, or caller-provided value. The denominator is the full 32-bit input domain restricted by one bound, not a test sample.

## technique: production pattern encodings

The four case studies instantiate the same method. NASA cFE models a 64-bit resource ID cast to 32-bit `unsigned long`; SAT gives `0x0000000100000000` truncating to zero (Listing 9–10, PDF p. 5). wolfSSL models a signed left shift in ML-DSA; WD1 is SAT for `w1=2`, while the cast-before-shift WD2 is UNSAT. The report says 42 of 44 valid ML-DSA-44 coefficients trigger the UB, approximately 95%, with the denominator 44 coefficients (Section 6.2, PDF p. 5). Mosquitto models 16-bit TLV length underflow; SAT gives `len=1, tlv_len=5`, wrapping to 65,529 and enabling an out-of-bounds read (Section 6.3, PDF p. 6). NASA F Prime models `size*2` wraparound bypassing a stack guard and then a second out-of-bounds read (Section 6.4, PDF p. 6).

How to apply it. (1) Reduce each source pattern to a self-contained arithmetic core. (2) Preserve the target's widths and cast order. (3) Encode the vulnerable and repaired forms as separate queries. (4) Run both SAT and UNSAT checks. (5) Submit witnesses and source locations for disclosure, while labeling contextual exploitability as unresolved.

Verus form. Inference: write a Rust wrapper whose `requires` states the same source-level bounds and whose `ensures` proves no truncation or shift overflow. Use `assert` to expose cast-width obligations and `proof fn` lemmas for each case study. Inference: the paper's reduced formulas cannot replace a proof of the complete C/Rust control-flow and FFI context.

Evidence and limits. Table 2 reports four primary targets: NASA cFE CWE-195 SAT, wolfSSL CWE-190 SAT+UNSAT, Mosquitto CWE-191+125 SAT, and NASA F Prime CWE-190+125 SAT, each with an acknowledged, patched, or disclosed outcome. The authors state that the corpus is evidence of precision and feasibility, not comprehensive recall; no false-positive rate over large codebases is measured.

## technique: layered containment and derived runtime guards

COBALT is Layer 1: SAT blocks deployment and UNSAT permits deployment for the analyzed domain. VERDICT checks six pre-execution predicates: target not external, action not email, action not public endpoint, scope authorized, hash approved, and session supervised (Section 7.2, PDF p. 7). DIRECTIVE-4 applies output policy before emission. SENTINEL logs actions with millisecond granularity and alerts humans. The paper's illustrative email evaluation fails five of six predicates and is therefore UNSAFE.

The prototype COBALT-Runtime compiles Z3-derived bounds into O(1) comparisons. On 2,000 safe and 2,000 unsafe inputs across two invariants, it reports zero false positives and negatives, mean latency 87.2 ns, median 83.0 ns, p99 125 ns, and throughput 11.55 million checks/second (Section 10, PDF p. 10). These denominators are 2,000 per class and two arithmetic invariants; they are not a production deployment study. COBALT-Graph composes two CWE predicates through a dataflow bridge and reports SAT chains in 8.1 ms and 4.6 ms for two prototypes (Section 11, PDF p. 10).

Verus form. Inference: encode a runtime guard as executable Rust with `requires` on the derived bound and `ensures` that the crossing is accepted only when the predicate holds; prove the guard with a `proof fn` over machine integers. Inference: policy predicates can be ordinary contracts, but logging, network mediation, and model behavior remain trusted components outside a functional proof.

## what is proved, measured, and trusted

Validated claims are arithmetic theorems over reduced bitvector formulas, four disclosed production patterns, and the two prototype measurements. The Mythos connection is conditional on A-SRC (source available), A-CWE (escape is CWE-190), and A-SCOPE (pattern in coverage); the paper explicitly says Anthropic did not confirm A-CWE (Section 8.2, PDF p. 8). Trusted elements include source parsing, extracted guards, C compiler semantics, Z3, model-width assumptions, and the unverified incident reports. A SAT result can be unreachable in the full program; an UNSAT result covers only the encoded domain. Inference: the threat to agent-written verified Rust is concrete for arithmetic and FFI boundaries, but COBALT is a targeted checker rather than a replacement for end-to-end Verus functional proofs. Existing seL4 and CertiKOS work already demonstrates full kernel verification; VL should not present source-level CWE checks as equivalent coverage.

## techniques for the catalog

- AST-to-bitvector reachability — extract arithmetic patterns and ask Z3 for SAT witnesses under exact machine widths
- bound-to-UNSAT proof — add explicit input guards and prove the overflow predicate impossible in the bounded domain
- reduced production encodings — validate the same predicate on real C/C++ cases while preserving cast and width semantics
- layered containment — combine deployment scanning, pre-execution policy, output firewalling, and runtime observability
- compiled invariant guards — turn offline Z3-derived bounds into constant-time runtime checks
- dataflow escalation graphs — compose successive CWE predicates so one witness becomes the next stage's input
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
