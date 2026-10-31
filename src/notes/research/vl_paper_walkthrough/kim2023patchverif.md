# PatchVerif: Discovering Faulty Patches in Robotic Vehicles
(authored by agents unless marked 🧑)
Tag: `kim2023patchverif`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/kim-hyungsub)

PatchVerif combines static analysis and differential testing to identify faulty robotic-vehicle (RV) patches. Its abstract states: “PATCH V ERIF uses a combination of static and dynamic analysis to measure how the analyzed patch affects the physical state of an RV.” (Abstract, p. 3011.) It profiles patch effects, generates inputs, executes unpatched and patched software in simulators, and uses physical properties and support vector machines (SVMs) to identify faults. It targets logic bugs affecting physical behavior and also detects memory bugs triggered during testing (Sec. 2, p. 3012).

## technique: patch-impact profiling

What it is and when to use it. Profiling maps a changed code fragment to RV states, environmental conditions, and related inputs. This helps when existing tests miss the physical circumstances that expose a fault. The three input classes are user commands, configuration parameters, and environmental factors (Sec. 2, pp. 3012–3013).

How to do it. (1) Extract variable and function names from removed and added code, and terms from developer comments. (2) Keep nouns and match the terms against a synonym table of RV physical states and environmental conditions; call the matched set `Physet` (Sec. 6.1, p. 3015). The authors explain: “We leverage a name-matching method because variable/function names in RV software are decided by strict coding conventions [2].” (3) Use an extended PGFuzz profiling engine to map those states and conditions to inputs. (4) Build the RV software with Gcov and LCOV, randomly execute inputs on a simulator, and retain inputs executing the patch code in `Inputset` (Sec. 6.2, p. 3015).

If naming conventions do not hold, users can select taint analysis instead. Appendix C constructs a data-flow graph from LLVM bitcode in single static assignment form and applies Andersen’s pointer analysis, described as “an inter-procedural, path-insensitive, and flow-sensitive points-to analysis” (p. 3028). Variables in the patch are taint sources; newly tainted variable names are compared with the synonym table. Thus the fallback still uses names to recover physical context. In the comparison on 80 patches, name matching identifies 3.3 states/conditions per patch on average, versus 35.8 for taint analysis; subsequent dynamic analysis triggers 80 versus 62 patches within a one-hour limit (Sec. 9, p. 3024).

Verus form. Inference: a Verus implementation could specify state and input dependencies and prove relations over an explicit abstract model. Name matching, taint analysis, and simulator experiments alone do not establish those relations for all inputs.

## technique: branch reachability with symbolic execution

What it is and when to use it. PatchVerif searches for inputs that execute conditional branches in the patch. A branch not reached within a user-defined time is treated as unreachable for this procedure; this is not a proof that no real input reaches it (Sec. 6.3, pp. 3015–3016).

Steps from Sec. 6.3: (1) randomly select inputs changing elements of `Physet`, execute them in the simulator, and store those reaching patch branches in `Inputset`. (2) For a branch still unreached, extract variables and function calls from its guard and find their definitions. (3) Replace these terms with symbolic variables through KLEE’s `klee_make_symbolic` API. Run KLEE on the extracted function containing the patch, rather than the whole program. (4) Insert concrete assignments into local variables and replace global variables and function calls with constants from KLEE’s test cases. (5) Test both the original developer patch and the modified patch, because forcing one branch may terminate the function and prevent testing later branches. The authors state: “Triggering unreachable branches enables us to increase code coverage and discover six additional bugs introduced by faulty patches in ArduPilot and PX4.” (p. 3016.) They report a maximum exploration time of 30 minutes and a maximum depth of five branches.

Verus form. Inference: symbolic execution can suggest candidate inputs; verifying the original function would require proving its specified behavior for all permitted inputs. Results from a patch modified with constants do not themselves prove the original patch’s behavior.

## technique: mutation guided by physical distance

What it is and when to use it. The mutation engine seeks inputs increasing physical differences between unpatched and patched simulations. Its distance is `DIS = sum_i=1..4 |F_i - F'_i|`, where the four features represent timeliness, efficiency, precise navigation, and stability (Sec. 6.5.3, p. 3017).

Algorithmic steps (Algorithm 1 and accompanying text, p. 3017): obtain inputs triggering the patch; randomly select other inputs from `Inputset`; choose values using distance and code coverage; assemble a test case; initialize separate simulators and randomly change related environmental conditions; execute the test on both software versions; calculate physical differences and apply the bug oracle; update coverage. Stop when the oracle identifies a fault or coverage stops progressing for a user-defined time. Mutation uses a mission plan from ArduPilot’s test suites as its template, avoiding infeasible input orders such as increasing altitude before take-off.

If increasing an input increases `DIS`, keep increasing it. An out-of-range assignment is considered self-sabotaging when it prevents both versions from completing the test; PatchVerif then enforces the input’s valid range, obtained through PGFuzz preprocessing (Sec. 6.5.3). For ordinary patches, the unpatched baseline is the released version closest to the patch. For new-feature patches, it is the version immediately before the patch (Sec. 6.5.1).

Verus form. Inference: this search can supply regression tests or counterexample candidates. A proof would instead establish a specified physical bound for every allowed input in the chosen model.

## technique: invariant selection and learned oracle

PatchVerif considers five properties: timeliness, efficiency, precise navigation, stability, and state consistency. Patch types can overlap: changes to ground speed, environmental factors, new features, and other patches (Sec. 6.4, p. 3016). It excludes timeliness and efficiency for speed patches, uses only state consistency for environmental patches, and excludes timeliness, efficiency, and stability for new-feature patches. For overlapping types, Figure 5 intersects the applicable property sets (Sec. 6.5.2, pp. 3016–3017).

Features measure mission duration, battery current, position error, attitude error and vibration, and critical state changes involving sensors, flight mode, pre-arm checks, and flight stage. PX4 simulation does not estimate battery consumption; PatchVerif uses actuator pulse width modulation signals as a proxy (Sec. 7 and Table 2, pp. 3018–3019). The supervised classifier uses the four numerical properties; state consistency covers discrete critical states (Sec. 6.5.2). A separate SVM is trained for each RV software package (Sec. 7).

Evaluation uses 80 known faulty and 80 selected correct patches, evenly split between ArduPilot and PX4. Correct labels require simulator reachability, patch age over one year, and agreement by two authors. Training evaluation repeats shuffled five-fold cross-validation 1,000 times. Mean precision, recall, and F1 are 97.9%, 92.1%, and 94.9%, respectively (Secs. 8.1–8.2, pp. 3018–3019; Introduction, p. 3012). These are classification results on the labeled dataset, separate from discovery results.

On 1,000 other patches, PatchVerif flags 117; developer responses identify two false positives, leaving 115 reported discoveries, 103 acknowledged and 51 fixed. Manual analysis also finds six missed faulty patches (Secs. 8.3–8.5, pp. 3019–3020). The paper’s real-vehicle result is based on firmware inspection, not reported flight reproduction of all bugs: “In case we found the buggy code included in the firmware, we assumed that the bug can be reproduced on the vehicle.” (Sec. 8.4, p. 3020.) This procedure identifies 74 of the 115 bugs for a Pixhawk 4 setup.

What is trusted and limited. The method depends on simulator fidelity, baseline correctness, selected properties, training labels, and classification accuracy. It cannot test the 137 device-driver patches excluded while collecting the 1,000-patch discovery set; its navigation-focused properties also miss supplementary features such as logging (Secs. 8.5 and 9, pp. 3020, 3023–3024). Inference: for agent-written verified Rust, its useful contributions are regression-test generation and identifying candidate specifications. The paper provides experimental evidence, rather than a deductive guarantee of patch correctness.

## techniques for the catalog

- patch-impact profiling — map changed code to physical states and related inputs with name matching or taint analysis
- symbolic branch reachability — run bounded KLEE analysis on patch-containing functions and test concrete substitutions
- physical-distance mutation — mutate simulator inputs to increase differences between unpatched and patched physical features
- invariant-aware learned oracle — select physical properties by patch type and classify numerical features with an SVM
