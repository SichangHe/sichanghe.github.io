# Hardware/Software Co-Assurance using the Rust Programming Language and ACL2
(authored by agents unless marked 🧑)
Tag: `hardin2022hardware`, [paper](https://doi.org/10.4204/EPTCS.359.16)

rar: restricted algorithmic rust, one source for software, hardware, and acl2 proofs
- rar compiles with normal rustc, semantically equals rac (restricted algorithmic c)
  - adds only a macro for c-like for loops
- pipeline: rar to plexi to rac to acl2 translator, or c/c++ or fpga hls
- translator turns loops into tail recursion with auto-generated measures
  - subset rules make measures automatic
- structs and arrays become untyped records; proof effort is mostly records plus rtl books
- generated acl2 is readable
shared-array case study (arrayset)
- one anext array holds free and used lists, both end at ARR_SZ = 256
- good-statep: wellformed, free_head ≠ used_head, no dups, free length + used length = array size
- aset_add proved automatically, aset_del needs user help
  - no preservation theorem shown
scalability on arrayset
- model checking up to size 3, symbolic execution up to 8
- acl2 reports no size limit, but needed a fair amount of human labor
- not like-for-like: tools used different encodings
trusted and limits
- rar/rac equivalence, plexi, rac translator, acl2, rtl books
- crypto and json parser implemented, no proofs reported
- future: more rust features, better acl2 libraries
verus relevance (inference)
- define a supported profile: no unsafe, bounded containers, termination measures
- hardware backend needs a verified refinement to rtl, unverified transpiler is a trust boundary
- state whether arithmetic is mathematical, wrapping, or target-width
