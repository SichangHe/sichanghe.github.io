# Advanced Analysis of Algorithms

6hw + 3qz + 2 theoretical thinking project

RTH505

quiz 1 up to greedy

## theory overview

NP&P → **decision problem** on `&[u1]` (language)\
⇒ search problem (harder, but may reduce to decision problem)\
⇒ optimization

desicion problem → board game

P space: $∃x_1, ∀x_2, ∃x_3, \cdots\text{ s.t.
}f(\vec x)$ where $|\vec x|$ is polynomial

- P time $\in$ P space (equal?)
- PPAD

\#P: account #solution to NP problem

- each NP problem has \#P problem
- \#P-complete $\subseteq$ P space

linear programming: proved P

learning problem

- binary classification: $h:X\mapsto\{0,1\}\in H$
- learnable: train on unknown distribution $D$,
    prediction correction increase

## binary search to graph search

binary search $[1:n]$ (go to middle)\
⇒ quick selection (broader notion of middle; randomize):

- input: $(a_1,\cdots,a_n),k$
- want: $k$-th smallest
- algorithm:
    1. pick $a_{t_1}$ with random $t_1$
    1. split by $a_{t_1}$ to $l_L$, $l_R$, throw away impossible list and
        shrink $k$

power of randomization: $O(n^2)$ but $\Theta(n)$ wrt randomness:\
$\frac{1}{2}$ of the time we pick element ranked $\frac{n}{4}\sim\frac{3n}{4}$,
can throw away $\frac{n}{4}$ of the list

$$
⇒ \mathbb ET(n) ≤ n+\frac{1}{2}\mathbb ET\left(\frac{3n}{4}\right)+
\frac{1}{2}\mathbb ET(n)\\
⇒ \mathbb ET(n) ≤ 2n + \mathbb ET\left(\frac{3n}{4}\right)\\
⇒ \mathbb ET(n)\sim O(n)
$$

⇒ distance graph $G=(V,E),E\subseteq V × V$

- $\ell(e),e\in E$
- binary search is graph w/ $\ell(e)\equiv 1$,
    each number node has edge w/ next number
    - local info, e.g., $m-1$ is closer
- generalized undirected graph "binary search" for target $t\in V$ from
    $q_i\in V$
    - $N_P(v,t)=\{z\in P|(v,z)\text{ on shortest path to }t\}$
        - $z$ on shortest path $d_G(u,v)$ if: $d_G(z,v)+\ell(u,z)=d_G(u,v)$
    - condition: will give set of vertex on shortest path
    - iteration: $q=t$ or give $q'\in N_G(v,t)$ closer to $t$
    - theorem: ∃ algorithm to find $t$ in $O(\log n)$ question
    - want: shrink possible answer set $P_i≤V$, set of node on
        shortest path from $q_i$ to $t$
    - $P_0=V$
    - ⇒ medium:
        lowest potential function
        $\displaystyle\argmin_u\Phi_{P_0}(u)=∑_{v\in P_0}d_G(u,v)$
    - update w/ hint $v_t$: $P_{t+1}=P_t\cap N_{P_t}(q_t,v_t)$
- claim: $|P_{t+1}|≤\frac{1}{2}|P_t|$
- proof:

    $$
    \Phi_{P_t}(u)≤
    \Phi_{P_t}(q_t)-(|P_{t+1}|-|P_t/P_{t+1}|)-\ell(q_t,v_t),\\
    \Phi_{P_t}(u)≥\Phi_{P_t}(q_t)\\
    ⇒ -|P_{t+1}|+|P_t/P_{t+1}|≥\ell(q_t,v_t)≥0\\
    ⇒ |P_{t+1}|≤\frac{1}{2}|P_t|
    $$

## interactive learning

*A General Framework for Robust Interactive Learning*, Ehsan Emamjomeh-Zadeh,
David Kempe

given hypercube $X$, search space $H$, find $h\in H$ s.t. $h≤X$

- [VC dimention](stats303.html#vapnik-chervonenkis-dimension-vc-dimension)
    - $n$ hyperplane in $d$-dimensional space can split $n^d$ cell

## greedy algorithm

- can deal with NP-hard problem
- optimality:
    - argument of staying ahead
    - exchange argument
- proving optimality
    - optimum must exist for finite problem
    - compare to imaginary optimum
    - focus on simple local consistency that eliminate bad possibility

### Huffman Codes

- prefix code: no code is prefix of another, $∑ → \{0,1\}^*$
- ⇒ binary tree w/ $n$ leaf, each leaf's parents not usable
    - optimum is trivial when tree is given
    - tree w/ same number of leaf of each length are equivalent
    - has to be proper: each node is either leaf or parent of 2
    - substructure optimality: bottom 2 children must map to
        2 least frequency
- induction: merge 2 least frequency, treat it as one letter to
    find mapping for the rest

### minimum spanning tree (MST)

- cut: split graph $V$ to $S$ and $\bar S$

    $$
    \text{cut}(S)=\{(u,v)\in E|u\in S,v\in\bar S\}
    $$

- affinity: inverse distance, closeness

#### Kruskal's algorithm

traditional Kruskal

1. sort $E$ ascending
1. from no node, add edge from small, w/o cycle

reversed Kruskal

1. sort $E$ ascending
1. from $G$, remove edge from big, w/o disconnecting

#### Prim's algorithm

1. choose arbitrary node "home town" $v_0$. $S_0:=\{v_0\}$
1. repeat: find closest node $v_{i+1}$ w/ edge form $S_i$.
    $S_{i+1}:=S_i\cup\{v_{i+1}\}$

- why: cut property: shortest cut edge is in MST
    - reverse cut property: longest edge in cycle is not in MST

### clustering

given $G=(V,E,d)$ w/ metric $d$, $k$, want $(S_1,\cdots,S_k)$ s.t.

1. $S_i\subseteq V$
1. $∀i≠j,S_i\cap S_j = ∅$
1. $\bigcup_i S_i=V$
1. maximize shortest inter-cluster edge

- idea: for tree $G$, just need to cut $k-1$ longest edge
- ⇒ algorithm: for graph $G$, cut $k-1$ longest edge in MST for
    optimal clustering
- proof: denote greedy solution cluster $V_1,\cdots,V_k$,
    optimum cluster $C_1,\cdots,C_k$
    1. if $\{V\}≠\{C\}$, ∃ node $v_1≠v_2\in V_i$ s.t.
        $v_1\in C_p,v_2\in C_q,C_i\neq C_j$
    1. $⇒ ∃e$ in MST on path from $v_1$ to $v_2$,
        within $V_i$ s.t. $e$ cross $C_p$ boundary
    1. by reverse Kruskal, in MST, longest edge that
        do not disconnect graph are gone\
        $⇒$ by greedy algorithm, $\ell(e)≤d_{k-1}$ the $k-1$th longest edge in
        MST
    1. $⇒$ optimum solution has shortest inter-cluster edge $≤d_{k-1}$,
        same or smaller than greedy solution ⇒ contradiction

## approximation algorithm

### set cover

- given: input ground set $V=\{1,\cdots,n\}$,
    $S_1,\cdots,S_i\subset V$ w/ $w_i,i\in I=[1,\cdots,m]$

- want: $T\subset I$ s.t. $∪_{i\in T}S_i=V$ and $|T|$ minimized

    $$
    \argmin_{T\subset I\\∪_{i\in T}S_i=V}∑_{i\in T}w_i
    $$

- idea: minimize average cost $\frac{w_i}{|S_i|}$
- algorithm:
    1. $U:=V$
    1. while $U≠∅$, pick $\displaystyle\argmin_{i}\frac{w_i}{|S_i\cap U|}$,
        set $U=U/S_i$
- not optimal when many large $S_i$ also cover small $S_j$
- claim: greedy is within $\log n$ of optimum, where $n=\max_j|S_j|$
    - doing consistently better than $\log n$ of optimum is NP-hard
    - greedy cost

                                                                                                                      $$
                                                                                                                      c_G(i_t)=\frac{w_{i_t}}{|S_{i_t}\cap U_t|} ≤ H(|S_{j_t}|)w_{j_t}
                                                                                                                      $$

        - [harmonic
            series](../mathematics/sequence_series.html#harmonic-series)
            $H(k)=∑_{i=1}^k\frac{1}{i}$
        - when $h$th (starting from 0) element $V_{\pi_h}$ in
            $S_j$ is covered,
            $\displaystyle c_G(\pi_n)≤\frac{w_j}{|S_j|-h}$ because at most
            $h$ element is covered in $S_j$

### set function

$f:\{S|S\subseteq V\} → \R$

- salary for group in society
- hypergraph: indicator set function determine if each subset is hyperedge

property:

1. grounded: $f(∅)=0$
1. monotone: $∀ S\subseteq T,f(S) ≤ f(T)$
1. submodular

#### submodular function

$∀ S\subseteq T,∀ v\notin T$

$$
\nabla f_S(v) ≥ \nabla f_T(v)
$$

- diminishing return: less happier when having more and more chocolate
- discrete derivative: $\nabla f_S(v)=f(S\cup \{v\})-f(S)$
    - how much value can $v$ add to $S$
- complementarity: $1 + 1 > 2$
- $f,g$ submodular $⇒ ∀a,b≥0, af+bg$ submodular
- "or" is fundamentally submodular

problem

- input: submodular $f:\{S|S\subseteq V\} → \R^*$, $k$
- output: $S\subset V$, s.t. $|S|=k$, $\max f(S)$
- oracle model: can get $f(T)$

- example: max cover: for mapping $f:V → B$ choose $k$ element from $V$ to
    maximize $|f(S)|$
- greedy algorithm $S'$: at time $t$, add $u_t$ that maximize
    $\nabla f_{u_t}(S_{t-1}')$

theorem: $∀f$ monotone & submodular, $∀k$, $f(S')≥(1-\frac{1}{e})f(S^*)$

proof:

$$
S^*=:\{v_1,\cdots,v_k\};\\
f(S^*)≤f(S^*\cup S_t')=f(S_t')+[f(S^*\cup S_t')-f(S_t')];\\
f(S^*\cup S_t')-f(S_t')=
∑_{i=1}^k[f(\{v_1,\cdots,v_i\}\cup S_t')-f(\{v_1,\cdots,v_{i-1}\}\cup S_t')]\\=
∑_{i=1}^k\nabla f_{v_i}(\{v_1,\cdots,v_{i-1}\}\cup S_t')≤
∑_{i=1}^k\nabla f_{v_i}(S_t')=
k\nabla f_{v_i}(S_t')\\≤
k\nabla f_{u_{t+1}}(S_t')=
k[f(S_{t+1}')-f(S_t)]\\
⇒ \delta_t:=f(S^*)-f(S_t')≤k[f(S_{t+1}')-f(S_t)]\\=
k[(f(S_{t+1}')-f(S^*))+(f(S^*)-f(S_t))]\\=
k[-\delta_{t+1}+\delta_t]\\
⇒ \delta_{t+1}≤\frac{k-1}{k}\delta_t≤\cdots≤
\left(1-\frac{1}{k}\right)^{t+1}\delta_0\\=
\left(1-\frac{1}{k}\right)^{t+1}f(S^*)≤
e^{-\frac{t+1}{k}}f(S^*)\\
⇒ f(S'_k)=f(S^*)-\delta_k≥\left(1-e^{-\frac{k}{k}}\right)f(S^*)
$$

alternative definition for submodular function (equivalent):

$$
∀A,B\subseteq V,f(A)+f(B) ≥ f(A\cap B)+f(A\cup B)
$$

### reachability

$\text{Reach}(S):=\{v|\text{can reach }v\text{ from }S\}$

$f(S)=|\text{Reach}(S)|$

- $f$ submodular:

    $$
    \nabla f_S(v)=|\{x|\text{can reach }x\text{ from }v\text{ but not }S\}|
    $$

### network influence

input $G=(V,E),p_e;t=1,\cdots,T$

- dynamic & complex compared to traditional static graph
- network influence maximization: often submodular

#### independent cascade (IC)

each node has probability $p$ to influence

- stochastic network influence; e.g., pandemic
- $S_t=S_{t-1}\cup N(S_{t-1})$
- influence spread $\sigma(S)=∑_{W\in 2^V}\Pr_W[S → W]|W|$
    - generally \#P-complete
- roughly stochastic "or" process; distribution of reachability model

#### threshold model

each node $v$ has threshold $\theta_v$ to be influenced by neighbor

- deterministic/ stochastic by $\theta_v$, e.g., idea spreading

## iterative algorithm

### polynomial local search (PLS)

- e.g., simplex algorithm, bubble sort
- polynomial number of viable option at each step
- always improve because know potential function
- will stop because define direct acyclic graph (DAG)

#### Lloyd's algorithm (K-means clustering)

input: $P=\{p_1,\cdots,p_n\}\subseteq\R^d$\
want: cluster into $P_1,\cdots,P_k$

- representation (center) $c_i$ of $P_i$
    - mean of cluster minimize variance of distance
- algorithm:
    1. randomly initialize $P_i^0$
    1. calculate $c_i^t$
    1. regroup $P_i^t$ by $\min(p_j,c_i^{t-1})$
- Voronoi diagram: zip code
- exponential time to converge, but polynomial time to
    get $\frac{1}{\varepsilon}$ close

## divide and conquer in geometric space

### 1-dimensional space

- nice because: can sort, minimal neighborhood, point = hyperplane
- mean: not statistically robust; median: robust

#### approximate median

$(\frac{1}{2}-\varepsilon)$-median

algorithm, use 2-way tree of height $h$:

1. uniformly sample $H=∑_{i=0}^h3^i$ point
1. find median of every 3 point
1. find median of every 3 median on the last level, recursively

proof:

- define $\Pr_h(x)$ probability that median algorithm w/ height
    $h$ yield result $<x$
- $\Pr_0(x)=x$ because only 1 point
- at least 2 point among 3 need to be $<x$ to get $<x$ median:

$$
    \Pr_{h+1}(x)={3\choose 2}\Pr_h(x)^2(1-\Pr_h(x))+{3\choose 2}\Pr_h(x)^2\\
    ⇒ \Pr_{h+1}(x)=3\Pr_h(x)^2-2\Pr_h(x)^3
$$

- by induction,
    $\Pr_h(\frac{1}{2}-\varepsilon)≤\frac{1}{2}-(\frac{11}{8})^h\varepsilon$ if
    $\varepsilon≤\frac{1}{4}$

### median in 2-dimensional space

- $\delta$-centerpoint: for any projection, at approximate median
- theorem: $∀P\subseteq\R^d$, $∃\frac{1}{d+1}$-centerpoint
    - intuition: need $d+1$ point to trap 1 point
- VC dimension theory: need $\frac{d}{\varepsilon^2}$ sample to estimate well
- $\varepsilon$-good sample $S\subset P$: $∀$ half space $H$,
    $|\frac{|P\cap H^+|}{|P|}-\frac{|S\cap H^+|}{|S|}|≤\varepsilon$

### nearest neighbor

$P=\{p_1,\cdots,p_n\}\subseteq\R^d$

- ball: smallest ball $B(p_i)$ that contain $k$ neighbor define "nearest"
    - ball shape depend on metric (no necessary round)
    - locality: a point is not covered by many ball
- k-NN graph (k-NNG): edge from $p_i$ and $p_j$ if $p_j$ is in $B(p_i)$
- point location, e.g., cell phone connect to tower
- nearest-pair problem: find nearest pair of point among set of point
    - $n\log n$ algorithm for 2D:
        1. divide by median on one axis to $P_L,P_R$, find nearest pair in
            each half
        1. take minimum distance $\delta$ for $\min(P_L,P_R)$
        1. find nearest pair within $\delta$ around the boundary ($O(n)$)
            \- only need to check a series of $\delta$-hypercube
        1. take the minimum, recurs
    - Bentley: $O(n(\log n)^{d-1})$ in d-dimension

construct k-NNG: divide and conquer ($O(n(\log n)^2)$)

1. split $P$ into $P_0,P_1$ by median from $x_1$ (could also split arbitrary)
1. build k-NNG for each half ($O(n\log n)$)
    - point location problem: ball too big iff point from other half in ball
    - need binary search tree for $O(\log n)$ query
    - max overlapping ball $≤ \tau_d k$
1. shrink all ball in $P_0$ w/ point in $P_1$
1. recurs

### disk packing

non-overlapping 2D ball set

- problem: given point, find ball containing it
- planar graph: node for each ball, edge for intersection
- Koebe embedding: reverse is true
- e.g., prof Teng saw 100 lake in Minnesota (which has 10000) when
    driving across

condition: if can dig $n$ round lake on the spherical, then charge \$1 for
each lake on tour though great circle

- maximum expected charge: $2\sqrt n$
- $n^{1-\frac{1}{d}}$ in $d$-dimension

proof:

1. assume the globe has radius 1
1. each lake $i$ define a belt of width $2r_i$ perpendicular to
    great circle passing through it ⇒ expectation of charge:

    $$
    ∑_i\frac{2\pi\cdot 2r_i}{4\pi 1^2}=∑_ir_i
    $$

1. lake area cannot exceed globe area:

    $$
    ∑_i\pi r_i^2≤4\pi 1^2 ⇒ ∑_ir_i^2≤4
    $$

1. clearly want equal $r_i=r_0$ by convexity

    $$
    ⇒ ∑_ir_i ≤ nr_0 = \sqrt n\sqrt{nr_0^2} ≤ \sqrt n\sqrt 4 = 2\sqrt n
    $$

#### kissing number $\tau_d$

max number of non-overlapping ball to touch one ball

- $\tau_1=2$ in 1D, $\tau_2=6$ in 2D, $\tau_3=12$ in 3D
- $\tau_d ≤ \frac{(3r)^d}{r^d} = 3^d$

#### 3-dimensional binary search via disk

- a great circle divide disk into $B^N,B^S,B^{ON}$
- can have conformal map s.t. median of all disk center is center of globe

    $$
    ⇒ |B^N|,|B^S| ≤ \left(1-\frac{1}{d+2}\right)n = \frac{3}{4}n\\
    |B^{ON}| ≤ 2k^{\frac{1}{d}}n^{1-\frac{1}{d}} = 2\sqrt n
    $$

    - dilate point by projecting globe to plane via tangent, scaling up on
        plane, then projecting back
- can build binary search tree by successive random split through median

### $d$-dimensional convex geometry

#### Helly's theorem (projection lemma)

in $d$-dimension, with ∞ convex point set, if
$∀d+1$ convex set $C_{\pi_1},\cdots,C_{\pi_{d+1}}$, all them intersect, then
all ∞ of these set intersect

- in 1D, 3 interval intersect pairwise ⇒ ∃1 point in all 3 interval
- $⇒ \frac{1}{d+1}$-centerpoint [exist](#median-2-dimensional-space)

#### Radon theorem: median in convex geometry definition

in $d$-dimension\
$∀d+2$ point $X=\{x_1,\cdots,x_{d+2}\}\subseteq\R^d$,\
can be divided into 2 set $X_1,X_2$ s.t convex hull of $X_1$ and
$X_2$ intersect

- i.e. $∃X_1,X_2$ s.t.
    - $X_1\cap X_2=∅$
    - $X_1\cup X_2=X$
    - $\text{convex hull}(X_1)\cap\text{convex hull}(X_2)≠∅$

proof:

$$
\begin{cases}
    ∑_{i=1}^{d+2}a_ix_i=0\\
    ∑_{i=1}^{d+2}a_i=0
\end{cases}
$$

has $d+1$ linear equation ⇒ has non-trivial solution, i.e., $a_i≠0$

$$
W:=∑_{i=1,a_i>0}^{i=d+2}a_i=∑_{i=1,a_i<0}^{i=d+2}(-a_i) ⇒
\left|\frac{a_i}{W}\right|\in(0,1]\ ∀a_i\\
⇒ p=∑_{i=1,a_i>0}^{i=d+2}\frac{a_i}{W}x_i=∑_{i=1,a_i<0}^{i=d+2}\frac{-a_i}{W}x_i
$$

is both in convex hull of $\{x_i|a_i>0\}$ and $\{x_i|a_i<0\}$

- $⇒ ∃$ intersection point as median
- can get $\frac{1}{d^2}$-median WHP, $O(d^3)$ time via $(d+2)$-tree

### Lipton-Tarjan separator theorem for planar graph

#### Alan George nested dissection

- numerical system beat Gaussian elimination
    - in Gaussian elimination, removing 1 node connect all its neighbor
- remove $O(\sqrt n)$ separator node to separate graph into 2 (or 3)
    - eliminate think separator last, so
        eliminating each node incur small cost

## fast Fourier transform (FFT)

### integer multiplication

- classic algorithm: $O(n^2)$—not scalable
    - $2n$ output size
- can divide each number into high and low half

    $$
    x\cdot y = x_H\cdot y_H\cdot 2^n +
    (x_H\cdot y_L+x_L\cdot y_H)\cdot 2^{\frac{n}{2}}+x_L\cdot y_L
    $$

    - $T(n)=4T(n/2)+O(n) = O(n^2)$
- can save one smaller multiplication by:

    $$
    x_H\cdot y_L+x_L\cdot y_H=(x_H+x_L)(y_H+y_L)-x_H\cdot y_H-x_L\cdot y_L
    $$

    - $T(n)=3T(n/2)+O(n) = O(n^{\log_23}) = O(n^{1.58})$
- FFT make multiplication $O(n\log n)$, nearly as easy as addition

### polynomial multiplication

- number are special case of polynomial
- better than number because continuous
- convolution:
    $f(z)g(z)=(∑_{i=0}^{n}a_iz^i)(∑_{i=0}^{n}b_iz^i)$ is sequence of
    diagonal sum in $AB^T$
- polynomial $f(z)=∑_{i=0}^{n}a_iz^i$ can be recovered by any
    $n+1$ distinct data point
    - realizable data
    - recover from $(x_1,\ell_1),\cdots,(x_L,\ell_L)$ by solving

        $$
        \begin{bmatrix}
            1 & x_1 & x_1^2 & \cdots & x_1^n\\
            1 & x_2 & x_2^2 & \cdots & x_2^n\\
            \vdots & \vdots & \vdots & \ddots & \vdots\\
            1 & x_L & x_L^2 & \cdots & x_L^n
        \end{bmatrix}\begin{bmatrix}
            a_0\\ a_1\\ \vdots\\ a_n
        \end{bmatrix} = \begin{bmatrix}
            \ell_1\\ \ell_2\\ \vdots\\ \ell_L
        \end{bmatrix}
        $$

    - easy to multiple $(x_i,f(x_i))$ and $(x_i,g(x_i))$: $O(1)$
    - need $2n+1$ data point to recover $f\cdot g$
    - active learning: can pick nice data point as wished
- unit root in complex space: $x^n=1$
    - divide unit circle evenly ⇒ all in form $e^{i\theta}$
    - ⇒ sample $z_j=w_n^j:=e^{i\frac{j\pi}{n}}$ for $j=0,\cdots,2n-1$
    - $∀w≠1,w^n=1,$

        $$
        ∑_{i=0}^{n-1}w^i=\frac{1-w^n}{1-w}=0
        $$

    - can save computation by $w_n^{2j}=(w_n^j)^{2}$, etc.
        - divide recursively:

            $$
            f(x)=∑_{j=0}^{n-1}a_jx^j=
            ∑_{j=0}^{\frac{n}{2}}a_{2j}(x^2)^j+
            x∑_{j=0}^{\frac{n}{2}}a_{2j+1}(x^2)^j
            $$

        - ⇒ calculate all in $O(n\log n)$

## linear programming (LP)

- maximization standard form: maximize, $m$≤ constraint, non-negative entry
    - e.g., use limited material to make product for profit
    - minimization standard form: opposite
- polyhedron $P$
    - polytope (bounded)
    - vertex: ∃ vector, stay in if added, not in if subtracted
    - face
- optimal solution: convex (a face), tight (constraint reach equality)
    - feasible solution
    - DNE when unbounded/ infeasible
    - fundamental theorem of linear programming: optimal solution, if exist,
        contain vertex
        - ⇒ if optimal solution exist, exist optimal solution w/ at most
            $m$ non-zero variable
    - complementary slackness: $x_i>0⇒y_i=0$, only a few constraint active
- dual LP
    - variable become constraint, each row of
        constraint become 1 dual variable $y_i$
    - persuade not to make product by offering to
        buy raw material at higher price
    - essentially finding upper bound for value
    - finding the force on a ball in force field in a cage when
        it is stable against corner, then try to find path to
        origin w/ least work
    - involution
    - lenient primal form ⇒ tight dual form, vice versa
- weak duality theorem: primal value $a^Tx$ ≤ $b^Ty$ dual value
    - looking for optimum from opposite direction
    - one is unbounded $\Leftrightarrow$ the other is infeasible
    - optimal if $a^Tx=b^Ty$
- strong duality theorem: if either feasible and bounded, then
    the other is feasible and bounded and optimal value equal
    - hold for LP, not for general convex optimization
- method
    - simplex method (George Dantzig): polynomial in practice
    - duality (John von Neumann)
    - engineering method (polynomial): ellipsoid method,
        interior point method

## network flow

- designed to attack USSR supply chain
- Ford-Fulkerson max flow: send most from source to sink
    - simple greedy not optimal: find path w/ max min flow recursively
    - optimal: include reverse flow from chosen flow in residual graph
        - proof by duality
- min cut: sum of weight of edge that separate source and sink
    - max flow ≤ min cut
    - for each forward cut, ∃ flow that saturate it
    - each backward cut is empty

## randomization

- Andy Yao's theorem: random data + deterministic algorithm (algorithm min)
    is the same as deterministic data + random algorithm (data min)
    - min of max = max of min
    - convert worst case analysis to average case analysis

### Markov chain

- Markovian matrix $M$: [stochastic matrix](stats303.html#markov-chain)
    - doubly-stochastic matrix: both row & column sum to one
    - spectral radius: largest dilation by vector

#### PageRank

- network centrality

$O(|V|+|E|)$ approximation:

$$
P=\alpha\frac{\vec 1}{n}+(1-\alpha)M^TP\\
⇒ (I-\alpha M^T)P=\alpha\frac{\vec 1}{n}\\
⇒ P=(I-(1-\alpha) M^T)^{-1}\alpha\frac{\vec 1}{n}=
\left(∑_{t=0}^{\infty}\alpha((1-\alpha) M^T)^t\right)\frac{\vec 1}{n}\\
∑_{i=0}^{\infty}\alpha(1-\alpha)^t=1
$$

$⇒ (M^T)^t\frac{\vec 1}{n}$: start random and walk $t$ round

- significant PageRank problem: want all page w/ PageRank $≥\epsilon$
    - approximately find page w/ PageRank $≥\frac{\epsilon}{2}$
