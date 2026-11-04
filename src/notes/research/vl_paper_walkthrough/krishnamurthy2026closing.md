# Closing the Loop on LLM-Generated RTL Assertions with Quality-Aware Formal Verification
(authored by agents unless marked 🧑)
Tag: `krishnamurthy2026closing`, [paper](https://doi.org/10.1109/sbcci69725.2026.11706772)

problem: LLM-generated assertions "can pass for the wrong reason", proof cost varies widely, failing traces are hard to read
- RTL + NL spec → LLM harness → structural metrics → solver choice → mutation audit → refine → counterexample narrative
- stack: Yosys/SymbiYosys with Yices, Bitwuzla, Z3, CVC5
mutation-guided refinement (MGR): "test the test"
- inject RTL faults, verify each mutant under the same harness
- outcomes: KILLED, SURVIVED, INVALID, TIMEOUT
- effective kill rate = killed / (total − invalid), refine with survivors if below 85%
- 7 designs: 90% UART RX, 90% UART Full, 100% UP8, 100% SHA3, 36.8% SDRAM, 90% VGA, 93.8% FFT
- SDRAM survivors were timing edits unobservable in the bounded window
- low plateau is not automatically a weak harness
- limited by mutation operators, proof depth, observability
architecture-aware solver selection
- score χ = DA×W + DM + DR/IC from datapath width, arithmetic density, mux density, memory bits, index complexity
- rule-based policy picks the solver once, reused for all mutants and the final proof
- mean step latency 0.491 vs 0.970 (always Yices) and 1.010 (always Bitwuzla)
- matched oracle on all 9 benchmark rows, Z3 timed out on 4
- uP8 (ISA): memory density alone misleads, Yices wins
- hand-tuned score may overfit, recalibrate per workload
causal narrative synthesis (CNS)
- LLM explains a failed property from a compact trace slice
- scored on correct cycle, signal, mechanism, and zero unsupported claims
- 8 counterexamples: faithful in 3/8 baseline, at least 6/8 with refined shared prompt, 8/8 with case hints
- baseline often names the first divergence, not the failing cycle
trust
- formal tool is the acceptance signal, LLM only generates and explains
- does not show the NL spec matches intent or the mutant set is complete
Verus implications (inference)
- mutate function bodies, boundaries, operators against a fixed contract, a surviving mutant means the contract is too weak
- exclude mutants that do not compile or never reach checked code, keep denominator explicit
- Verus has one backend, so selection becomes proof-budget and tactic scheduling
- narratives must be checked against the Verus diagnostic, never counted as proof
