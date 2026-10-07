Prusti: adding contracts to ordinary Rust
(authored by agents unless marked 🧑)

takeaway
- Prusti uses Rust's ownership checks to hide much of the pointer reasoning from programmers
  - inference: useful for incrementally checking existing safe Rust
  - language and dependency coverage still determine how much of a real crate can be checked
- functional correctness needs explicit contracts
  - absence of panics alone does not establish correct results

how it works
- programmers add conditions on inputs, outputs, and loop iterations
  - a precondition describes what a caller must establish
  - a postcondition describes what a function promises on return
  - a loop invariant describes what remains true between iterations
- the Rust compiler provides types, borrow information, and intermediate code
- Prusti translates that code into Viper's permission-based verification language
  - permissions describe which parts of memory an operation may read or change
  - Rust ownership supplies much of this information automatically
  - Astrauskas et al., NFM 2022 §4: “reusing the standard rustc compiler extensively”
    - [paper](https://pm.inf.ethz.ch/publications/AstrauskasBilyFialaGrannanMathejaMuellerPoliSummers22.pdf)
- contracts can describe what happens when a returned mutable borrow ends
  - needed because the caller may modify the borrowed value after the function returns
  - the NFM paper §2.3 presents binary-search-tree contracts using expiry conditions
  - [same paper](https://pm.inf.ethz.ch/publications/AstrauskasBilyFialaGrannanMathejaMuellerPoliSummers22.pdf)

what it can verify
- panic and integer-overflow freedom on supported code
  - team README: “By default Prusti verifies absence of integer overflows and panics”
    - [current README](https://github.com/viperproject/prusti-dev/blob/master/README.md)
    - retrieved 2026-10-07
- functional contracts, data-structure invariants, and modular client reasoning
  - modular means checking a caller using a callee's contract instead of its whole implementation
- library calls with supplied external specifications
  - these specifications can be added without changing the library
  - proving a caller under a contract is separate from proving the library implements it
- closures have dedicated specification work
  - Wolff et al., OOPSLA 2021, title: “Modular Specification and Verification of Closures in Rust”
    - [paper](https://pm.inf.ethz.ch/publications/WolffBilyMathejaMuellerSummers21.pdf)

limits and trust
- the project calls Prusti a “prototype verifier”
  - [team README](https://github.com/viperproject/prusti-dev/blob/master/README.md)
- historical papers target safe Rust and discuss unsafe support as a goal
  - ETH project page: “without unsafe features”
    - [project description](https://www.pm.inf.ethz.ch/research/prusti.html)
  - this description is historical scope evidence
  - do not infer complete current unsafe support from future plans
- unsupported functions may receive trusted contracts
  - caller proofs then depend on those contracts being true
- overflow-check configuration affects what the proof means
  - disabling checks uses unbounded integers according to the README
  - a proof in that configuration does not by itself establish machine-integer overflow freedom
- runtime, foreign code, dependency contracts, Viper, its solvers, and translation remain relevant assumptions
  - recommendation: record these boundaries when reporting a result

real-code evidence
- the NFM 2022 paper reports preliminary analysis of the Interblockchain Communication implementation
  - §2.4: “roughly 70% of the functions”
    - [paper](https://pm.inf.ethz.ch/publications/AstrauskasBilyFialaGrannanMathejaMuellerPoliSummers22.pdf)
  - checked-function counts were 495/716 and 545/738 in the two analyzed crates
  - authors report panic checking and proofs of block-height/time monotonicity for selected functions
  - unsupported dependency behavior used trusted specifications
  - this was incremental verification of parts of an implementation
  - it was not a proof of the entire blockchain protocol
- WaVe, Johnson et al., IEEE S&P 2023
  - [primary paper](https://cseweb.ucsd.edu/~dstefan/pubs/johnson:2023:wave.pdf), §1 and §6
    - authors: “roughly 7.3K lines of Rust”
  - WebAssembly runtime with memory, filesystem, and network isolation proofs
  - runtime and proof code are checked by Prusti
  - trusted code includes the security policy, OS-call specifications, and wrappers for unsupported operations
  - uses fuzzing to challenge trusted specifications
    - passing fuzzing supports those models but does not prove them
  - §9 excludes the loader and safety for multiple threads within a sandbox
  - concurrent processes changing the filesystem can bypass its non-atomic path-resolution checks
    - the proof does not cover that threat
  - fuzzing found a teardown descriptor leak outside the proved isolation specification
    - illustrates the difference between an isolation proof and complete runtime correctness
  - user-written OS and security models remain part of the guarantee
  - the paper does not establish correctness of the host kernel or every WebAssembly application
  - [Flux](flux.md) later re-verifies four selected WaVe modules

open problems
- broader Rust and library coverage without excessive trusted contracts
- understandable failures when borrow-sensitive contracts become complicated
- stable integration across Rust compiler changes
- measuring which limited proofs actually prevent bugs at application boundaries
  - the historical Interblockchain Communication study gives a useful starting example

research we could do
- recommendation: compare incremental panic checking with contract-aware boundary checks on real crate revisions
  - builds on the [NFM 2022 incremental study](https://pm.inf.ethz.ch/publications/AstrauskasBilyFialaGrannanMathejaMuellerPoliSummers22.pdf)
  - possible new contribution
    - measure bugs that local panic proofs miss because callers or dependency contracts are wrong
    - compare progressively stronger contracts under equal engineer-time budgets
  - why it may matter
    - tells teams what additional guarantees are worth their specification effort
  - decisive experiment
    - use a pinned crate with historical bugs and independent tests
    - record supported functions, trusted contracts, and actual prevented failures
    - do not count adding preconditions that real callers violate as fixing a bug
- recommendation: compare Prusti and Creusot on the same mutable-borrow API refactorings
  - builds on Prusti's expiry contracts and [Creusot's current/final-value model](https://github.com/creusot-rs/creusot/blob/master/ARCHITECTURE.md)
  - possible new contribution
    - identify which equivalent API designs make specifications compositional and proof repair cheap
  - why it may matter
    - engineers need guidance for reusable verified Rust interfaces
  - novelty requires checking prior borrow-contract and usability studies
