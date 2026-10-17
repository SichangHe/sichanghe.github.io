# Coco: Co-Design and Co-Verification of Masked Software Implementations on CPUs
(authored by agents unless marked 🧑)
Tag: `gigerl2021coco`, [paper](https://www.usenix.org/conference/usenixsecurity21/presentation/gigerl)

## result
Coco verifies Boolean-masked assembly with constant control flow against a concrete processor netlist. It combines cycle-accurate simulation with execution-aware correlation analysis and reports the netlist location and execution cycle of detected leakage. Its final check is: “We encode the resulting correlation sets as a propositional Boolean formula and use a SAT-solver to check for leakage.” (Section 2.4, p. 1472)

## technique: time-constrained probing
Give the attacker d probes, each observing one location during one clock cycle. Allow spatial and temporal combinations, including repeated observations of one location in different cycles. Security at order d means that combining these observations reveals no information about native values. The paper states: “The attacker can distribute the d probes spatially and temporally.” (Section 2.3, p. 1472) Observations within a cycle include transitions and glitches, so one probe can expose more than two intermediate values.

## technique: execution-aware stable and transient correlation sets
Label initial register and memory bits as shares, fresh randomness, or public. Propagate correlations through the circuit for each clock cycle, updating registers between cycles. For stable sets, XOR/XNOR use element-wise multiplication of their input sets; AND/OR use the same operation on biased input sets, each augmented with the constant term 1. Multiplexers combine the biased selector set with the union of the two data-input sets. The paper states: “The resulting over-approximation Stx is sound but not always tight.” (Section 2.4, Table 1, p. 1473) Sets may include terms whose actual coefficients are zero, causing false positives.

Transient sets account for transitions and glitches. A register combines its old and new stable sets, each augmented with 1; combinational elements conservatively combine their inputs' biased transient sets. Concrete public control values simplify stable sets. Transient simplification additionally requires tracking signal stability: unchanged registers cannot produce glitches; stable inputs imply a stable output; AND with a stable FALSE input or OR with a stable TRUE input can suppress glitches from another input. In the Figure 1 example, setting a public AND input to zero simplifies the stable set immediately, but the transient set only after that input stays zero into the next cycle. (Section 2.4, pp. 1473–1474)

## technique: four-step verification pipeline
1. Compile masked RISC-V assembly and convert the binary into a Verilator testbench.
2. Use Yosys to synthesize the SystemVerilog hardware into a Verilog netlist and circuit graph.
3. Run Verilator with the testbench and netlist to produce a VCD execution trace.
4. Give the graph, trace, and verification configuration to the Python checker. The configuration specifies share/randomness labels, stable or transient mode, cycle count, and masking order. The checker constructs SAT formulas and uses CaDiCaL to check leakage, reporting its netlist location and cycle. (Section 5.1, pp. 1479–1480)

The trace supplies concrete control values, while labels track secret correlations symbolically. This relies on input-independent control: “We require implementations with a constant control flow using Boolean masking and therefore, these control signals are the same for all inputs to that software implementation.” (Section 2.4, p. 1472) The IBEX experiments label and check individual bits because computation units treat register bits differently. (Section 5.3, p. 1480)

## technique: co-design fixes
Run Coco, inspect each reported netlist location, fix hardware or constrain software, and repeat until no leakage is detected. The IBEX analysis retains two software constraints (Section 3, p. 1474):

- C1CORE: “Shares of the same secret must not be accessed within two successive instructions.”
- C2CORE: “A register or memory location which contains one share must not be overwritten with its counterpart.”

For register reads, precompute one-hot enables in the instruction-fetch stage and store them in registers. AND logic after each data register suppresses unselected values; an OR tree replaces the read multiplexer tree. Enable reads only when the instruction requires them. Apply a corresponding precomputed enable to write data before each write multiplexer. These changes address switching inside the multiplexer tree, glitchy addresses, and unintended reads. (Section 3.2, pp. 1475–1476)

Enable ALU, multiplication/division, and control/status computations only when required, using AND logic at their inputs and enable bits precomputed in the instruction-fetch stage. Clear the hidden load/store buffer in the first cycle of every memory access; this prevents a share retained by a misaligned access from interacting with later data. (Sections 3.3–3.4, pp. 1476–1477)

For SRAM, choose which address bits receive stable one-hot encoding. Encoding the upper bits prevents glitches across blocks: put counterpart shares in separate blocks and avoid consecutive accesses. Encoding the lower bits prevents glitches within a block: put counterpart shares in the same block and avoid consecutive accesses. A real SRAM block needs internally stable word-line signals to support the latter construction without modification; the paper does not establish this for arbitrary SRAM products. (Sections 4.1–4.2, pp. 1478–1479)

## evidence and limits
The secured IBEX core occupies 22.2 kGE versus 20.2 kGE for the base design, a reported 9.9% increase. These are f130LL synthesis results excluding data SRAM and instruction ROM. Detailed latency investigation is left open. (Section 3.5, Table 2, p. 1477)

Table 3 (p. 1481) includes first-, second-, and third-order masked computations. The first-order register-only DOM Keccak S-box takes 89 execution cycles and 2.6 minutes for transient verification; the first-order DOM AES S-box takes 1900 cycles and 4.75 hours. A deliberately broken DOM multiplier is detected in cycle 12; a Keccak S-box violating C2CORE is detected in cycle 70. (Section 5.3, p. 1480)

The formal experiments use a Verilog model of SRAM with 16 blocks of eight 32-bit words, rather than real SRAM macros. (Section 5.1, p. 1480) The physical evaluation covers a register file and simple ALU mapped manually to an FPGA, rather than the complete processor or a fabricated ASIC. For a first-order DOM Keccak S-box, 100 000 power traces show significant first-order leakage for the original register file and no significant peaks for the secured version. The authors write: “Here, the leakage assessment reveals no significant peaks, which indicates that our secured design works as expected.” (Section 5.4, p. 1482) This measurement supports the tested configuration and attack order.

Inference: a verified Rust workflow could encode the software access and overwrite constraints as proof obligations, then use a separate processor-netlist checker for leakage. Connecting those obligations to the executed assembly would require an additional justification; the paper does not provide a Rust or Verus integration.

## techniques for the catalog
- time-constrained probing: model d probes across locations and cycles
- execution-aware correlation sets: propagate stable and transient leakage terms using traces
- netlist co-verification: compile, simulate, extract VCD, and SAT-check labeled shares
- leakage-directed co-design: fix reported hardware locations or impose software constraints and rerun

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This design choice ensures that no glitches can occur across SRAM blocks, yet they could still occur between the words of a single SRAM block."): checked the whole paper, quotations, numbers, section/page references, and technique steps; corrected quotations, biased-set rules, stability conditions, SRAM placement constraints, and references; expanded evaluation limits and replaced unsupported Rust claims with a proposed integration marked Inference; used the publisher link printed on the paper; did not inspect implementation artifacts or reproduce proofs, synthesis, timings, or measurements.
