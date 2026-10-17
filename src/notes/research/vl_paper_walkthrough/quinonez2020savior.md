# SAVIOR: Securing Autonomous Vehicles with Robust Physical Invariants
(authored by agents unless marked 🧑)
Tag: `quinonez2020savior`, [paper](https://www.usenix.org/conference/usenixsecurity20/presentation/quinonez)

## result and threat model

SAVIOR is a physics-based attack detection (PBAD) system for autonomous vehicles (AVs). It considers false-signal injection into sensors or actuators, including by GPS spoofing, transduction, or malware, and requires at least one sensor/actuator combination that can reveal the injected anomaly (section 2.1, pp. 896–897). The authors state: “SAVIOR: an architecture for securing autonomous vehicles with robust physical invariants.” (abstract, p. 895). The system learns a nonlinear dynamical model offline, predicts states online with an Extended Kalman Filter (EKF), and accumulates residuals using a cumulative sum (CUSUM) statistic. Section 5.1 (p. 904) calls this combination NLC and the linear-model/time-window baseline LTW. Inference: The paper’s central claim is comparative: nonlinear invariants plus CUSUM detect more attacks, faster, and with fewer false alarms than linear-model/time-window detection.

The threat model is bounded. The attacker can inject false signals into sensors or actuators, but attacks that inject signals to all sensors and actuators are out of scope because detection needs at least one revealing combination (section 2.1, p. 897). Inference: a Verus proof can establish monitor logic and arithmetic properties, but cannot establish that a physical sensor is uncompromised; that condition must be an explicit system assumption.

## technique 1: construct nonlinear physical invariants

What it is. Instead of treating sensor correlations as arbitrary learned features, SAVIOR writes vehicle dynamics as differential equations derived from Newton and Euler laws. For a quadcopter, the state includes position `(x,y,z)`, velocity `(v_x,v_y,v_z)`, Euler angles `(theta,phi,psi)`, and angular velocities. Rotor speeds determine thrust and torques. For a ground vehicle, a bicycle model relates steering angle and acceleration to position, yaw, and velocity.

Inference: When to use it. Use nonlinear invariants when a linear approximation leaves attack directions that are physically impossible but statistically plausible. The authors explain: “With a more accurate model of the system, we can expect better attack detection and fewer false alarms in PBAD systems.” (section 2.2, p. 897).

Inference: How to apply it.
1. Choose the state variables, control inputs, and observable outputs for the vehicle (sections 2.2 and 3.1, pp. 897–899).
2. Derive differential equations from known mechanics. For the quadcopter, use the 12 equations in Equation (2) for translational and rotational dynamics and Equation (3) for rotor thrust/torque (section 3.1, pp. 898–899).
3. Identify vehicle-specific parameters: moments of inertia `I_x,I_y,I_z`, mass `m`, arm length `l`, thrust factor `b`, and drag factor `d` (section 3.1, p. 899).
4. Define the observation function mapping state to sensor outputs and use a numerical integration method for runtime prediction; the paper gives Euler integration as an example (section 3.2, p. 900; Appendix B, p. 912).

Inference: Verus form. Represent a fixed-point or rational approximation of the dynamics as pure `spec fn`s. Prove algebraic properties under explicit parameter and input bounds; do not assume the equations alone imply bounded angles. Use `requires` for parameter domains and `ensures` for one-step equations; use a `proof fn` to compose steps. Floating-point EKF arithmetic and physical calibration need a separately modeled error bound or trusted numeric layer.

Evidence and limits. The paper compares linear and nonlinear predictions and reports that both filter noise but “due to the nonlinear dynamics of the quadcopter, the linear Kalman filter has larger prediction errors.” (section 5.1.1, p. 904). A nonlinear model is only as sound as its parameterization and omitted disturbances; wind causes false alarms when not modeled (section 5.2, pp. 906–907).

## technique 2: nonlinear least-squares parameter learning

What it is. SAVIOR estimates unknown physical parameters from input/output flight data by solving a nonlinear least-squares problem. Given differential equations `F`, parameters `P`, inputs `U_t`, and measured outputs `Y_t`, it minimizes `sum_t (H_t(P,U_t)-Y_t)^2`, where `H_t` is the differential-equation solution at sample `t` (section 3.2, p. 899).

Inference: How to apply it.
1. Instrument the flight controller to record rotor commands and IMU/GPS outputs during multiple missions (section 3.2, p. 900).
2. Select approximate equations and unknown parameter set `P` (section 3.2, p. 899).
3. Fit `P` with nonlinear least squares; the implementation uses Matlab System Identification Toolbox `nlgreyest`, with Levenberg–Marquardt or interior-reflective Newton optimization (section 3.2, p. 900).
4. Freeze the learned parameters for online estimation; learning is performed once per drone (section 3.1–3.2, pp. 899–900).

Inference: Verus form. Treat learned parameters as immutable configuration after an authenticated calibration phase. Verus can prove that a parameter record satisfies ranges and that the runtime model reads the same record. Those checks alone do not establish that the data uniquely determine the parameters or represent all operating conditions.

Evidence. The authors prefer mechanistic fitting to a neural network because the equations constrain possible dynamics and make an alert interpretable (section 3.2, p. 900). Inference: this is a methodological argument, not a formal guarantee; calibration data, optimizer convergence, and model mismatch remain trusted inputs to a verified Rust monitor.

## technique 3: EKF prediction and CUSUM residual detection

What it is. At each sample, EKF predicts the next sensor observation from the nonlinear model and current control input. The residual for sensor `i` is `r_i(k)=Y_tilde_i(k)-Y_hat_i(k)`. CUSUM maintains a history without a fixed window: `S_i(k+1)=(S_i(k)+|r_i(k)|-b_i)^+`, initialized at zero, with `b_i>0` and `z^+=max(0,z)`; an alarm fires when `S_i(t_k)>tau_i` (section 3.3.2, pp. 900–901).

Inference: How to apply it.
1. Fuse gyroscope readings with accelerometer or magnetometer measurements using a linear Kalman filter to estimate angles and gyroscope bias. Convert GPS latitude, longitude, and altitude to a flat-Earth position relative to the initial location (section 3, pp. 897–898; Appendix A, pp. 911–912).
2. Run EKF using the nonlinear transition and observation Jacobians to obtain `Y_hat(k+1)` (section 3.3.1, p. 900).
3. Compute each residual from observed minus predicted readings (Equation (5), section 3.3.2, p. 900).
4. Update each CUSUM statistic with bias `b_i`; choose threshold `tau_i` and alert on threshold crossing (Equation (6), section 3.3.2, p. 901).
5. Evaluate persistent stealth attacks by letting the attacker choose `Y_a*(k)=Y_hat(k) ± (tau+b-S(k))`, which keeps `S(k+1)=tau`; the paper presents this as maximizing the injected signal under the no-alarm constraint (Equations (7)–(8), section 3.4, p. 901).

Inference: Verus form. Model one monitor tick as a pure transition over integer-scaled sensor values. Prove `S>=0`, that no alarm occurs while `S<=tau`, and that a threshold crossing implies a residual sum bound. Use `old` values in postconditions for state updates; avoid treating floating-point comparisons as exact without an explicit rounding model.

Evidence. In the GPS experiment, CUSUM triggers after 0.2 seconds (Figure 10, p. 903); in the car’s 0.5 m bias attack, it detects after 0.1 seconds (section 5, p. 903; Figure 13, p. 904). Under stealthy attacks, NLC limits deviation while the linear/time-window baseline can crash the drone (section 5.1, pp. 905–906). Inference: these are experiment-specific latencies, not universal bounds.

## implementation and measurements

SAVIOR is implemented in PX4 on an Intel Aero drone and in ROS on a Traxxas Ford Fiesta ST Rally Car (section 4, pp. 901–903). PX4 additions are six files and 920 lines of code; firmware grows from 862.3 KB to 874.7 KB, a 1.43% increase (section 5.3.1, pp. 907–908). The `reference_monitor` consumes 5.3572% CPU armed, 5.4332% hovering, and 5.5093% under radio control; the paper reports the average as 5.4332% (Table 1, p. 908). The ROS implementation adds 231 lines across three files and occupies 37.3 KB (section 5.3.2, p. 908). The experiments also use high-fidelity simulation for Dryden wind disturbances; wind not represented in the model raises false alarms. The paper models wind measurements as additional inputs and illustrates reduced false alarms in simulation; significant wind was not tested on real hardware (section 5.2, pp. 906–907).

## what remains trusted and product relevance

SAVIOR checks consistency of a chosen physics model against observed signals. Responses to detected attacks remain future work: “In future work we plan to develop SAVIOR into a reference monitor that not only detects attacks, but can take action once an attack is detected, in order to protect the safety of the AV and the people around it.” (section 6, p. 909).

Inference: a proof of monitor arithmetic and state updates would still need explicit assumptions about model adequacy, calibration, sensor availability, actuator behavior, and the controller’s response to alerts. For agent-written verified Rust, useful targets include contracts connecting the model, residual bounds, and controller responses. This paper does not establish that verifying those contracts would make the physical vehicle safe.

## techniques for the catalog

- nonlinear physical invariants — derive vehicle state transitions from mechanics instead of linear correlations alone
- nonlinear least-squares calibration — fit vehicle-specific parameters once from control and sensor traces
- EKF plus CUSUM — predict observations with Jacobians, accumulate residuals without fixed windows, and alert at a threshold
- stealth-attack evaluation — choose the largest signal perturbation that stays at the threshold and measure the resulting physical deviation
