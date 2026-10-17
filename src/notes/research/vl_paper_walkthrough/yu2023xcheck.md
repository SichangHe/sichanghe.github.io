# XCheck: Verifying Integrity of 3D Printed Patient-Specific Devices via Computing Tomography
(authored by agents unless marked 🧑)
Tag: `yu2023xcheck`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/yu-zhiyuan-xcheck)

## purpose and assumptions

XCheck checks a printed patient-specific device (PSD) against its digital design using a CT scan. The attacker may compromise slicer software or printer firmware, change the model or G-code, and knows XCheck's design. The defender must have access to CT imaging and the original design as ground truth (section 3.2, p. 2818). XCheck compares the finished physical object with that design. The paper summarizes the goal as “XCheck follows a defense-in-depth approach and directly compares the computed tomography (CT) scan of the printed device to its original design.” (abstract, p. 2815).

The pipeline is: register the CT-reconstructed point cloud to the design, run added and missing voxel analysis, compare material distributions using Hounsfield units (HU), run ray-based volumetric analysis for adaptive sub-resolution attacks, combine four risk factors with gamma analysis, and show adjustable visualizations (Figure 4, p. 2819). Its guarantee is conditional on CT resolution and reconstruction accuracy. The authors evaluated 47 PSDs: 8 benign, 30 with geometric modifications, and 9 with material modifications, using an ELEGOO Mars SLA printer and a Siemens Vision CT scanner (section 6, pp. 2822–2823).

## technique: registration and voxel geometry comparison

How to apply it:

1. Approximate the original model with evenly sized polygons using Lloyd's algorithm to reduce alignment cost (section 5.2, p. 2819). After registration, voxelize both models for geometry comparison (section 5.3, p. 2820).
2. Use rigid plus uniform scaling registration (T(y_k,R,s,t)=sRy_k+t), with (R^TR=I), ​(​det(R)=1), to minimize misalignment (Eq. (1), p. 2819).
3. For large rotation or occlusion, initialize with Fast Global Registration and FPFH correspondences, then refine with Coherent Point Drift for noisy CT clouds (section 5.2, pp. 2819–2820).
4. Optionally prioritize clinician-specified anatomical landmarks during point-set registration (section 5.2, p. 2820).
5. For added voxel analysis (AVA), use CT voxels as the base and measure each CT centroid's closest distance to a design voxel. For missing voxel analysis (MVA), reverse the base and compared models. Flag a distance above the clinical threshold (section 5.3, p. 2820).

The closest-centroid definition is ​(ρ(p_i^r,P_o)=\min_{y\in P_o}\rho(p_i^r,y)) (p. 2820). The comparison examines all voxel centroids in both directions; the claimed detection bound depends on CT resolution (section 5.3, p. 2820). Inference: a Verus implementation can prove that registration output preserves finite voxel indices and that AVA/MVA scans every voxel exactly once, with `requires` and `ensures` for index ranges and threshold decisions. It cannot prove that CT reconstruction corresponds to the physical object without a sensor and reconstruction model.

## technique: material KDE validation

CT intensity is represented on the HU scale; water is 0 and air is −1000 (section 5.4, p. 2820). Because equal materials vary with density, XCheck compares the distribution rather than one voxel. Given HU values (x_1,\ldots,x_k), it estimates a Gaussian-kernel density ​(\hat f(x)=\frac1{kb}\sum_iK((x-x_i)/b)) (Eq. (2), p. 2821), then extracts expectation, highest density, and the HU at that density. Section 5.4 reports “the seven most common materials including a biocompatible resin” across organ-on-chip, dental-guide, and orthopedic-screw devices (p. 2821). Table 2 lists six named materials (p. 2825); the paper does not reconcile these counts.

Inference: to implement this in Verus, collect HU values over the printed device, document the KDE bandwidth (b), compare the three distribution features with a reference for the design, and apply a specified material threshold. The paper defines the features but does not specify a scalar distance for combining them into M. For verification, use a fixed-point or rational approximation for proof-friendly KDE bookkeeping in Verus, and treat scanner calibration, kernel evaluation, and reference clusters as trusted numeric components. A proof can show that every voxel contributes once and that reported features correspond to stored samples; it cannot prove material identity from a statistical threshold.

## technique: ray-based adaptive attack detection

Voxel analysis can miss many individually sub-resolution changes whose aggregate volume is harmful. Section 5.5 describes increasing pore radius, whereas the evaluated attack reduces pore size (section 6, p. 2824). XCheck emits rays from each voxel, uses a Fibonacci lattice for uniform directions, records rays whose model-intersection coordinates differ, and forms an alpha shape from first-intersection points using Delaunay complexes (section 5.5, p. 2821).

How to apply it:

1. Choose ray origins randomly, uniformly within the model space, or from voxel discrepancies above a threshold (section 5.5, p. 2821). The method also describes emitting rays from each voxel.
2. Cast corresponding rays through design and reconstruction; record the first intersection and length for each direction.
3. Keep rays with differing intersections and generate an alpha shape to estimate the discrepant volume.
4. Use the mismatched-volume percentage as the V factor in gamma analysis (section 5.6, p. 2822). In the scaffold experiment, the text reports affected-region radii of 0.25, 0.75, 1.25, and 1.75 mm and average pore size reduced from 155µm to 15µm. Figure 11 shows results for region radii of 0.25 and 1.25 mm (section 6, p. 2824). Table 3 instead lists porous-region attack extents of 0.025, 0.05, 0.075, and 0.1 cm (p. 2832); these do not match the full sequence in the text.

Inference: verify ray-index generation, deterministic lattice construction, and alpha-shape input bounds in Verus. The geometric predicates and floating-point intersection calculations need a separately specified numeric model. A proof of finite ray coverage does not prove that the selected rays capture every clinically harmful volume.

## technique: gamma risk aggregation and visualization

XCheck combines scaling (S=|1-s|), maximum voxel deviation (D), mismatched-volume percentage (V), and material deviation (M). For each factor (p\in\{S,D,V,M\}), ​(γ_p=\max(p,C_p)/C_p), where (C_p) is the application-specific acceptable threshold. It reports ​(Γ_{PSD}=\sqrt{γ_S^2+γ_D^2+γ_V^2+γ_M^2}) (Eq. (3), p. 2822). A standard object has all four factors equal to 1 and Γ=2; values above 2 indicate an attack under the selected thresholds (p. 2822).

The interface can apply a colormap, opacity cutoff, upper and lower color bounds, and voxel point size 1–10 (section 5.7, p. 2822). Inference: with positive thresholds and a specified scalar material metric, a Verus wrapper can prove nonnegative factor normalization, square-root result bounds under a fixed numeric abstraction, and that a displayed color corresponds to the stored distance. Clinical threshold selection and a physician's acceptance decision remain outside the proof.

## evidence and failure boundaries

The experiment detected 37 of 39 malicious cases (section 6.1, p. 2825). There were two false negatives, both substantially below CT resolution, and two possible false positives among eight benign devices; both false positives were lung-on-a-chip manufacturing defects (pp. 2825–2826). The average runtime from registration through gamma analysis, excluding printing and CT scanning, was 258.2 seconds for 47 PSDs (section 6.1, p. 2826). Table 3 records runtimes of 230.8–288.1 seconds and flags two benign lung-on-a-chip cases (p. 2832). It also leaves the solid-region 0.025 cm case unmarked despite Γ=2.02, while section 5.6 defines values above 2 as attacks. Inference: the reported 37/39 outcome should not be treated as fully consistent with the stated decision rule.

Theorem 1 claims detection of geometric attacks with voxel change greater than 2ε, assuming an accurately CT-reconstructed printed device at resolution ε (section 7, p. 2826). Appendix A.1 presents a contradiction argument based on voxel coverage and the triangle inequality (p. 2831). Inference: this is an author-stated bound, not a machine-checked result; this study does not independently establish the proof's validity. The stated theorem excludes sub-2ε changes, inaccurate reconstruction, and material attacks. The authors warn that “XCheck likely cannot prevent all types of lethal toxins using only CT scans.” (section 7, p. 2827).

## techniques for the catalog

- rigid and landmark registration — align reconstructed and design point clouds with scale, rotation, translation, and optional clinical landmarks
- added/missing voxel analysis — compare closest voxel-centroid distances in both directions to detect volumetric deviations
- HU KDE material validation — summarize whole-device CT-number distributions with expectation and density features
- ray-based volumetric analysis — aggregate sub-resolution intersection differences into alpha-shape volumes
- gamma risk aggregation — normalize scale, voxel, volume, and material deviations and combine them into one clinical score
- adjustable evidence visualization — map voxel discrepancies to thresholds, colors, opacity, and point size for human review
