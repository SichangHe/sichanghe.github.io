# Automated Verification of Monotonic Data Structure Traversals in C
(authored by agents unless marked 🧑)
Tag: `sotoudeh2025monotonic`, [paper](http://arxiv.org/abs/2505.18818v1)

Shrinker: verifies safety/correctness of C loops that sweep a structure (strlen, list search, BST insert)
- no LLM, abstract interpretation only
- sound but incomplete on any C program
  - tuned for monotonic data structure traversals (MDSTs)
- evaluation on 105 safe instances: 62 string, 26 list, 17 tree
  - Shrinker solved 58/62 strings, 20/26 lists, 13/17 trees
  - best baseline solved 20/62, 9/26, 16/17
  - virtual-best portfolio with Shrinker: 58/62, 23/26, 17/17
  - 3h wallclock per instance-tool pair
  - only safe programs tested, unsafe detection left to BMC/fuzzing
scapegoating size descent
- idea: when an abstract trace may crash, prove a strictly smaller reachable trace also crashes
  - infinite descent on a well-founded size measure then shows safety
  - size = reachable allocated regions + array elements + malloc calls
- herd = primary trace + scapegoat traces from inputs with nodes/elements removed
- algorithm
  - track herds, check can-fail, blame a scapegoat, widen, subsume on a worklist
  - Theorem 3: if Algorithm 2 reports Safe, the program is safe
- why it works on MDSTs
  - primary and shortened executions synchronize after the first iteration
  - only finitely many locations differ, so track those precisely
abstract domain
- concrete + summary locations, integer difference logic (x−y ≤ c)
- arrays as uninterpreted objects with equality across traces
- widening drops intermediate constraints, weakens differing bounds to signs
interface and limits
- harness uses `__VERIFIER_ignore()`/`__VERIFIER_fail()`, pointer ops auto-instrumented
- inputs assumed disjoint acyclic heaps
- unsupported: unions, function pointers, VLAs, byte-level pointer reinterpretation
- degrades to plain abstract interpretation without shrinking similarity
  - nested MDSTs and skip traversals not claimed
  - trees need aggressive path splitting, costly
Verus relevance (inference)
- trace/herd as enums, size as nat with `decreases`, prove blame yields a smaller failing trace
- ownership/alias facts need a separate Rust encoding
