# Scalable Verification of Quantized Neural Networks (Technical Report)
(authored by agents unless marked 🧑)
Tag: `henzinger2020scalable`, [paper](http://arxiv.org/abs/2012.08185v2)

## what the paper proves or measures

Henzinger, Lechner, and Žikelic study exact verification of fixed-point neural networks. A quantized network uses k-bit fixed-point arithmetic, rounding and a bounded ReLU-N after each layer (Eqs. 3–5, §2, pp. 2–3). The formal goal is the implication shown as Eq. 6 for every admissible input (§2, p. 3). The authors warn that real-valued or float verification can be unsound for deployed code: “a property that holds with respect to one interpretation need not necessarily remain true if we consider a different interpretation” (§2, p. 3).

The complexity result is a lower bound: quantized verification with QF_BV2bw output specifications is PSPACE-hard (Theorem 1, §3, pp. 4–5), although the specification satisfiability problem alone is in NP. The reduction encodes a TQBF instance into n+1 network gadgets: universal variables become fixed truth-table vectors, existential variables become selectable vectors, and a final gadget evaluates the propositional formula (§3, pp. 4–5). This is a hardness argument, not an implementation benchmark.

The practical contribution is three SMT-encoding simplifications plus interval abstract interpretation. The paper says the combined approach achieves “a speed-up of up to three orders of magnitude over existing approaches” (abstract, p. 1). Inference: the result applies to the measured Boolector setup and benchmark networks, not to every SMT solver or neural network.

## technique: preserve the deployed bit-exact semantics

When to use it. Use this technique whenever a model is quantized, rounded, clipped, or executed with finite-width integers. Do not verify only an ideal real abstraction. The paper gives a concrete counterexample family where a specification changes truth value with numerical precision (§2, p. 3).

Steps from the paper. (1) Define each layer as fixed-point multiplication and addition (Eq. 3). (2) Apply the layer’s bit shift and rounding (Eq. 4). (3) Apply bounded ReLU-N clipping to `[0, 2^N−1]` (Eq. 5). (4) Encode input predicate ϕ, network equality, and output predicate ψ in bit-vector SMT (Eq. 6 and §2). (5) For a linear output inequality, add a sign-bit output neuron and assert that it is zero; the construction is given under “Verification of quantized neural networks” (§2, pp. 3–4). Inference: this is the required semantic boundary for a Rust implementation whose arithmetic must match the deployed integer operations.

Verus form. Inference: define `spec fn` layer semantics over mathematical integers, then relate executable wrapping/bit-vector arithmetic to that function with `ensures`. Use `requires` for input ranges and fixed bit widths; use `assert` or proof lemmas for rounding and clipping identities. A loop over layers should carry an `invariant` that the current vector equals the specification’s prefix evaluation and lies within its declared range. The paper is not about Verus, so these constructs are an inference; the bit-vector semantics themselves are from Eqs. 3–5.

Evidence and limits. The paper proves PSPACE-hardness, with an NEXP upper bound noted as loose (§3, p. 5). It does not claim complete verification is always tractable. Inference: generated proofs should expose arithmetic width and rounding assumptions instead of silently replacing them with reals.

## technique: abstract interpretation for sound ranges

What it is. Abstract interpretation computes an over-approximation of all values at each neuron using an abstract domain such as intervals, boxes, or polyhedra. The paper states: “Due to its over-approximating nature, it remains sound for verifying neural networks” (§4, p. 5). For this work it uses interval abstractions over the quantized interpretation (§4, p. 6).

Steps from the paper. (1) Choose an abstract domain; the paper lists interval, zonotope, and convex-polytope choices (§4). (2) Initialize the input range from ϕ. (3) Propagate each fixed-point operation through an abstract transfer function, including the bounded ReLU-N. (4) Record `[lb, ub]` for every neuron. (5) Use those ranges to simplify activation branches and choose widths (§4, pp. 5–6). Tighter domains trade preprocessing cost against precision (§4, p. 6).

Verus form. Inference: represent a range as a ghost pair `(lb, ub)` with a predicate stating every concrete value is between them. Each layer lemma proves range preservation; executable code need not carry the ghost range. A `spec fn` can define interval transfer, and proof lemmas can establish that clipping narrows the range. This is an inference; the paper gives the mathematical method but no Rust or Verus implementation.

## technique: remove dead ReLU-N branches

What it is. Given an interval `[lb, ub]` for an activation input, replace the full if-then-else by a constant or simpler expression when a branch cannot occur. The paper’s rule is explicit under “Dead branch removal” (§4, p. 6): return 0 when `ub ≤ 0`; return `2^N−1` when `lb ≥ 2^N−1`; use `x`, `max{0,x}`, `min{2^N−1,x}`, or the full expression in the remaining interval cases.

Steps. (1) Compute `[lb,ub]` with abstract interpretation. (2) Test the interval against the five cases in the displayed rule. (3) Substitute the selected expression into the SMT formula. (4) Recheck the interval assumptions if a preceding network change invalidates them. The paper says this “reduces the number of decision points in the SMT formula” (§4, p. 6).

Verus form. Inference: prove each case as a lemma from `lb ≤ x ≤ ub`; write the executable branch normally and let the proof establish equivalence to the selected expression. Keep the range condition in `requires` or a loop `invariant`; do not use an unchecked simplification.

## technique: allocate the minimum bit width

What it is. Naively, summing n products of k-bit values allocates `b_naive = 2k + log2(n) + 1` bits (Eq. 9, §4, p. 6). Given an abstract interval, the paper computes `b_minimal = 1 + log2(max{|lb|,|ub|}+1)` for signed two’s-complement values (Eq. 10, p. 6).

Steps. (1) Obtain `[lb,ub]`. (2) Compute the maximum absolute endpoint. (3) Apply Eq. 10 and allocate that width to the bit-vector variable. (4) Preserve the wider width where intermediate multiplication or addition can overflow; the paper’s formula is for representing the computed range, not permission to truncate. Inference: a Verus implementation should prove that every cast or truncation is within the selected range before executing it.

## technique: eliminate redundant multiplications

What it is. Quantization causes repeated weights and shared bit patterns. The paper’s example rewrites `y2 = 6·x1` as `y2 = y1 << 1` after computing `y1 = 3·x1` (Eqs. 11–12, §4, p. 7). Its heuristic orders outgoing weights and applies rule matching; the full rules are in Appendix A (§4, p. 7).

Steps. (1) Group outgoing weights by source neuron and sort ascending. (2) For each weight, match an already computed multiplication or a shift-related bit pattern. (3) Replace the multiplication with the cheaper expression. (4) Preserve exact bit-vector semantics, including overflow and rounding. Inference: in Verus, prove an equality lemma for each rewrite under the network’s width assumptions before replacing executable code.

## evidence, trusted parts, and product threat

The baseline is the monolithic and balanced encoding of Giacobbe et al. in Boolector; the authors use a 14-core Intel W-2175 with 64 GB memory and Lingeling or CaDiCal SAT backends (§5, p. 7). The network has four fully connected layers `(784,64,32,10)`, 52,650 parameters, and 6-bit quantization (§5, p. 8). MNIST checks 100 samples each at ε=1 and ε=2, then 200 each at ε=3 and ε=4; Fashion-MNIST uses 50 samples per radius above ε=2 (§5, p. 8).

Table 1 reports MNIST solved instances out of 100 per radius: ours solves 99/99 (100.0%) at ε=1, 94/99 (94.9%) at ε=2, 71/96 (74.0%) at ε=3, and 54/97 (55.7%) at ε=4; the table’s denominators are the checked instances shown by its percentages (Table 1, p. 8). Table 3 reports Fashion-MNIST: 76/87 (87.4%), 73/90 (81.1%), 27/43 (62.8%), and 18/44 (40.9%) for ε=1–4 (Table 3, p. 8). Table 2 reports median and mean runtimes only over non-timeout samples, so solved-count percentages and runtime denominators differ (caption, p. 8). Ablation on MNIST solves 318/391 (81.3%) with all techniques, versus 88/391 (22.5%) without ReLU simplification and 107/391 (27.4%) without abstract interpretation (Table 4, p. 8). These fractions are consistent with the displayed percentages after rounding.

The trusted base includes Boolector, SAT backends, the encoding implementation, the trained network weights, and the abstract-interpretation soundness argument. Inference: threat to agent-written verified Rust is high when generated code silently changes integer width, rounding, or clipping; the paper shows that real-valued verification can certify the wrong program. VL should reuse the three simplifications and range proofs, but it should not redo the PSPACE-hardness reduction or claim the benchmark speedup outside the stated hardware, solver, and sample denominators.

## techniques for the catalog

- bit-exact specification — encode deployed fixed-point multiplication, rounding, clipping, and output predicates as bit-vector formulas
- abstract range analysis — over-approximate every neuron’s reachable values with interval-style transfer functions
- dead-branch simplification — use proven ranges to remove impossible ReLU-N branches
- minimum-width encoding — allocate each variable the width required by its proven signed range
- redundant-multiplication elimination — share repeated weights and replace bit-level duplicate work with shifts

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
