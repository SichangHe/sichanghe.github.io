# Towards Efficient Verification of Constant-Time Cryptographic Implementations
(authored by agents unless marked 🧑)
Tag: `cai2024efficient`, [paper](http://arxiv.org/abs/2402.13506v1)

## property and pipeline

The target property is constant-time behavior: control flow and memory-access patterns must not depend on secrets. The paper combines cheap taint analysis with progressively more precise safety checks. Its abstract states: “we first use an IFDS-based lightweight taint analysis to prove that a large number of potential (timing) side-channel sources do not actually leak secrets.” It then uses “a precise taint analysis and a safety verification approach to determine whether the remaining potential side-channel sources can actually leak secrets.” (Abstract, p. 1)

Apply the pipeline to LLVM IR annotated with secret inputs. First use Clang and a pre-analysis to compute call graph, control-flow graph, points-to information, and def-use chains (Sec. 3.2, p. 8). Run lightweight IFDS taint analysis; unresolved sources go to the taint-directed semi-cross-product; remaining sources go to taint-directed self-composition (Sec. 3.2, p. 8). CT-Prover emits either a proof or potential sources with traces (Sec. 3.2, p. 8).

Inference: in Verus, the same staging can be implemented as a verified harness around Rust code. Mark secret inputs in ghost state, prove non-secret branches with ordinary `requires`/`ensures`, and reserve relational self-composition for unresolved branch and index cases. Verus does not reason about machine timing automatically; one must specify which branches, addresses, and loop behavior are public.

## technique 1: lightweight IFDS taint analysis

What it is: a flow-, field-, and context-sensitive but path- and index-insensitive analysis. Secret input variables are initial taint facts. Transfer rules propagate taint through assignments, array loads/stores, expressions, loops to a least fixed point, and calls/returns (Sec. 4.1, pp. 9–10). The paper says: “These rules are standard, which, intuitively, propagate taints from the right-hand side variables to the left-hand side variable.” (Sec. 4.1, p. 10)

Steps: (1) initialize T with secret inputs. (2) For `x := e`, taint x iff a variable in e is tainted. (3) For `x := y[z]`, propagate y's taint; for `x[y] := z`, taint the array when z is tainted. (4) Iterate loop transfer rules to a least fixed point. (5) Map actual to formal taints at calls, analyze the callee, then map return taints back. (6) Use sparse def-use propagation to avoid sending scalar facts through unrelated control-flow edges (Sec. 4.1, pp. 9–10).

If every potential source variable is untainted, the paper's Lemma 4.1 concludes its value is equal in executions with equal public inputs and arbitrary secret inputs (Sec. 4.1, p. 10). This is sound but incomplete because arrays are index-insensitive. Example 1's fixed-point `fixfrac` has five candidate sources; lightweight taint proves all five safe because `frac` is public (Sec. 3.1, p. 7).

Verus form (Inference): encode a ghost `tainted` predicate for values and prove transfer lemmas for each Rust operation. For loops, use a loop invariant with `invariant` syntax (a clause, not a call) asserting taint facts; use `ensures` only on executable/proof functions, never on a `spec fn`. Array index sensitivity requires a stronger predicate than the paper's coarse array taint.

## technique 2: taint-directed semi-cross-product

What it is: combine the original program with a Boolean abstraction that tracks whether each scalar or array element is tainted. The copies execute in lockstep. “The precise taint analysis is to determine whether a scalar variable x (resp. an array element x[i]) is tainted or not. For this purpose, it suffices to check whether there exist inputs to P′ such that bx (resp. bx[i]) is 1, which is a standard safety verification problem.” (Sec. 4.2, p. 11)

Steps: (1) add Boolean bx for each scalar and bx[i] for arrays; initialize public inputs to 0 and secret inputs to 1. (2) Transform an expression's taint to 0 for constants, bx for variables, and disjunction for compounds (Fig. 7, p. 12). (3) Use the lightweight result Tℓ: untainted operands get Boolean 0; tainted operands propagate their Boolean abstraction. (4) Insert `Guardℓ(x)` assertions requiring bx=0 at each candidate source. (5) For loops, add begin/exit assertions and heuristic invariants; remove invalid invariants during safety checking (Sec. 4.2, pp. 12–13). (6) Prove guards; valid guards remove sources from the taint set.

Example 2 has a mixed buffer `ctx`: an index-insensitive analysis taints the whole buffer, but the precise analysis proves the branch on `x[12]` safe because only `ctx[0..11]` stores the secret key (Sec. 3.1, p. 8).

Verus form (Inference): create a ghost Boolean for each relevant Rust scalar or array cell and a proof wrapper that runs the same computation while updating those booleans. State `assert(!b)` as a proof obligation at secret-dependent branch or index sites. This duplicates computation and can be expensive; use only for candidates left by a cheap abstraction.

## technique 3: taint-directed self-composition

What it is: execute two copies of the program with equal public inputs and different secrets, sharing control flow. Each original variable x has a shadow x̂. Assertions require x=x̂ at remaining potential sources. The paper defines the result formally and states: “The cross-product P̂ for a given program P is constructed by iteratively applying the function Π(·) …” (Sec. 4.3, p. 14).

Steps: (1) duplicate procedure parameters, returns, and expressions with shadow variables. (2) Initialize shadow public inputs from originals; allow independent secret inputs. (3) Reuse the two taint analyses to copy untainted values directly (x̂:=x), avoiding duplicate computation. (4) For tainted expressions, compute the shadow expression Ξ(e). (5) Insert `Guard′ℓ(x)` asserting x=x̂ at each source and loop invariants equating loop-condition dependencies (Fig. 8, pp. 14–15). (6) Discharge all guards with a safety verifier. Theorem 4.4 says the program is constant-time if every resulting taint set is empty (Sec. 4.3, p. 15).

Verus form (Inference): write a relational proof function taking two states or two calls, require equality of public inputs, and ensure equality of public branch predicates, memory indices, and outputs. A ghost shadow value can represent the second execution; `old(...)` may refer to pre-state values where needed. Rust ownership and aliasing must be modeled explicitly; the paper's LLVM memory model does not carry over automatically.

## evidence and limits

The evaluation has 87 real implementations (Table 1, p. 16). For constant-time programs, CT-Prover proves all cases; ct-verif times out on 14 and is inconclusive on 2, while on 56 cases both prove, CT-Prover is “about 50 times faster” (Sec. 5.1, p. 16). Most are proved by lightweight taint alone; P1_1 and P9_4 require precise taint (Sec. 5.1, p. 17). For 15 vulnerable cases, all final sources were manually confirmed genuine; four BearSSL functions claimed constant-time were vulnerabilities (Sec. 5.2, p. 17). The table uses one-hour timeouts for constant-time comparisons and six-hour timeouts for vulnerable cases (Tables 2–3, pp. 16–18).

The authors identify trusted implementation frameworks and source-to-LLVM translation as threats: “The major internal threat to our evaluation is the correctness of the implementation of CT-Prover” (Sec. 5.3, p. 19). Inference: a Verus adaptation still trusts the Verus verifier, solver, compiler, unsafe/external code, and the chosen constant-time specification. A product risk is high for cryptographic code if secret labels or memory models are wrong; the staged analysis lowers cost but does not remove modeling assumptions. Existing work already provides taint analysis, self-composition, and CT-Prover; VL should adapt the relational specification pattern rather than recreate a generic taint tool.

## techniques for the catalog

- staged taint and safety verification — discharge easy non-leaks with IFDS, then escalate unresolved sources
- lightweight IFDS taint — propagate secret dependence to a fixed point with sparse def-use flow
- taint-directed semi-cross-product — track precise scalar/index taint in a Boolean lockstep product
- taint-directed self-composition — compare two executions with equal public inputs and different secrets

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
