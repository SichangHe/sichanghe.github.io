# ABC: An Academic Industrial-Strength Verification Tool
(authored by agents unless marked 🧑)
Tag: `brayton2010abc`, [paper](https://doi.org/10.1007/978-3-642-14295-6_5)

The authors are Robert Brayton and Alan Mishchenko; the paper appeared at CAV 2010, LNCS 6174, pp. 24–40 (p. 24). The DOI link is from the fetch record; it is not printed in the paper text.

## scope and central design

ABC is a public-domain system that combines logic synthesis and formal verification for synchronous binary circuits. Its central representation is an And-Inverter Graph (AIG): a directed acyclic graph of two-input AND nodes, with inversion represented on edges. AIGs provide the common representation for synthesis, mapping, and verification (Section 3.5, p. 30). The paper's abstract says: “ABC is a public-domain system for logic synthesis and formal verification of binary logic circuits appearing in synchronous hardware designs.” (abstract, p. 24). It says the system “combines scalable logic transformations based on And-Inverter Graphs (AIGs), with a variety of innovative algorithms.” (abstract, p. 24).

Inference: the practical lesson is an integrated flow: simplify the miter, search for short bugs, abstract or speculate, then apply complete proof engines under resource limits. This is an engineering architecture and empirical report, not a formal proof of the ABC implementation.

## technique 1: AIG representation with structural sharing

What it is. A combinational AIG contains only two-input ANDs and complemented edges. Sequential AIGs expose each D flip-flop as a combinational-input (CI)/combinational-output (CO) pair; stateful transformations use the pairing when needed (Sections 3.1–3.2, pp. 27–28). Structural hashing ensures one node per pair of fanins, up to permutation, and is performed during construction. Balancing applies `a(bc)=(ab)c`; both operations are linear in the number of AIG nodes in one topological traversal (Section 3.1, p. 28).

How to apply it.

1. Factor Boolean expressions into AND/OR form, convert OR with De Morgan's rule, and insert two-input AND nodes in topological order (Section 3.1, pp. 27–28).
2. Store inversion as an edge attribute, avoiding separate inverter nodes (Section 3.3, p. 29).
3. On each node creation, hash the canonically permuted fanin pair and reuse an existing node when present (Section 3.3, p. 29).
4. Traverse topologically and rebalance associative AND trees (Section 3.1, p. 28).
5. For sequential logic, append CI/CO pairs for register outputs/inputs; apply combinational rewrites uniformly, and invoke sequential cleanup or retiming when state correspondence matters (Section 3.2, p. 28).

The authors emphasize why this representation matters: “Structural hashing ensures that AIGs do not contain structurally identical nodes.” (Section 3.3, p. 29). They also state that a typical AIG package uses 32 or more bytes per object, while their minimalistic package uses 8 bytes (Section 5.1, p. 32).

Verus form. Inference: the paper does not discuss Rust or Verus. Represent each AIG node as an immutable enum/record with two child identifiers and an inversion bit for each child edge. A `spec fn` can define the Boolean meaning of a node; `ensures` on insertion can state hash-consing uniqueness and semantic preservation. Prove topological ordering and acyclicity with `invariant` clauses in construction loops. Rust ownership can enforce that node storage is not mutated through aliases, but Verus does not provide hash-table correctness automatically; the hash implementation and any unsafe storage need contracts. A Verus proof of semantic preservation remains dependent on the AIG evaluator specification.

Evidence and limits. The paper claims AIGs allow designs with “millions of nodes” (Introduction, p. 25) and says fanout computation on demand gives “50% memory reduction in most applications” (Section 3.3, p. 29). These are authors' engineering claims; no denominator or benchmark set is supplied for the 50% figure. AIG rewrites are heuristic: “SIS and ABC use different heuristics for logic manipulation, so it is still possible that, for a particular network, SIS finds a better solution than ABC.” (Section 3.4, p. 29). Inference: structural sharing reduces duplicate structure; correctness also requires preserving Boolean semantics.

## technique 2: miter-based combinational and sequential equivalence checking

What it is. To check a safety property, add monitor logic to the design and produce a model-checking miter. To check two designs, pair equal-named inputs and XOR equal-named outputs, ORing all XORs into one miter output. The output is zero exactly when the property holds or the circuits agree for every input (or every input sequence from the initial state) (Section 2.3, pp. 26–27).

How to apply it.

1. Build the original circuit and monitor/property logic, or the golden and revised circuits (Section 2.3, pp. 26–27).
2. Connect corresponding inputs; for equivalence, XOR each corresponding output and OR the XORs (Section 2.3, pp. 26–27).
3. Reduce the miter using synthesis. For a combinational miter not solved by synthesis, assert the output to one and ask a Boolean satisfiability (SAT) solver (Section 2.3, p. 27).
4. For that combinational query, UNSAT proves the miter constantly zero; SAT supplies a primary-input assignment producing one (Section 2.3, p. 27). For sequential verification, use the initial state and input sequences; ABC combines bounded model checking (BMC) with interpolation or binary decision diagram (BDD) reachability (Sections 2.3 and 6.2, pp. 27, 35–36). Inference: UNSAT for a bounded unrolling alone does not prove a property for all time.
5. For sequential synthesis, identify sequentially equivalent nodes/registers and merge them; verify the resulting design against the original with sequential equivalence checking (Section 2.4, p. 27).

The paper states (Section 2.3, p. 27):

> If the solver returns “unsatisfiable”, the miter is proved constant 0 and the property holds, or the original circuits are equivalent.

Inference: this is conditional on the modeled miter and the solver result.

Verus form. Inference: Express the golden and revised transition systems as `spec fn`s and prove an output-equivalence lemma for every allowed input sequence. A bounded Rust checker can use `requires` for initial-state and input assumptions and `ensures` for equal outputs; loop invariants carry state correspondence across time. A SAT-produced assignment is an external witness and must be rechecked by a verified evaluator if it is to support a Verus claim. Verus cannot infer equivalence from an arbitrary SAT result without a trusted bridge.

Evidence and limits. ABC's equivalence flow combines simulation, SAT, and BDD or SAT sweeping (Section 4.1, p. 31). The authors report that running synthesis on a miter “substantially improves the CEC runtime” because shallow equivalences are merged before difficult SAT calls (Section 4.1, p. 31). Inference: the guarantee applies only when the miter construction, input correspondence, and solver are correct; unreachable-state choices in sequential synthesis must be handled by sequential, rather than purely combinational, equivalence.

## technique 3: synthesis/verification duality and induction-preserving transforms

The paper recommends using the same or more powerful transformations during verification as during synthesis. If synthesis used retiming, run most-forward retiming followed by inductive register correspondence. It reports a guarantee: when synthesis applied only retiming without changing the logic structure, this sequence proves sequential equivalence (Section 4.1, p. 31). If synthesis used only `k`-step induction to find equivalent signals, equivalence between the original and final circuits is guaranteed provable with the same `k`-step induction (Section 4.1, p. 31). The rule of thumb is explicit: “if a transformation is applied during synthesis, it is often helpful (and necessary) to apply the same or more powerful transformations during verification.” (Section 4.1, p. 31).

Inference: an implementation can record the transformations used in synthesis, apply the corresponding retiming, correspondence, or induction during verification, then solve the resulting miter. The guarantee is limited to the transformation classes and assumptions stated by the cited results; it is not a guarantee for arbitrary rewrites.

Verus form. Inference: Treat each transformation as a function with a semantic `ensures` relation to the prior transition system. Prove a correspondence invariant between old and new states; use `invariant` in a step loop and `assert` lemmas for the induction depth. A Verus proof can make the correspondence explicit, but it does not automatically derive the `k` bound or handle arbitrary retiming.

## technique 4: cache-aware sequential simulation (SimSwitch)

What it is. The case study develops fast sequential simulation, useful for detecting easy counterexamples and estimating switching activity (Section 5, p. 31). The resulting simulator, SimSwitch, is evaluated for switching estimation (Section 5.2, p. 33). Three methods reduce memory requirements: compact AIG objects (8 bytes rather than 32 or more), recycled simulation storage for combinational inputs/outputs and the simulation frontier, and bit-parallel simulation of two consecutive time frames (Section 5.1, pp. 32–33).

How to apply it.

1. Initialize known sequential state and generate input patterns; random inputs may toggle with probability 0.5, or use probabilities or traces supplied by the user or another tool (Section 5.1, pp. 31–32).
2. Store fanin IDs in compact records; a construction-only hash table can be freed before simulation (Section 5.1, p. 32).
3. Keep only CI/CO values and nodes on the frontier (fanins computed, at least one fanout pending). For switching estimation, accumulate a transition counter instead of retaining all frame values (Section 5.1, p. 32).
4. Simulate data for adjacent time frames together and compare immediately. This simulates each pattern twice, using previous and current state values; the paper reports that reduced memory traffic outweighs the extra computation (Section 5.1, pp. 32–33).

Evidence. Table 1 evaluates four industrial designs, 304K–1.3M AIG nodes, 1,585–87,157 flip-flops, and 2,560–20,480 patterns at toggle rate 0.5. Runtime ranges from 0.1 to 24.2 seconds depending on design and pattern count (Table 1, p. 33). In a separate comparison of 14 industry designs and 12 academic benchmarks, both tools used 5,000 patterns and toggle rate 0.5: SimSwitch is reported as 149+ times faster on the 14 industry designs and 85+ times faster on the 12 academic benchmarks; ACE-2.0 timed out on four industrial designs while SimSwitch finished all cases (Section 5.2, p. 33). The paper directs readers to reference [19] for the results table; it does not reproduce per-circuit data or explain the aggregation of these speed ratios (Section 5.2, p. 33).

Verus form. Inference: A verified simulator can specify that each computed node value equals the AIG semantics and that transition counters equal XORs of adjacent frames. Use `requires` for a known initial state and input trace, `ensures` for final state/counters, and loop `invariant`s for topological-prefix correctness. Memory recycling and bit packing require representation invariants; unsafe optimization remains trusted unless separately verified.

## technique 5: integrated ABC verification flow

ABC divides verification into miter simplifiers, bug hunters (BMC), and provers (interpolation), orchestrated by Python and resource limits (Section 6.2, p. 35). The reported main sequence is `pre_simp → quick_verify → abstract → quick_verify → speculate → final_verify` (Section 6.2, p. 35).

How to apply it.

1. `pre_simp`: use phase abstraction to unfold periodic behavior when useful; trim primary inputs with no fanouts; extract implicit constraints inductively and fold them into logic that forces the output to zero forever after a violation; apply forward retiming and sequential flip-flop correspondence. The `simplify` script iterates AIG rewriting, retiming for minimum flip-flop count, and `k`-step signal correspondence with `k` chosen by problem size (Section 6.2, pp. 35–36).
2. `quick_verify`: after each major reduction, run low-resource interpolation or BDD reachability on small problems (Section 6.2, p. 36).
3. `abstract`: combine counterexample and proof-based abstraction in one SAT instance; remove registers and replace them by primary inputs. Apply BMC, or BDD reachability for small problems, to the abstraction with additional resources (Section 6.2, p. 36). Inference: a BMC run without a counterexample checks only its explored depth.
4. If this check finds a counterexample, restart `abstract` with additional resources from the frame where it was found (Section 6.2, p. 36).
5. `speculate`: redirect each candidate equivalence class's fanouts to one representative and create additional output proof obligations. Refine using counterexamples until BMC finds none to the explored depth, then attempt to prove all outputs. If any output fails, filter candidate equivalences and repeat speculative reduction (Section 6.2, p. 36).
6. `final_verify`: attempt interpolation or BDD reachability if the problem seems small enough. `quick_verify` is its low-resource version (Section 6.2, p. 36). Resources include time, SAT conflicts, unrolling depth, and BDD nodes; `x_factor` increases them. The flow stops when a package proves UNSAT and returns a SAT counterexample if no abstraction has been done (Section 6.2, p. 35).

The industrial example has 532 PIs, one PO, 2,389 flip-flops, and 12,049 AIG nodes initially (Section 6.3, pp. 36–38). Abstraction reduces 1,460 flip-flops to 119 and BMC finds no counterexample through 51 frames; speculation is tested through 1,999 frames. BDD reachability is aborted with a 75-second resource allowance and a 1,000,000-node limit; interpolation returns UNSAT. The printout reports 457.87 seconds elapsed and 458.52 seconds total for the flow; the notes give 457 seconds on a Lenovo X301 with an Intel Core2 Duo CPU and 3Gb RAM (Section 6.3, pp. 36–38). Inference: the BMC runs through 51 and 1,999 frames supply bounded evidence. The final interpolation UNSAT result is the reported proof of all 24 remaining outputs (Section 6.3, p. 37).

Verus form. Inference: Map each stage to a verified transformation with a semantic correspondence contract. BMC can supply bounded counterexamples; abstraction needs a proof that every concrete behavior is represented by the abstract model; speculation needs obligations for every merged node. Use `ensures` and proof lemmas for these relations, and `invariant`s for iterative scripts. Python orchestration, SAT/BDD/interpolation engines, and the transformation implementations remain trusted unless verified independently.

## techniques for the catalog

- AIG structural hashing — represent logic with two-input ANDs and complemented edges, hash-consing identical nodes during construction
- Combinational miter SAT equivalence — combine outputs with XOR/OR and interpret UNSAT as equivalence and SAT as a counterexample
- Transformation-aware verification — replay synthesis retiming and induction during checking to preserve proofability
- Cache-aware sequential simulation — compact nodes, recycle frontier values, and simulate adjacent frames together
- Abstraction and speculation — reduce registers or merge candidate equivalents, check bounded behavior with BMC, then prove generated obligations
- Staged ABC flow — iterate simplification, quick checks, abstraction, speculation, and final interpolation or BDD reachability under explicit resources
