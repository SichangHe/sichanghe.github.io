<!-- toc -->
# Real Analysis

# set

## complement of set $S$

$S ⊆ X$

$$
S^c:=\{x\in X|x\notin S\}
$$

## cardinality

$|S|=|T|\iff ∃\ f:S → T$ one-to-one correspondence

### finite set

empty or has cardinality of $\{1,2,\cdots,n\}$ for some $n$

### infinite set

#### countable set

has cardinality of $\N$

- $T$ countable, $S$ infinite and $S ⊆ T ⇒ S$ countable
- $S,T$ countable $⇒ S\times T$ countable

# real number

- real number are complete\
    every Cauchy sequence in $\R$ converge to $\R$
- real number satisfy the Archimedian property

## Archimedian property

$a>0,b>0 ⇒ ∃\ n\in\Z,na>b$

# function

function $f$ from $S$ to $T$ is subset $F ⊆ S\times T$

$t$ is the value of $f$ at $s$:

$$
s\xrightarrow{f}t
$$

or

$$
t=f(s)
$$

- $Dom(f)$ domain
- $Ran(f)$ range
- onto: $Ran(f)=T$
- one-to-one: $∀\ t\in Ran(f),∃!\ s\in S,f(s)=t$
- one-to-one correspondence: onto and one-to-one

## inverse function

for one-to-one function $f$, inverse function $f^{-1}$ of $f\iff$

$$
f(f^{-1}(t))=t\qquad ∀\ t\in Dom(f)
\\[12pt]
f^{-1}(f(s))=s\qquad ∀\ s\in S
$$

# sequence

$\{a_n\}_{n=1}^∞$ or $\{a_n\}$

$$
a_n:\N → \R
$$

see also [Sequence and Series](sequence_series.md)

## sequence convergence

$$
\lim_{n → ∞}a_n=a
\quad\text{or}\quad
a_n → a
$$

or $\{a_n\}$ converge to limit $a ⇔$

$∀\ \varepsilon>0,∃$ integer $N(\varepsilon)$, so that $∀\ n≥N$,

$$
|a_n-a|≤\varepsilon
$$

## sequence diverge to infinity

$∀\ M,∃\ N$, so that $∀\ n≥N$,

$$
a_n≥M
$$

## bounded sequence

$a_n$ is bounded iff

$∃\ M$ so that $∀\ n$

$$
|a_n|≤M
$$

- bounded monotone sequence converge

## limit theorem

- bounded sequence
- squeeze theorem
- limit are linear
- multiplication and division can be extracted

## Cauchy sequence

$∀\ \varepsilon>0,∃\ N$ so that, if $n≥N,m≥N$, then

$$
|a_n-a_m|≤\varepsilon
$$

- convergent sequence are Cauchy sequence
- axiom of completeness\
    Cauchy sequence in $\R$ converge to finite number in $\R$

## subsequence

$k\mapsto n(k):\N → \N$

$∀\ k\in\N,\quad n(k+1)>n(k)$

subsequence of $\{a_n\}_{n=1}^∞$,

$$
\{a_{n(k)}\}
_{k=1}^∞
\text{ or }\{a
_{n_k}\}
$$

## limit point

limit point $d$ of $\{a_n\} ⇔$

$$
∀\ \varepsilon>0,N\in\Z,
∃\ n≥N,\text{ s.t. }
|a_n-d|≤\varepsilon
$$

- $d$ is limit point $⇔ ∃$ subsequence $\{a_{n_k}\} → d$

## Bolzano-Weierstrass Theorem

$\{a_n\}$ bounded
$⇒ ∃\ \{a_{n_k}\},d$ s.t. $\{a_{n_k}\}→ d$

- proof: successively shrink interval by half
    and keep the half with infinite element
- $a_n\in[b,c] ⇒ ∃\ \{a_{n_k}\},d\in[b,c]$ s.t. $a_{n_k} → d$

# continuity

$f$ is continuous at $c\in Dom(f) ⇔$

$$
∀\text{ sequence }\{x_n\},x_n\in Dom(f),x_n → c,\\[12pt]
\lim_{n → ∞}f(x_n)=f(c)
$$

- $f$ is continuous at $c\in Dom(f) ⇔$

    $$
    ∀\ \varepsilon>0,∃\ \delta>0,\text{ s.t. }
    ∀\ x\in Dom(f),\\[12pt]
    |x-c|≤\delta ⇒ |f(x)-f(c)|≤\varepsilon
    $$

## continuous function on closed interval

$f$ is continuous on $S ⇒$
$f$ is bounded:

$$
∃\ B\in\R,\text{ s.t. }∀\ x\in S,\\[12pt]
|f(x)|≤B
$$

$f$ continuous on $[a,b] ⇒$

$$
∃\ c,d\in[a,b]\text{ s.t.}\\[12pt]
f(c)=\sup_{[a,b]}f,\quad
f(d)=\inf_{[a,b]}f
$$

and

$$
Ran(f)=[\inf_{[a,b]}f,\sup_{[a,b]}f]
$$

and $f$ is uniformly continuous on $[a,b]$

- supremum

    $$
    \sup_Sf:=\sup\{f(x)|x\in S\}
    $$

- infimum

    $$
    \inf_Sf:=\inf\{f(x)|x\in S\}
    $$

### intermediate value theorem

$f$ continuous on $[a,b]$, $f(a)≠f(b)$,
$y\in\R$ is between $f(a),f(b) ⇒$

$$
∃\ c\in(a,b)\text{ s.t. }
f(c)=y
$$

## uniform continuity

$f$ is uniformly continuous $⇔$

$$
∀\ \varepsilon>0,∃\ \delta>0\text{ s.t. }
∀\ x,c\in Dom(f)\\[12pt]
|x-c|≤\delta ⇒ |f(x)-f(c)|≤\varepsilon
$$

## Lipschitz continuity

$f$ is Lipschitz continuous on $S ⇔$

$$
∃\ M\text{ s.t. }∀\ x,c\in S,x≠c,\quad
\frac{f(x)-f(c)}{x-c}≤M
$$

# integral

## partition

partition $P$ of $[a,b]$ is any finite collection of point

$$
x_0<x_1<\cdots<x_N
$$

where

$$
x_0=a,\quad x_N=b
$$

## upper sum/ lower sum

for subinterval $[x_{i-1},x_i]$ of partition $P$

$$
M_i:=\sup_x\{f(x)|x_{i-1}≤x≤x_i\}\\[12pt]
m_i:=\inf_x\{f(x)|x_{i-1}≤x≤x_i\}
$$

lower sum

$$
L_P(f):=\sum_{i=1}^Nm_i(x_i-x_{i-1})
$$

upper sum

$$
U_P(f):=\sum_{i=1}^NM_i(x_i-x_{i-1})
$$

- $L_P(f)≤U_P(f)$
- for any partition $Q$

    $$
    L_P(f)≤U_Q(f)
    $$

- for partition $Q$ that contain all point of $P$ and additional point

    $$
    L_P(f)≤L_Q(f),\quad
    U_Q(f)≤U_P(f)
    $$

## Riemann integrability

$f$ on $[a,b]$ is Riemann integrable $⇔$

$$
\sup_P\{L_P(f)\}=\inf_P\{U_P(f)\}
$$

- $∀\ \varepsilon>0,∃$ partition $P$ s.t.

    $$
    U_P(f)-L_P(f)≤\varepsilon
    $$

    $⇒ f$ is Riemann integrable

- $f$ continuous on $[a,b] ⇒ f$ Riemann integrable

## Riemann integral

$f$ Riemann integrable on $[a,b]$

Riemann integral

$$
\int_a^bf(x)\ dx:=\inf\{U_P(f)\}
$$

- $∀\ x\in[a,b],\ f(x)≤g(x) ⇒$

    $$
    \int_a^bf(x)\ dx≤\int_a^bg(x)\ dx
    $$

- $f\in C[a,b] ⇒$

    $$
    \left|\int_a^bf(x)\ dx\right|≤\int_a^b|f(x)|\ dx\\[12pt]
    \left|\int_a^bf(x)\ dx\right|≤(b-a)\sup_{[a,b]}|f(x)|
    $$

## Riemann sum

$$
\sum_{i=1}^Nf(x_i^*)(x_i-x_{i-1})
$$

where $x_i^*\in[x_{i-1},x_i]$

- $f$ continuous on $[a,b]$,
    $\{P_k\}$ is sequence of partition s.t.
    maximum length of subinterval $→ 0$ as $k → ∞$,
    $S_k$ is any Riemann sum corresponding to $P_k ⇒$

    $$
    S_k → \int_a^bf(x)\ dx
    \quad\text{as}\quad
    k → ∞
    $$

# differentiation

## continuously differentiable

$f$ differentiable on $[a,b]$
and $f'$ continuous on $[a,b]$,
or $f\in C^{(1)}[a,b]$

- $f$ continuous on $\R$ is denoted as $f\in C(\R)$

## Rolle's theorem

$f\in C[a,b]$ differentiable on $(a,b)$,
$f(a)=0=f(b) ⇒$

$$
∃\ c\in(a,b)
,\text{ s.t. }
f'(c)=0
$$

## mean value theorem

$f\in C[a,b]$ differentiable on $(a,b)$, $⇒$

$$
∃\ c\in(a,b)
,\text{ s.t. }
f'(c)=\frac{f(b)-f(a)}{b-a}
$$

## Taylor's theorem

$f\in C^{(n)}[a,b]$,
$f^{(n+1)}$ exist on $(a,b)$,
$x_0\in[a,b] ⇒$

$$
∀\ x\in[a,b],x≠x_0,∃\ \xi\text{ between }x,x_0
\text{ s.t.}\\[12pt]
f(x)=T^{(n)}(x,x_0)+\frac{f^{(n+1)}(\xi)}{(n+1)!}(x-x_0)^{n+1}
$$

where $T^{(n)}$ is define in
[Sequence and Series](sequence_series.md#n-th-degree-taylor-polynomial-tn)

- proof

    fix $x$, let $\alpha$ s.t.

    $$
    f(x)=T^{(n)}(x,x_0)+\frac{f^{(n+1)}(\xi)}{(n+1)!}(x-x_0)^{n+1}
    +\alpha(x-x_0)^{n+1}\\[12pt]
    g(t)=f(t)-T^{(n)}(t,x_0)-\alpha(t-x_0)^{n+1}
    $$

    apply Rolle's theorem $n$ time to show $∃\ \xi$ between $x,x_0$ s.t.

    $$
    g^{(n+1)}(x_{n+1})=0
    $$

# sequence of function

$\{f_n\}$, $f_n$ defined on $E$

## sequence of function pointwise convergence

$f_n$ converge pointwise to limiting function $f ⇔$

$$
∀\ x\in E,\quad
\lim_{n → ∞}f_n(x)=f(x)
$$

## sequence of function uniform convergence

$f_n$ converge uniformly to limiting function $f ⇔$

$$
∀\ \varepsilon>0,∃\ N\text{ s.t. }∀\ n≥N\\[12pt]
∀\ x\in E,\quad
|f_n(x)-f(x)|≤\varepsilon
$$

- $∀\ n,f_n\in C(E) ⇒ f\in C(E)$
- $∀\ n,f_n\in C[a,b] ⇒$

    $$
    \lim_{n → ∞}\int_a^bf_n(x)\ dx=
    \int_a^bf(x)\ dx
    $$

- sequence of function $F_n$,
    $F_n\in C^{(1)}[a,b]$, $F'_n=f_n$, $∃\ x_0,\{F_n(x_0)\}$ converge
    $⇒ F\in C^{(1)}[a,b]$, $F'=f$

- $Q:=[a,b]\times[c,d]$, $f\in C(Q)$.
    $∀\ x_0\in[a,b],f(x_0,\cdot)\in C[c,d]$, $f_y\in C(Q)$.
    $F$ on $[c,d]$,

    $$
    F(y):=\int_a^bf(x,y)\ dx
    $$

    $⇒ F\in C^{(1)}[c,d]$,

    $$
    F'(y)=\int_a^bf_y(x,y)\ dx
    $$

## supremum norm

$f$ bounded on $E$

supremum norm or sup norm of $f$

$$
\|f\|_ ∞ :=\sup_E|f(x)|
$$

- sup norm is a metric

### function converge in the sup norm

$\{f_n\}$ on $E$ converge in the sup norm to $f ⇔$

$$
\lim_{n → ∞}\|f_n-f\|_ ∞ =0
$$

- $⇔ f_n$ converge to $f$ uniformly on $E$

### Cauchy sequence in the sup norm

$\{f_n\}$ on $E$ is Cauchy sequence in the sup norm $⇔$

$$
∀\ \varepsilon>0,∃\ N\text{ s.t.}\\[12pt]
∀\ m,n≥N,\|f_m-f_n\|_ ∞ ≤\varepsilon
$$

- $⇒ f_n$ converge in the sup norm
    - $C[a,b]$ is complete in the sup norm

### integral equation

$f\in C[a,b]$

$Q:=[a,b]\times[a,b]$, $K\in C(Q)$, $∀\ x,y\in Q,|K(x,y)|≤M$

$$
\psi(x)=f(x)+\lambda\int_a^bK(x,y)\psi(y)\ dy
$$

$\alpha:=|\lambda|M(b-a)<1 ⇒ \psi$ has unique continuous solution

proof of existence

1. define any continuous $\psi_0$ and

    $$
    \psi_n(x)=f(x)+\lambda\int_a^bK(x,y)\psi_{n-1}(y)\ dy
    $$

1. show that $\psi_n\in C[a,b]$ by induction
1. show that $∀\ x\in[a,b]$

    $$
    |\psi_{n+1}(x)-\psi_n(x)|≤\alpha\|\psi_n-\psi_{n-1}\|_ ∞
    $$

1. show by iteration that $\psi_n$ is Cauchy in sup norm

proof of uniqueness by contradiction:
subtract equation of two solution function

# calculus of variation

## functional

function with domain containing function

### Euler equation

$f$ is twice continuously differentiable functional of three variables

$$
J:=\int_a^bf(x,y(x),y'(x))\ dx
$$

$y(x)$ is extremal for $J ⇒ y(x)$ satisfy Euler equation

$$
f_y-\frac{d}{dx}f_{y'}=0
$$

# metric space

$(\mathcal M,\rho)$

## metric

$$
\rho:\mathcal M × \mathcal M → [0,∞]
$$

$∀\ x,y,z\in\mathcal M,$

1. $\rho(x,y)≥0.\rho(x,y)=0 ⇔ x=y$
1. $\rho(x,y)=\rho(y,x)$
1. $\rho(x,y)+\rho(y,z)≥\rho(x,z)$

## sequence of point in metric space converge

$\{x_n\}$, $x_n\in(\mathcal M,\rho)$

$\{x_n\}$ converge to $x\in\mathcal M ⇔$

$$
\lim_{n → ∞}\rho(x_n,x)=0
$$

also denoted as

$$
\lim_{n → ∞}x_n=x
$$

## equivalent metric

metric $\rho,\sigma$ on $\mathcal M$ are equivalent $⇔$

$$
∀\ \varepsilon>0,x\in\mathcal M,
∃\ \delta>0\text{ s.t. }∀\ y\in\mathcal M\\[12pt]
\rho(x,y)<\delta ⇒ \sigma(x,y)<\varepsilon\\[12pt]
\sigma(x,y)<\delta ⇒ \rho(x,y)<\varepsilon
$$

- $x_n → x$ in $\rho ⇔ x_n → x$ in $\sigma$

## Cauchy sequence of point in metric space

### complete metric space

### contraction

$$
T:\mathcal M →\mathcal M
$$

is contraction $⇔$

$$
∃\ \alpha\in[0,1)\text{ s.t.}\\[12pt]
∀\ x,y\in\mathcal M,\rho(T(x),T(y))≤\alpha\rho(x,y)
$$

#### fixed point of contraction

$$
T(\bar x)=\bar x
$$

- stable

    $$
    ∃\ \delta>0\text{ s.t. }
    x_0\in[\bar x-\delta,\bar x+\delta] ⇒ x_n → \bar x
    $$

#### contraction mapping principle

$(\mathcal M,\rho)$ complete $⇒$

1. $T$ has unique fixed point $x$
1. $x_{n+1}:=T(x_n) ⇒ ∀\ x_0\in\mathcal M,x_n → x$

# series of function

- $\sum a_j$ converge $⇔ ∀\ \varepsilon>0,∃\ N$ s.t.

    $$
    ∀\ n,m≥N,\quad\left|\sum_{j=n}^ma_j\right|≤\varepsilon
    $$

- $\sum a_j$ converge $⇒ a_j → 0$
- linearity

## limit superior and limit inferior

$\{a_n\}$, $a_n\in\R$

$$
\bar s_N=\sup\{a_n|n≥N\}\\[12pt]
\underbar s_N=\inf\{a_n|n≥N\}
$$

- $\{a_n\} → a ⇔$

    $$
    -∞ <\lim\sup a_n≤\lim\inf a_n< ∞ \\[12pt] ⇔
    \lim\sup a_n=a=\lim\inf a_n
    $$

- $a_n>0 ⇒$

    $$
    \lim\inf \frac{a_{n+1}}{a_n}≤\lim\inf\sqrt[n]{a_n}
    ≤\lim\sup\sqrt[n]{a_n}≤\lim\sup \frac{a_{n+1}}{a_n}
    $$

### limit superior

$$
\lim\sup a_n:=\bar s:=\lim_{N → ∞}\bar s_N
$$

- $-∞ <\bar s=s< ∞ ⇔ ∀\ \varepsilon>0,$
    - $∃\ N$ s.t. $∀\ n≥N,a_n≤s+\varepsilon$
    - $∀\ N,∃\ n≥N$ s.t. $a_n≥s-\varepsilon$

### limit inferior

$$
\lim\inf a_n:=\underbar s:=\lim_{N → ∞}\underbar s_N
$$

- $-∞ <\underbar s=s< ∞ ⇔ ∀\ \varepsilon>0,$
    - $∃\ N$ s.t. $∀\ n≥N,a_n≥s+\varepsilon$
    - $∀\ N,∃\ n≥N$ s.t. $a_n≤s-\varepsilon$

## partial sum

partial sum $S_n$ of series $\sum_{j=1}^∞ a_j$

$$
S_n:=\sum_{j=1}^na_j
$$

- series convergence is the same as its sequence of partial sum $\{S_n\}$

## series convergence test

### series absolute convergence

$\sum|a_j|$ converge $⇒ \sum a_j$ absolutely converge

- otherwise, conditionally converge or diverge
- $f:\N → \N$ is bijection $⇒ \sum a_{f(j)}=\sum a_j$ (rearrangement)
- $\sum b_k$ absolutely converge
    $⇒ \sum a_jb_k=\sum a_j\sum b_k$ absolutely converge

### comparison test

$∃\ J,∀\ j≥J,\quad 0≤a_j≤b_j≤c_j ⇒$

1. $\sum c_j$ converge $⇒ \sum b_j$ converge
1. $\sum a_j$ diverge $⇒ \sum b_j$ diverge

### root test

$$
\alpha:=\lim\sup|a_j|^{\frac{1}{j}}
$$

1. $\alpha<1 ⇒ \sum a_j$ converge absolutely
1. $\alpha>1 ⇒ \sum a_j$ diverge

### ratio test

$a_j≠0$

1. $\lim\sup\frac{|a_{j+1}|}{|a_j|}<1 ⇒ \sum a_j$ converge absolutely
1. $\lim\sup\frac{|a_{j+1}|}{|a_j|}>1 ⇒ \sum a_j$ diverge

## series of function converge

$\{f_j(x)\},x\in E$

$$
f(x)=\sum_{j=1}^∞ f_j(x)
$$

- $\sum f_j$ converge to $f ⇔ ∀\ x,\sum f_j(x)$ converge to $f(x)$

### Weierstrass M-test

1. $∀\ j,∃\ M_j$ s.t. $∀\ x\in E,|f_j(x)|≤M_j$
1. $\sum M_j$ converge

$⇒ \sum_{j=1}^∞ f_j(x)$ converge uniformly

- $f_j\in C(E) ⇒ f\in C(E)$

### integral of uniformly convergent series of function

$\sum_{j=1}^∞ f_j(x)$ converge uniformly to $f(x)$ on $[a,b] ⇒$

$∀\ x\in [a,b]$,

$$
\int_a^xf(t)\ dt=\sum_{j=1}^∞ \int_a^xf_j(t)\ dt
$$

### derivative of uniformly convergent series of function

1. $f_j\in C^{(2)}(E)$
1. $\sum f_j(x)$ converge uniformly to $f(x)$ on $E$
1. $\sum f'_j(x)$ converge uniformly on $E$

$⇒$

1. $f\in C^{(2)}(E)$
1. $$
    f'(x)=\sum_{j=1}^∞ f'_j(x)
    $$

# power series

$$
f(x):=\sum_{j=0}^∞ a_j(x-x_0)^j\\[12pt]
\rho:=\limsup|a_j|^{\frac{1}{j}}
$$

radius of convergence of $f(x)$

$$
R=\begin{cases}
    ∞ &\rho=0\\
    0&\rho= ∞ \\
    \frac{1}{\rho}&\text{otherwise}
\end{cases}
$$

## convergence of power series

- $f(x)$ converge on $(x_0-R,x_0+R)$
- $f(x)$ diverge outside $[x_0-R,x_0+R]$
- $∀\ 0≤r<R,f(x)$ converge uniformly on $[x_0-r,x_0+r]$

## property of $f(x)$ in power series

- $f(x)\in C^∞ (x_0-R,x_0+R)$
- $f'(x)=\sum_{j=0}^∞ (a_j(x-x_0)^j)'$
- $\sum_{j=0}^∞ a_j(x-x_0)^j$ is Taylor series of $f$ about $x_0$