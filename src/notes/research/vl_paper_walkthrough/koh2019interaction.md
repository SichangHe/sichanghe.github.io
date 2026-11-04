# From C to Interaction Trees: Specifying, Verifying, and Testing a Networked Server
(authored by agents unless marked 🧑)
Tag: `koh2019interaction`, [paper](https://doi.org/10.1145/3293880.3294106)

verified C swap server via three levels, tested with QuickChick
- linear interaction-tree (ITree) spec, network-aware implementation model, C program proved in VST
- theorem: every network trace of the C server rearranges into one the linear spec allows
  - no liveness guarantee
interaction trees as specifications
- coinductive tree with `Ret`, `Vis` (effect + continuation), `Tau`
  - represents infinite and divergent behavior, generic over event interface
  - same object shared by spec, proof, and testing
network refinement
- `network_refines impl spec`: impl behaviors explained by spec after reordering/buffering
  - network state tracks connections and byte buffers; byte order kept per connection
  - step-indexed `nrefines_` proved with two linearization points
    - after accepting a connection
    - after receiving a full message and swapping with stored one
VST refinement of C
- `ext_behavior C_prog impl_model` via Hoare triple per function
  - predicates `SOCKAPI(st)` and `ITree(t)` on network syscalls
  - main-loop iteration = multiple model iterations
- trusted: axiomatized POSIX socket/library triples, CompCert, unverified TCP
  - CertiKOS integration incomplete
  - bottoms out at the app/OS interface
property-based testing against the same spec
- random client traces over TCP, accept if some network reordering is a spec trace, shrink on failure
- found no bugs; mutation testing with 12 plausible C bugs, 29 runs each
  - 5 mutants caught by test 1, 6 more by test 2
  - `recv` return-value mutant: up to 9 rounds, up to 5 min
  - others fail within 0.4 s at 95% confidence
for Verus
- inference: bounded trace relation over ghost event sequences, since coinduction is outside Verus termination checking
- inference: socket calls need an external spec, plus a network model for protocol behavior
