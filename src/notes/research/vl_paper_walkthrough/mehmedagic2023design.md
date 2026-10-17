# Design of Access Control Mechanisms in Systems-on-Chip with Formal Integrity Guarantees
(authored by agents unless marked 🧑)
Tag: `mehmedagic2023design`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/mehmedagic)

## problem, model, and central property

The paper addresses malicious or faulty third-party IPs in a systems-on-chip (SoC). Its methodology, UPEC-OI (Unique Program Execution Checking for Operation Integrity), checks whether a low-security IP can influence a high-security domain during a security-critical operation. The abstract claims that it “exhaustively covers integrity vulnerabilities of an SoC-level access control system” (p. 2779) and that it needs no explicit list of attack scenarios.

The model has two identical copies of the design under verification (DUV), a 2-safety miter. At time (t), corresponding high-security microarchitectural state is equal, while a selected low-security propagation source may differ. Inputs and access-control configuration are constrained as the property requires. The commitment checks that high-security outputs and state remain equal after (k) cycles. A difference in a high-security primary output is a T-alert (trespass alert); a difference in high-security microarchitectural state is a P-alert (propagation alert) that alone does not establish an integrity violation (Definitions 3–4, p. 2784). Section 3.3.1 also treats differences in secure architectural state, such as the program counter, as T-alerts (pp. 2784–2785).

The underlying interval property checking (IPC) solver unrolls the DUV into (k) combinational copies and searches symbolic inputs and starting states. If every possible state and input satisfies the property, IPC provides an unbounded proof for that interval; unreachable starting states can produce false counterexamples unless strengthened by invariants (section 2.2, p. 2781). The paper states that “In principle, this means a SAT solver will search for any combination of input and state values in order to find a counterexample to the property.” (section 2.2, p. 2781). The hardware guarantee is relative to the permitted access-control configuration and security-critical traces; additional firmware and environment constraints become conditions that the deployed system must enforce (section 4, pp. 2788–2789; Appendix C, p. 2796).

## technique: formulate operation integrity as a 2-safety interval property

How to apply it:

1. Identify the trusted computing base (TCB), high-security state (Z_h), high-security outputs (Y_h), low-security state (Z_l), and access-control registers (L) (sections 3.1–3.2, p. 2782). Select a propagation source (Z^{ps}\subseteq Z_l) as described in section 3.3.2 (p. 2785).
2. Build a miter with two copies of the RTL and equalize their ordinary primary inputs and initially equal high-security state.
3. Constrain `access_control_configured1()` in copy 1 to a permitted configuration λ; the paper explains that this also forces the configuration in copy 2 equal at (t), because configuration registers are in the high-security state (section 3.2, p. 2784).
4. Allow the selected propagation source to differ and check the commitment `secure_outputs1 = secure_outputs2` after (k) cycles. A violation is a T-alert.
5. Also monitor high-security microarchitectural state. A P-alert records internal difference propagation for the induction procedure (section 3.2, pp. 2783–2784).

The initial pseudo-property assumes `high_micro_state1 = high_micro_state2` at (t), equal primary inputs throughout the interval, and `access_control_configured1()` throughout the interval in copy 1. It checks both `secure_outputs1 = secure_outputs2` and `high_soc_state1 = high_soc_state2` at (t+k) (Figure 3, p. 2783). The configuration of copy 2 remains unconstrained after (t), so interference that changes it can be detected (section 3.2, p. 2784). Verus form: Inference: a Rust model can encode two state records, a `spec fn` for the miter transition, and `requires`/`ensures` contracts for equal high-state and output traces. A loop over cycles should use an `invariant` for correspondence and a `decreases` measure. This verifies the modeled transition system; it does not verify arbitrary RTL, timing semantics, or a SAT solver.

## technique: spatial decomposition and sound blackboxing

What it is. Instead of allowing every low-security signal to differ at once, UPEC-OI checks one propagation source at a time, usually one low-security IP. The paper says this “does not compromise the generality of the proof” because symbolic initialization can represent joint influence when needed (section 3.3.2, p. 2785).

Blackboxing removes internal state and primary I/O of IPs unaffected by the selected source and exposes only their crossbar interface. For an IP outside the propagation source, its outputs to the crossbar are constrained equal between miter copies. Its inputs from the crossbar are monitored; if a counterexample shows propagation to that interface, the IP is whiteboxed and the check is repeated (section 3.3.3, p. 2785). The approach exploits the crossbar as an information bottleneck. Complete blackboxing of the propagation source is deliberately more permissive: arbitrary interface outputs may generate counterexamples that the real IP cannot produce, but this is useful when defending against unknown third-party RTL (p. 2785).

How to apply it:

1. Partition (Z_l) into propagation sources and select one source for a run.
2. Blackbox IPs whose state does not intersect the propagation source, constraining their outputs to the crossbar equal between copies. A blackboxed source instead supplies unconstrained outputs to the crossbar.
3. Leave the crossbar and any IPs whose state bits are in the immediate fanout of the source whiteboxed (section 3.4, p. 2786).
4. Monitor crossbar outputs to blackboxed IPs as alert candidates.
5. Whitebox any module implicated by a counterexample and rerun the property with updated macros.

Verus form: Inference: represent each black-box component by a contract over interface messages and make the trust boundary explicit in a module contract. A proof can establish that equal initial state and equal input histories preserve equal abstract component state, provided the contract captures deterministic behavior. The component contract and its correspondence to any concrete implementation require separate justification. Do not model blackboxing as an `external_body` on the function being verified; it is an explicit assumption boundary around an unverified component.

## technique: temporal isolation and induction over P-alerts

Temporal isolation permits the selected source's interface inputs to differ only at the initial cycle (t). The solver may symbolically initialize a chain of already-sent messages, while later source inputs are equal. This prevents one source from generating an artificial chain of unrelated attacks and retains completeness for chains that can actually propagate (section 3.3.4, p. 2785).

The full method has a base and a step procedure (section 3.4, pp. 2786–2788). The authors explain, “The global proof is obtained by iteratively performing inductions over the proof instances generated by this decomposition.” (contribution list, p. 2780). Apply it as follows:

1. Create the miter, spatially decompose sources, blackbox unaffected IPs, and check a (k=0) combinational property for a direct source-to-secure-output path (Algorithm 1, p. 2786).
2. For each source, start the base procedure with (k=1) and (A_0=\{NIL\}) (Algorithm 2, p. 2787).
3. For each variable recorded at the previous base window, assume that variable differs at (t+k−1); omit this assumption for the initial NIL case. Check T-alert candidates first and return any T-alert for inspection. Otherwise, check P-alert candidates. Extract affected variables (a_k), remove them from the remaining candidate set, add them to (A_k), and repeat until no P-alert remains for that assumption and (k).
4. Check black-box interfaces; whitebox any affected module and immediately check its outputs for T-alerts.
5. Increment (k) and repeat until no new affected variables remain. This yields a bounded proof for the base windows.
6. Run the step procedure for every variable in the accumulated set (A), including variables added during the step procedure. The step property assumes equality for remaining P-alert candidates and T-alert candidates, assumes the selected affected variable differs at (t), and checks alert candidates at (t+1). It checks T-alerts, adds newly affected P-alert variables to (A), removes them from the candidate set, and whiteboxes affected modules as in the base procedure (Figure 7, p. 2787; Algorithm 3, p. 2788).
7. If the step procedure finds no T-alert, the induction proves operation integrity for arbitrary temporal length for that source. Repeat for every source; Algorithm 1 returns “SECURE” only after all sources pass (pp. 2786–2788).

Verus form: Inference: encode the affected-variable set as a finite ghost set and prove that each base iteration removes a candidate or finds a counterexample. A loop `invariant` can state that (A) contains exactly previously established propagation variables and a `decreases` measure can be the number of unchecked candidates. The two-cycle step can be a lemma about the transition relation. This is a proof of the modeled induction, not a replacement for RTL-to-model translation or solver soundness.

## technique: counterexample-guided design flow

The design flow starts with high-level access-control requirements: security levels, separation granularity, and optional read/write permissions (section 4, p. 2788). Engineers formulate UPEC-OI properties, run the procedure, inspect T-alert counterexamples, and refine RTL until no vulnerability remains. Counterexamples may instead require constraints on a trusted IP that will be refined and verified separately, software configuration requirements, environment restrictions, or invariants excluding unreachable states. Appendix C requires hardware invariants to overapproximate all reachable states and other constraints to overapproximate the security-reachable states (p. 2796).

The flow was applied to OpenTitan Earl Grey. The Ibex CPU was the TCB; two added IPs were low security, and crossbar routing rejected low-to-high requests. Four propagation sources were checked: controller requests, controller ready, peripheral responses, and peripheral ready (sections 5.1–5.2, pp. 2789–2790). UPEC-OI found eight weaknesses. One was port contention: a low-security request could delay a CPU request through the shared bridge FIFO, allowing a difference to reach the program counter. The fix added separate high/low interfaces and high-priority service for the secure interface (section 5.2.1, pp. 2789–2790). Another let a malicious controller hold `ready` low indefinitely; the fix added a response FIFO and bounded outstanding requests by its depth (section 5.2.2, pp. 2790–2791). A third used an orphan peripheral response to decrement `num_req_outstanding` from zero and starve the SoC. The authors simulated the attack and reported it to OpenTitan, whose developers acknowledged the security risk. The paper proposes also checking that counter is larger than zero before forwarding a response (section 5.2.3, p. 2791).

The final verification used OneSpin 360 DV on an Intel i7-6700 at 3.40 GHz with 32 GB RAM; all property checks were sequential (section 5, pp. 2789–2791). Table 1 reports controller-request verification at 06:41:16 and 23,902 MB peak memory with (k=12); controller-ready at 11:14:05, 25,483 MB, (k=13); peripheral-response at 00:00:26, 6,978 MB, (k=3); and peripheral-ready at 00:00:03, 6,146 MB, (k=1) (Table 1, p. 2791). The modified SoC had almost 14 million state bits, yet the authors attribute tractability to sound blackboxing. The overall flow consumed around three person-months and 19 iterations (p. 2791). Failed checks returned counterexamples in under five minutes; successful checks dominated total time (p. 2791).

Inference: in verified Rust, the directly transferable pattern is counterexample-guided refinement of contracts and invariants around a state machine. A Verus implementation could prove that an access-control transition rejects low-to-high messages, preserves queue bounds, and cannot underflow outstanding-request counters. It cannot prove a hardware timing property unless the RTL timing model and bridge semantics are represented.

## what is proved and what remains trusted

The paper gives a completeness argument: if no T-alert is found by the induction procedure, the OI hyperproperty holds for the modeled SoC and configuration (Appendix B, pp. 2795–2796). The paper explicitly leaves firmware-level verification targets outside its scope (section 3.2, p. 2783). The design flow makes software, trusted-IP, and environment conditions separate requirements (section 4, pp. 2788–2789; Appendix C, p. 2796). Source-IP blackboxing covers arbitrary interface behavior; other IPs are whiteboxed if interference reaches their interfaces (section 3.3.3, p. 2785). Inference: applying the proof to deployed hardware also requires confidence in the RTL implementation process and the commercial IPC tool. The paper does not evaluate Rust or Verus.

Inference: VL should not redo UPEC-OI's OpenTitan hardware case study. It should reuse the separation between (1) a small formal state-machine contract, (2) explicit untrusted component assumptions, and (3) counterexample-driven refinement. The paper's eight found weaknesses show that access checks at one routing point do not establish end-to-end integrity: timing, ready/valid backpressure, FIFO state, and stale response state all matter.

## techniques for the catalog

- 2-safety interval property — compare two identical SoC traces with one low-security difference and require equal secure state and outputs
- spatial decomposition — verify one low-security propagation source at a time while retaining completeness through symbolic state
- sound blackboxing — abstract unaffected IPs at crossbar interfaces and whitebox modules implicated by counterexamples
- temporal isolation — allow source differences only at the initial cycle while symbolic state represents already-sent message chains
- P-alert induction — iteratively record affected microarchitectural variables, then prove a two-cycle step property for unbounded T-alert absence
- counterexample-guided design flow — turn counterexamples into RTL fixes or explicit firmware/environment constraints and rerun until all sources pass
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Once an affected microarchitectural state variable is removed from PC, it will no longer be a candidate variable in the future iterations of the property check."): checked the complete paper, quotations, numbers, references, property assumptions, decomposition, induction, design flow, and evaluation; corrected alert definitions, page and figure references, blackbox signal directions, induction steps, guarantee scope, and the proposed orphan-response fix; used the publisher link printed in the paper; did not reproduce experiments or validate the Verus inferences.
