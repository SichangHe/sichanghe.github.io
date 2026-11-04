# Deductive Verification of Unmodified Linux Kernel Library Functions
(authored by agents unless marked 🧑)
Tag: `efremov2018deductive`, [paper](http://arxiv.org/abs/1809.00626v1)

26 Linux 4.12 mem/string functions verified in unmodified C with AstraVer (Frama-C/Jessie), ACSL contracts
- 23/26 fully proved, 11 of those only via 2 new ACSL constructs
- 2/26 proved after minor source change (memset, strcmp)
- 1/26 unprovable under the memory model (memmove, cross-block pointer comparison)
- 2781 VCs total, all but 1 discharged by some solver
  - CVC4 1.5 most VCs (2761/2781), Z3 fastest avg (0.22s)
- contracts ~2.6x the library source in lines
contracts derived from implementation, not docs
- kernel docs/man pages incomplete or differ from implementation
- spec rewritten from source at proof stage anyway
- weaken preconditions and strengthen postconditions maximally
- split outcomes into disjoint complete behaviors
loop invariants and variants for pointer scans
- save initial pointer/count as ghost values
- invariants relate current pointer and remaining count to ghost values
- prefix property, e.g. searched char absent in scanned prefix
- decreasing variant
integer model
- default defensive (overflow VCs), per-operation modulo annotations for intended wrapping
- quantified axioms hurt solver predictability and performance
memory model
- Jessie region analysis gives disjoint heap regions, so framing needs no lemma
  - coarse, needs explicit weakening for aliasing
- allocation tables with offset_min/offset_max define dereference validity
- incomplete address axioms block cross-block comparisons
- unions with nested structs not soundly representable
pure specs
- logic function (e.g. strlen) plus ordinary executable contracts
  - axiomatic specs not executable in E-ACSL
- lemmas first only contradiction-checked, later proved with auto-active lemma functions
Verus takeaways (inference)
- Rust ownership covers much of the aliasing/validity work
- wrapping needs explicit ops plus bridge lemmas
- raw-pointer ordering (memmove) needs an explicit model
