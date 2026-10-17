# Learning Assumptions for Compositional Verification
(authored by agents unless marked 🧑)
Tag: `cobleigh2003learning`, [paper](https://doi.org/10.1007/3-540-36577-x_24) (link from the fetch record)

## scope and result
This paper automates assume-guarantee verification for safety properties of two communicating components. It learns an environment assumption as a regular language using the L* algorithm (Angluin's, in the Rivest-Schapire improved version, Section 4.1), refines it with model-checking counterexamples, and discharges it on the second component. The process can prove the composed property or expose a concrete violation without a human-written assumption.

The abstract states: “Assumptions are computed by a learning algorithm. They are initially approximate, but become gradually more precise by means of counterexamples obtained by model checking the component and its environment, alternately.” (abstract, p. 331). The proof rule is `(A) M1 (P)` and `(true) M2 (A)` implying `(true) M1 || M2 (P)` (Section 3, p. 335). Components and properties are labeled transition systems; properties are safety LTSs, and a violation is reachability of an error state π in a product (Section 2, pp. 334–335).

## technique 1: incremental assume-guarantee learning

What it is. Let `Aw` be the weakest assumption under which `M1` satisfies `P`. L* learns the prefix-closed language of traces that do not lead `M1 || Perr` to π. Each candidate `Ai` is checked first against `M1` and then, if sufficient, against `M2`; counterexamples either strengthen or weaken the next candidate (Sections 3–4, pp. 335–340).

How to do it.
1. Select `M1` as the component to verify, `M2` as its environment, and safety property `P`; set the assumption alphabet to `Σ = (αM1 ∪ αP) ∩ αM2` (Section 4.2, p. 339).
2. Initialize L* with `S=E={λ}`. Ask membership queries to fill `T` over `(S ∪ S·Σ)·E` (Figure 5 and Section 4.1, pp. 337–338).
3. Close the table: whenever no row in `S` matches `sa` for a needed successor, add `sa` to `S`, update `T` with queries, and repeat (p. 338).
4. Build the candidate DFA from the closed table, with states `S`, initial state `λ`, transitions determined by equal rows, and accepting states where `T(s)=true`; present it as a conjecture to the teacher (p. 338).
5. Oracle 1 checks `(Ai) M1 (P)`. If false, the Teacher returns the counterexample projected to `Σ` to L*, which finds a witnessing suffix and adds it to `E`; this strengthens the assumption (Sections 3 and 4.2, pp. 336, 339–340).
6. If Oracle 1 is true, Oracle 2 checks `(true) M2 (Ai)`. If true, the compositional rule proves `P` on `M1 || M2`; if false, analyze the counterexample by checking its projection against `M1 || P`, then return a projected trace to L* when the assumption is too strong (pp. 339–340).
7. If analysis finds that the property is actually violated in the composition, interleave the two counterexample traces to produce a concrete violation (p. 340).

The paper gives the teacher's membership procedure: build a path automaton `Aσ` for query σ, then model-check `(Aσ) M1 (P)`; true means σ belongs to `L(Aw)`, false means it does not (Section 4.2, p. 339). It explains the refinement direction: “If the result is false, it means that this assumption is too weak, i.e., Ai does not restrict the environment enough for P to be satisfied.” (Section 3, p. 336). The converse counterexample from Oracle 2 can show that `Ai` is too strong and must be weakened (p. 336).

Verus form. Inference: represent `M1`, `M2`, and `P` as ghost transition relations over finite Rust enums or structs. Encode an assumption as a predicate on finite traces, and prove two lemmas: every trace accepted by the assumption preserves `P` for `M1`, and every `M2` trace satisfies the assumption. Use `requires` for trace well-formedness, `ensures` on proof functions, and loop `invariant`s for trace concatenation and prefix closure. L* and model checking remain external search procedures; Verus checks the resulting certificates and refinement lemmas.

Evidence. The paper states termination and gives a proof of correctness and termination (Theorem 1, Section 5.1, p. 341): “The process is guaranteed to terminate; in fact, it converges to an assumption that is necessary and sufficient for the property to hold in the specific system.” (Section 1, p. 332). L* itself returns a minimal DFA; if the minimal DFA has `n` states, it makes at most `n−1` incorrect conjectures and uses `O(kn² + n log m)` membership queries, where `k` is alphabet size and `m` is the longest counterexample (Section 4.1, p. 338). These are asymptotic bounds, not measured times.

The Input/Output example uses `Σ={send, output, ack}`. A first conjecture A1 fails Oracle 1 with trace `<input, send, ack, input>` and projected counterexample `<send, ack>`; A2 passes both oracles, proving the Order property (Section 4.3, pp. 340–341). Replacing Output with Output′ causes Oracle 2 to return `<send, send, output>`; two further refinements produce A4, the weakest assumption, and prove the property (p. 341).

Limits and trust. The method handles safety LTS properties; the authors list liveness, fairness, and timed properties as future extensions (Section 8, p. 345). The LTS definition requires a finite state set (Section 2, p. 333). If memory runs out, intermediate assumptions are generated that “may be useful in approximating the requirements” (Section 5.2, p. 342), but they do not settle the property. Inference: the result depends on a correct model checker; in Verus, the major product threat is a mismatch between the learned trace alphabet and the Rust component's actual shared actions; a sound proof of an incorrectly projected interface can still establish the wrong contract.

## technique 2: prefix-closed DFA and safety-LTS conversion

What it is. L* candidates are complete, minimal, prefix-closed DFAs with one non-accepting state. Remove that state and transitions leading to it to obtain a safety LTS suitable for the assume-guarantee rule (Section 2, p. 335).

How to apply it. Maintain prefix closure in membership answers; reject or mark every extension of a known false trace as false; convert the final DFA to a safety LTS; use it as `Ai` in the two oracles. The paper notes that this optimization avoids model-checker calls for extensions of a false prefix (Section 5.2, p. 342).

Verus form. Inference: encode DFA states as an enum and prove determinism, prefix closure, and that transitions into an error state cannot be accepted. The conversion is a ghost representation; it should not silently change the executable Rust protocol.

## evidence from the rover study

The K9 Mars Rover Executive experiment directly composing the two modules searched 3,630 states and 34,653 transitions. The learned approach's largest Oracle 1 search was 464 states and 2,500 transitions in iteration 4, approximately one order of magnitude smaller, but took 8.639 seconds versus 0.535 seconds for direct checking (Section 6, pp. 343–344); the authors only say they believe the memory benefit outweighs the time overhead, and memory itself was not measured. Table 3 has four Oracle 1 iterations with assumption sizes 1, 2, 3, and 5; the fifth row is Oracle 2 at size 5 and returns False. These counts are per analysis, not averages. The experiment therefore shows fewer states explored, a time overhead, and a counterexample proving the property does not hold in that rover model.

## what is proved, measured, and trusted

The paper relies on the compositional rule and proves, as Theorem 1, that the algorithm terminates and returns the correct true/false result (Section 5.1, p. 341). It measures one rover case and gives the Input/Output trace example; it does not report a broad benchmark denominator. Trusted parts are the LTS semantics, model checker, teacher's counterexample projection/interleaving, and the implementation of L*. Inference: VL should reuse incremental assumption learning for modular Rust proofs and should record each learned assumption as a reviewable contract; it should not redo L* theory. The product risk is concentrated in interface projection, counterexample interpretation, and assumptions that are stronger than the real environment.

## techniques for the catalog

- incremental assume-guarantee learning — learn a weakest environment assumption with L* and alternate component/environment model checks
- observation-table DFA learning — close an `S,E,T` table, build a candidate DFA, and refine it with distinguishing counterexample suffixes
- two-oracle refinement — strengthen assumptions after component failures and weaken them after environment failures
- prefix-closed safety conversion — turn a complete prefix-closed DFA into a safety LTS by removing its sole rejecting state
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Counterexample analysis is performed by the Teacher in a way similar to that used for answering membership queries."): read the whole paper text and checked every quotation, number, section and page reference, and the technique steps (L* table, two oracles, projection, interleaving) against it; changed the capitalization of the abstract quote, removed "empty observation table", the unsupported Verus run-time remark and the "memory reduction" claim (only states explored and time were measured), corrected a page range (example is on p. 341), and attributed Theorem 1 correctly; the DOI link is from the fetch record because the paper text gives none; I did not check the Verus-form paragraphs (marked Inference) against Verus documentation, the cited prior work, or the PDF figures beyond the text.
