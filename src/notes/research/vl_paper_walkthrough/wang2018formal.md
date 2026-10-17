# Formal Security Analysis of Neural Networks using Symbolic Intervals
(authored by agents unless marked 🧑)
Tag: `wang2018formal`, [paper](https://www.usenix.org/conference/usenixsecurity18/presentation/wang-shiqi)

## scope and result

Wang et al. present ReluVal, a verifier for security properties of neural networks using ReLU. The abstract states: “we leverage interval arithmetic to compute rigorous bounds on the DNN outputs” (p. 1599). ReluVal propagates bounds through a network and refines inconclusive input regions. It can prove a property, find a concrete counterexample, or time out (Section 5, p. 1605). Section 7.2 evaluates 15 ACAS Xu properties, ten from Reluplex and five additional properties (pp. 1608–1609). The abstract reports an average 200× speedup over Reluplex (p. 1599); this is the authors' empirical claim, not a guarantee for other networks.

The threat model is bounded input manipulation: “We assume that the inputs an adversary can provide are bounded within an interval specified by a security property” (Section 2.2, p. 1601). Features can have different allowed intervals, and properties need not preserve a class label: “We support properties specifying arbitrary output intervals” (Section 2.2, p. 1601). Inference: this specification is useful when a system's permitted inputs and outputs can be bounded explicitly.

## technique 1: sound interval extension

What it is. Represent each input feature by lower and upper bounds, then apply interval versions of the network's linear operations and ReLU. The resulting output interval encloses all concrete outputs. Section 2.3 defines an interval extension F by F([x,x]) = f(x) for concrete x (p. 1602). The introduction explains: “Given the ranges of operands (e.g., a1 ∈ [0, 1] and a2 ∈ [2, 3]), interval arithmetic computes the output range efficiently using only the lower and upper bounds of the operands” (Section 1, p. 1599).

Steps. Assign intervals to input features, propagate interval linear transformations and ReLU through the layers, and compare the output enclosure with the property. If the enclosure proves the property, certify that input region; otherwise search for a concrete violation and refine if none is found (Sections 2.1 and 5, pp. 1600–1601 and 1605). The operational description says ReluVal “propagates it layer by layer to calculate the output range” (Section 1, p. 1600).

The limitation is dependency over-approximation. For f(x)=2x−x and x∈[0,1], the true range is [0,1], but treating operands independently produces [−1,2] (Section 1, p. 1600). Thus an enclosing interval can be too loose to prove a true property.

Verus form. Inference: model bounds with a structure containing `lo` and `hi`, and prove that interval operations enclose every concrete result for inputs satisfying `lo <= hi`. Use executable Rust for propagation and Verus proof functions for arithmetic lemmas. ReLU needs lemmas for `max(0,x)`. The paper implements ReluVal in C, not Verus (Section 6, p. 1607).

Evidence and assumptions. Section 4.1 proves enclosure using inclusion isotonicity, meaning that narrowing an input interval cannot enlarge its interval extension: “the interval extension of f , F(X), always contains the true codomain (theoretically tightest bound) for f (X)” (p. 1604). Section 4.2 uses Lipschitz continuity to bound refinement error (pp. 1604–1605). Section 6 addresses floating-point rounding separately (pp. 1607–1608).

## technique 2: symbolic interval propagation

What it is. Keep linear expressions for lower and upper bounds instead of immediately replacing them with numbers. In the introductory example, ReluVal tracks `[2x,2x]` and `[−x,−x]`, so their sum is `[x,x]` (Section 1, p. 1600). The paper says: “ReluVal uses symbolic intervals whenever possible to track the symbolic lower and upper bounds of each neuron” (Section 1, p. 1600).

Steps. Initialize symbolic bounds from the inputs and weights. For later linear transformations, positive weights multiply corresponding bounds, while negative weights exchange upper and lower bounds. At ReLU, set an always nonpositive neuron to zero and preserve an always nonnegative neuron's expressions. For an uncertain sign, replace the lower bound by zero and concretize the upper bound when needed. Evaluate the final expressions over the input box (Algorithm 1 and Section 5.1, pp. 1605–1606). The paper states: “we keep the lower and upper bound equations (Equp , Eqlow ) for as many neurons as we can and only concretize as needed” (Section 5.1, p. 1605).

Evidence. In the motivating network, symbolic propagation gives `[6,16]` rather than naive `[0,22]` (Section 3, Figures 3a–3b, pp. 1602–1603). The introduction reports “reducing output bound estimation errors by 85.67% compared to naive extension based on our evaluation” (Section 1, p. 1600). Section 5.1 states the enclosure relation f(X) ⊆ [Eqlow(X), Equp(X)] ⊆ F(X), where F is the naive interval extension (Equation 3, p. 1606).

Verus form. Inference: represent each symbolic linear bound by coefficients and prove that evaluating it at every input in the box bounds the concrete neuron. A Verus specification function can describe evaluation; an ordinary executable function performs propagation. Prove that each ReLU case preserves enclosure.

Failure mode. Concretization loses dependency information. The paper explains that larger input intervals can cause many concretizations, leaving output intervals too loose to verify a property (Section 5.2, p. 1606).

## technique 3: iterative interval refinement and split selection

What it is. Bisect an inconclusive input region and analyze its children. Section 5 describes the sequence: propagate bounds; certify when the bounds satisfy the property; otherwise sample concrete inputs for violations; return a counterexample if found; otherwise refine and repeat. A preset iteration threshold can produce a timeout (p. 1605). Section 5.2 gives the default sampling choice: “the current default is the middle point of each range” (p. 1606). Finding a counterexample establishes that a region contains a violation, not that every point violates the property. Users can continue splitting such regions to find secure subregions (Section 5.2, p. 1606).

Split heuristics. ReluVal computes interval gradients backward using ReLU derivative bounds: zero for inactive nodes, one for active nodes, and [0,1] for uncertain nodes (Algorithms 1–2, pp. 1605–1607). It uses gradient magnitude and input width to choose a feature: “we bisect the X j with the highest smear value to reduce the over-approximation error” (Section 5.2, p. 1607). If a partial derivative has one sign throughout an input interval, the output is monotonic in that feature, so its endpoints suffice for bounding that feature's effect (Section 5.2, p. 1607).

Verus form. Inference: prove that two child boxes cover their parent and are contained in it. Transfer a sound certificate from all children to the parent. Use a finite iteration budget to ensure executable termination, returning an inconclusive result when exhausted. A width that decreases over real numbers alone does not prove finite termination. Feature ordering can remain heuristic if coverage and enclosure are proved independently.

Evidence and limits. Section 4.2 bounds the overestimation error by `w(E^(N)(X)) ≤ 2L·w(X)/N` (Equation 2, p. 1605). This gives arbitrary approximation accuracy after sufficiently many splits; it does not guarantee a conclusive property decision within a chosen budget. For ACAS Xu property S1, Section 7.2 reports 262,144 subintervals at precision `10^-6`; Table 3 lists 98,229 adversarial, one timeout, and 163,915 non-adversarial subintervals (p. 1609). Inference: the listed counts sum to 262,145, one more than the text's total; the paper does not explain the discrepancy. Table 3 describes adversarial subintervals as containing at least one adversarial input.

## technique 4: outward rounding and parallel checking

Floating-point rounding can invalidate an enclosure. ReluVal uses outward rounding: “we always round the bounds outward to ensure the computed output range is always a sound overestimation of the true output range” (Section 6, p. 1608). It implements this with 32-bit floats, which the authors report were sufficient for their ACAS Xu verification (p. 1608). Inference: round lower endpoints downward and upper endpoints upward; rounding both endpoints away from zero would not generally preserve enclosure. A Verus implementation would need arithmetic specifications that establish these bounds.

Refinement regions can be checked independently. Section 6 describes dynamic thread rebalancing to redistribute deeper portions of an unbalanced bisection tree while limiting thread scheduling overhead (p. 1607). The introduction reports about 3,000 lines of C (p. 1600). Section 6 specifies OpenBLAS and an Ubuntu 16.04 server with 16 CPU cores and 256 GB memory (p. 1607), while the abstract describes a result on a “single 8-core machine without GPUs” (p. 1599). The paper does not explain this difference.

## what is proved, trusted, and relevant to VL

The mathematical results establish enclosure and a refinement error bound under the stated assumptions (Sections 4 and 5.1, pp. 1603–1606). Inference: applying these results to the C implementation still requires trusting the encoded network, input bounds, property, arithmetic and rounding implementation, compiler, and hardware. The paper does not present a machine-checked proof of that implementation or evaluate agent-written Rust or Verus.

Inference: for VL, reusable components would be a verified interval library and a verified refinement driver, with network operations and arithmetic behavior explicit in their specifications. An incorrect bound or rounding operation could produce a false certificate. A certificate covers only the specified input region and property.

The implemented scope extends beyond regular ReLU: “Our current prototype implementation of symbolic interval propagation supports several common piece-wise linear activation functions (e.g., regular ReLU, Leaky ReLU, and PReLU)” (Section 9, p. 1611). Adapting symbolic propagation for tanh and sigmoid remains future work there. Supporting norms beyond L∞ and using interval analysis during training are also proposed future directions (Section 9, p. 1611).

## techniques for the catalog

- sound interval extension — propagate lower and upper bounds through linear operations and ReLU to enclose concrete outputs
- symbolic interval propagation — retain linear expressions to reduce dependency errors, concretizing as needed
- iterative interval refinement — bisect inconclusive input boxes, using interval gradients and monotonicity to reduce work
- outward rounding and parallel refinement — round lower endpoints downward and upper endpoints upward, and check independent regions concurrently

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "A ReLU node’s gradient can either be 0 for negative input or 1 for positive input."): checked all paper text, quotations, numbers, section and page references, and technique steps; corrected quotations and references, clarified timeout and convergence limits, corrected rounding direction and activation scope, removed unsupported explanations, and used the publisher link printed in the paper; did not reproduce experiments, audit the implementation, or verify the proposed Verus adaptations.
