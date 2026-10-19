# Towards Efficient Verification of Constant-Time Cryptographic Implementations
(authored by agents unless marked 🧑)
Tag: `cai2024efficient`, [paper](https://doi.org/10.1145/3643772)

## property and pipeline

The target property is constant-time security: executions with equal public inputs must have equal observations of branch conditions, loop conditions, and load/store indices (Sec. 2.2, pp. 5–7). The model assumes safe, terminating programs. It excludes architecture-dependent instruction timing and micro-architectural effects such as Spectre and Meltdown. The authors state: “In this work, we consider the first three timing side-channels and use the common leakage model [11, 26, 36, 83] to characterize constant-time security.” (Sec. 2.2, p. 5)

The abstract describes the staging: “we first use an IFDS-based lightweight taint analysis to prove that a large number of potential (timing) side-channel sources do not actually leak secrets.” It then uses “a precise taint analysis and a safety verification approach to determine whether the remaining potential side-channel sources can actually leak secrets.” (Abstract, p. 1)

Start with a C program annotated with public and secret inputs. Clang translates it to LLVM IR. Pre-analysis computes the call graph, interprocedural control-flow graph, points-to information, and definition-use chains. Run lightweight taint analysis; unresolved sources go to precise taint analysis through a semi-cross-product; remaining sources go to taint-directed self-composition. The tool reports a proof or potential sources with execution traces (Sec. 3.2, pp. 8–9). Its implementation uses SVF and Phasar for analysis, SMACK to translate LLVM IR to Boogie IR, Bam-Bam-Boogieman for product construction, and Boogie for safety verification (Sec. 5, pp. 14–15).

Inference: a Verus adaptation could specify observations explicitly and prove that two Rust executions with equal public inputs produce equal observation sequences. This would require a model connecting Rust operations to the paper's observations; the paper does not establish that connection.

## technique 1: lightweight IFDS taint analysis

This analysis is flow-, field-, and context-sensitive but path- and index-insensitive. Secret input variables supply the initial taint facts. If any input array element is secret, the analysis taints the entire array. The authors explain: “These rules are standard, which, intuitively, propagate taints from the right-hand side variables to the left-hand side variable.” (Sec. 4.1, pp. 9–10)

Steps (Fig. 6 and Sec. 4.1, pp. 9–10):

1. Initialize the taint set with secret inputs.
2. For `x := e`, taint x when any variable in e is tainted; otherwise remove x's taint. A load `x := y[z]` similarly assigns x the taint of the whole array y.
3. For `x[y] := z`, add the array x to the taint set if z is tainted. An untainted store does not clear the whole array's existing taint.
4. Join the taint sets from both branches. Iterate loop transfer rules to a least fixed point.
5. At a call, pass actual-argument taints to formal parameters, excluding caller-local facts. Analyze the callee, discard its local facts at return, and update actual return variables.
6. Accelerate the interprocedural, finite, distributive, subset (IFDS) analysis by propagating scalar taints directly to their uses through definition-use chains.

Lemma 4.1 states that an untainted potential-source variable has equal values in complete executions with equal public inputs (p. 10). If every potential source is untainted, the safe program is constant-time (p. 11). Example 1's `fixfrac` has five potential sources; lightweight analysis resolves all five because `frac` is secret-independent (Secs. 3.1–3.2, pp. 7–9).

Inference: a Verus model could represent these taint facts in ghost state and prove each transfer rule. Proving the analysis sound would require connecting those facts to pairs of executions, rather than merely updating Boolean labels.

## technique 2: taint-directed semi-cross-product

Combine the original program with a Boolean abstraction sharing its control flow. Each scalar has a Boolean taint variable; each array has a Boolean array recording element taints. The authors explain the reduction: “For this purpose, it suffices to check whether there exist inputs to P′ such that 𝑏𝑥 (resp. 𝑏𝑥 [𝑖]) is 1, which is a standard safety verification problem.” (Sec. 4.2, p. 11)

Steps (Fig. 7 and Sec. 4.2, pp. 11–13):

1. Duplicate procedure parameters and return values with Boolean counterparts. Initialize public-input taints to 0 and secret-input taints to 1.
2. Give constants taint 0, variables their Boolean taint, and compound expressions the disjunction of operand taints.
3. Use the lightweight result to simplify assignments: an expression with no tainted operand gets taint 0. A load from an untainted array gets 0; otherwise read the Boolean array at the original index. Stores update the corresponding Boolean array element.
4. At a potential source still tainted by lightweight analysis, insert an assertion requiring its Boolean taint to be 0. Omit assertions for sources already resolved.
5. For loops, check the condition's taint at the beginning and exit of the loop body where needed. For each variable defined in the body and used to compute the condition, propose an invariant saying that variable is untainted. Check these invariants and remove invalid ones.
6. Prove the assertions with a sound safety verifier. Remove a source variable from its taint set when its assertions are valid.

Example 2's buffer `ctx` mixes secret key material in positions 0–11 with public material in positions 12–15. Lightweight analysis taints the whole buffer; precise analysis resolves the branch using `x[12]` (Secs. 3.1–3.2, pp. 8–9). Precision does not make taint analysis complete: the paper's example `x = k ⊕ p ⊕ k` remains tainted even though k cancels (Sec. 3.2, p. 9).

Inference: a Verus proof could track a ghost Boolean for each relevant scalar or array element along the original computation. A tainted result would remain an unresolved obligation, rather than evidence of a timing leak.

## technique 3: taint-directed self-composition

Build two copies sharing control flow, with a shadow variable for every original variable. Public inputs agree; secret inputs may differ. The authors state: “Our construction simplifies the self-composed programs and reduces the number of safety checks.” (Sec. 4.3, p. 13)

Steps (Sec. 4.3 and Fig. 8, pp. 13–14):

1. Duplicate procedure parameters and returns with shadow counterparts. Initialize shadow public inputs from the originals.
2. Use the results of both taint analyses to avoid repeated computation: copy a value directly to its shadow when the relevant expression or loaded data is untainted.
3. Otherwise evaluate the expression or memory operation using shadow values.
4. At each unresolved branch, loop condition, or memory index, assert equality between the original and shadow values. Skip assertions for sources already resolved.
5. For variables defined in a loop body and used to compute its condition, propose invariants equating original and shadow values. Check them and remove invalid invariants.
6. Use safety verification to discharge the assertions and remove resolved source variables. Theorem 4.4 gives a sufficient condition for constant-time security of a safe program: all resulting taint sets at potential sources are empty (p. 14).

Inference: a Verus relational proof could take two states with equal public inputs and establish equal branch predicates, loop observations, and memory indices. Equality of secret-dependent outputs is not required by the paper's leakage model. The proof would also need to account for Rust memory behavior.

## evidence and limits

The evaluation contains 87 implementations, of which 58 were claimed constant-time by developers (Sec. 5, p. 15; Table 1, p. 16). CT-Prover proves 72. Section 5.1 reports that ct-verif times out on 14 constant-time programs and is inconclusive on two, and states: “On the other 56 constant-time programs that can be proved by ct-verif and CT-Prover, CT-Prover is about 50 times faster.” (p. 15) The narrative calls P7_1 inconclusive, while Table 2 marks it TO; the paper does not reconcile these descriptions. All but P1_1 and P9_4 are reported provable by lightweight taint alone; those two need precise taint (p. 16). Table 2 uses a one-hour timeout (p. 17).

For the 15 non-constant-time cases, the authors state: “Both CT-Prover and ct-verif ran out of time on 4 programs (P5_1, P6_5, P6_16 and P6_19).” (Sec. 5.2, p. 17) Thus the evaluation does not show complete automated analysis of every vulnerable case. They manually confirm P5_1's non-constant-time behavior using lightweight-analysis candidates, and report manually validating all final sources with execution traces. Four vulnerable BearSSL benchmarks had developer constant-time claims. A footnote reports confirmations from Mbed TLS and BearSSL developers (p. 17). Table 3 uses a six-hour timeout (p. 18).

The authors identify a trusted-toolchain limit: “The major internal threat to our evaluation is the correctness of the implementation of CT-Prover which relies on various open-source frameworks and tools.” (Sec. 5.3, p. 19) Their benchmarks use clang-12 at O0 followed by `-mem2reg`, rather than broad optimization settings, to reduce compiler-introduced leakage (Secs. 5 and 5.3, pp. 15, 19). The paper also distinguishes theoretical completeness from practical limits of safety verification (Sec. 1, p. 2).

## techniques for the catalog

- staged taint and safety verification — discharge easy non-leaks with IFDS, then analyze unresolved sources more precisely
- lightweight IFDS taint — propagate secret dependence to a fixed point with sparse definition-use flow
- taint-directed semi-cross-product — track scalar and array-element taint in a Boolean lockstep product
- taint-directed self-composition — compare observations of executions with equal public inputs and independently chosen secrets
