# RustSFQ: A Domain-Specific Language for SFQ Circuit Design
(authored by agents unless marked 🧑)
Tag: `oishi2025rustsfq`, [paper](https://arxiv.org/abs/2502.11848)

## purpose and core abstraction

RustSFQ is a Rust-embedded DSL for single-flux-quantum circuits. SFQ's key invariant is one-to-one pulse consumption: “every output signal must be consumed only once by the input of the following component” (Introduction, p. 1). The DSL represents each signal as an owning `Wire`; gate methods consume input wires and return new output wires. In the paper's two defect examples, Rust ownership makes the compiler reject a wire with multiple receivers, and the compiler warns about a wire with no receiver (Section II-C, pp. 2–3). The paper says: “The key feature of RustSFQ is that it ensures the input–output consistency by leveraging Rust’s ownership system.” (Conclusion, p. 6).

## technique 1: ownership-typed circuit construction

Use RustSFQ when designing a gate-level SFQ circuit and you need compile-time input-output consistency.

1. Create a `Circuit` with arrays of input, output, loop, and counter-clock ports using `Circuit::create`; it returns owned `Wire` values for input ports; its loop and counter-flow ports are covered in technique 2 (Section II-A, p. 2; Listings 2 and 3).
2. Call gate methods such as `split`, `and`, `xor`, `or`, `dff`, or `buff` (the names used in Listings 2-4). Each consumes its input `Wire`s and returns newly created output wires (Section II-A, p. 2).
3. Route each returned wire to exactly one subsequent gate or to `set_outputs`, which consumes output ownership (Section II-A, p. 2; the text writes `set_output()`, the listings `set_outputs`).
4. Generate SPICE or Verilog strings with `to_spice()` or `to_verilog()` after compiling and executing the Rust description (Section II-A, p. 2).

The half-adder example splits `a`, `b`, and `clk`, then feeds each pair into `and` and `xor`, and calls `set_outputs([c, s])` (Listing 2, p. 2). Listing 5 intentionally sends `a` to both `and` and `xor`; the Rust compiler gives an ownership error on the second use because the first call consumed ownership (Section II-C, pp. 2–3). Listing 6 splits `a` twice and leaves `a3` unused; the compiler warns about an unused variable (Section II-C, p. 3). The authors state: “On the contrary, a description without errors or warnings will guarantee that the circuit is valid as an SFQ circuit that satisfies input–output consistency.” (Section II-C, p. 3). The paper says the detection uses ownership "and static code analyses" (Section II-C, p. 2).

Inference: In Verus, the executable ownership pattern remains ordinary Rust, while a proof layer could specify gate-graph properties such as output uniqueness and port counts. Verus `requires` and `ensures` can describe constructor and gate-method relationships; `assert` or proof functions can establish graph invariants. Rust's move checker catches aliasing, and the unused-variable warning catches dropped wires (a warning, not an error, so Inference: the guarantee holds only if warnings are not suppressed). The paper's guarantee is limited to its DSL's encoded invariant and does not prove electrical timing or analog behavior.

## technique 2: advanced loops and counter-flow clocks

Use `set_loops` and `CounterWire` when data flow contains feedback or the clock travels opposite to data flow, which cannot be written as a simple upstream-to-downstream chain (Section II-B, p. 2).

1. Create loop wires at the circuit's upper end by passing loop ports to `Circuit::create` (Section II-B, p. 2; Listing 3).
2. Build the data path with ordinary gates and use `split` to produce a loop output and a circuit output (Listing 3, p. 2).
3. Call `set_loops([loop0])` to identify the wires at the lower end as the upper end (Section II-B, p. 2).
4. For counter-flow clocks, call `counter_split` and use only `BUFF` and `SPLIT` operations on `CounterWire`; these functions receive the output `CounterWire` and return the input `CounterWire`; register the input with `set_counter_inputs` (Section II-B, p. 2; Listing 3).

Inference: Verus can state that loop endpoints have matching abstract wire identities and that counter-clock operations preserve port counts, but the paper does not supply such proofs. Physical clock timing and pulse behavior remain simulation or hardware assumptions.

## technique 3: parametric circuits and typed composition

RustSFQ expresses reusable delays and subcircuits with ordinary Rust functions, const-generic circuit types (`Circuit<N, M, L, O, P>`, Listing 1) and ownership.

1. Define a function such as `delay_circuit(n: u32) -> Circuit<1, 1, 0, 0, 0>` (Listing 4, p. 3).
2. In a loop, repeatedly consume and rebind a `Wire` through `buff`; the final iteration names the output `q` and the others pass `None` (Listing 4, p. 3).
3. Call `set_outputs([a])` and return the typed circuit (Listing 4, p. 3).
4. Reuse it with `subcircuit(&delay5, [clk], ...)`; the circuit type, which includes the port counts, statically checks the number of inputs and outputs (Section II-B, p. 2).

Inference: Verus can add arithmetic contracts relating `n` to pipeline depth and port-count parameters, but generic type-level counts and Rust ownership already perform the structural checks described in the paper. A proof of functional delay or clock alignment requires a timing model absent from the paper.

## technique 4: automatic net naming and netlist generation

When a wire or gate is created, an optional explicit name can be supplied. If omitted, RustSFQ assigns names at compile time beginning with an underscore and numbering consecutively, avoiding conflicts unless the user breaks the naming rule (Section II-D, p. 3). This reduces manual netlist editing while preserving names for I/O and debugging. `to_spice` and `to_verilog` produce the target netlists; Listing 7 shows the generated SPICE for the half adder (Sections II-A and II-D, pp. 2–3).

Inference: In Verus, a `spec fn` could model the name allocator and an `ensures` clause could state uniqueness, but the paper only reports the implementation behavior and no formal proof of name uniqueness beyond the naming rule.

## technique 5: Reed–Solomon case study and evidence

The authors implement an RS(12,8), 4-bit encoder with four pipeline stages, four input buffers of depth eight, and a 10 GHz clock (Section III, p. 3; the buffers are described in Section III-C, p. 5). Digital simulation uses Icarus Verilog and analog simulation uses JoSIM on four eight-word messages (Section IV, pp. 5–6). Fig. 6 shows “some of the results” of the analog simulation, in which the four sets of results “were correctly output in sequence”; the digital simulation “also confirmed that the circuit operated correctly” (Section IV, p. 6). Excluding the time to store data into the input buffer, the computation takes 48 cycles, or 4.8 ns at a 100 ps clock period (Section IV, p. 6). The encoder uses counter-flow clocking, with 500 ps clock travel from the farthest downstream to the farthest upstream point (Section III-C, p. 5).

The RustSFQ description is two files totaling 24,885 bytes; generated SPICE is 29,837 bytes and Verilog 49,256 bytes (Table II, p. 6); the paper states the source is “less than one-third” of the combined output size. Of 796 net names, 218 (27.4%) are manual and 578 (72.6%) automatic (Table III, p. 6). The authors report that automatic naming eased net naming and that errors are found at compile time (Section IV, p. 6). Inference: the paper gives file sizes and name counts only, with no controlled productivity study, so its "higher productivity" claim (Abstract) rests on these proxies.

Inference: Verus could prove the finite-field algorithm against a mathematical RS specification and prove structural graph invariants, while Icarus/JoSIM remain external simulation evidence. The paper's simulations establish these four test messages and this circuit configuration, not universal RS correctness or hardware reliability.

## techniques for the catalog

- ownership-typed wires — consume each wire exactly once through gate methods and outputs to enforce SFQ input-output consistency
- loop and counter-flow modeling — use loop ports, `set_loops`, `CounterWire`, and `set_counter_inputs` for cyclic data and clock paths
- parametric typed circuits — use generic port counts and reusable subcircuits with ownership-preserving loops
- automatic net naming — assign explicit names selectively and generate conflict-free names for the rest
- simulation-backed case study — validate a Reed–Solomon encoder with digital and analog simulators on four messages
