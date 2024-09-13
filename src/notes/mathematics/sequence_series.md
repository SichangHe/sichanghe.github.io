# Sequence and Series

# sequence $\{a_n\}$

list of number in definite order

## sequence convergence

$$
\lim_{n → ∞}a_n=L
$$

$⇒ \{a_n\}$ converge

- $⇔ ∀\ \varepsilon>0,\ ∃\ N,\ ∀\ n>N$

    $$
    |a_n-L|<\varepsilon
    $$

- otherwise, $\{a_n\}$ diverge

### prove sequence convergence by function

sequence converge if corresponding function converge

$$
\lim_{x → ∞}f(x)=L
\qquad
f(n)=a_n
\quad
(n\in\N)
\\[12pt]
⇒ \lim_{n → ∞}a_n=L
$$

- all limit law on function can be applied on sequence

### sequence convergence preserve by chaining continuous function

$$
\lim_{n → ∞}a_n=L
\qquad
f\text{ continuous at }L
\\[12pt]
⇒ \lim_{x → ∞}f(a_n)=f(L)
$$

### convergence of $\{r^n\}$

$$
\lim_{n → ∞}r^n=\begin{cases}
    0&r\in(-1,1)
    \\
    1&r=1
    \\\text{DNE}&\text{otherwise}
\end{cases}
$$

## sequence monotonicity

increasing sequence

$$
∀\ n≥1,
\quad
a_n<a_{n+1}
$$

- the opposite is decreasing sequence

## bounded sequence

$\{a_n\}$ bounded above

$$
⇔ ∃\ M,
\quad ∀\ n≥1,
\quad
a_n<M
$$

- the opposite is bounded below
- bounded sequence: both bounded above and below

### monotonic sequence theorem

monotonic bounded sequence converge

# series (infinite series)

$$
\sum a_n
$$

or

$$
\sum_{n-1}^\infty a_n
$$

## $n$th partial sum $s_n$

$$
s_n=\sum_{i=1}^n
$$

## series convergence

$$
\lim_{n → ∞}s_n=s
$$

$⇒\sum a_n$ convergent

- $s$ sum of series
- the opposite is divergent
- linear combination of convergent series is convergent

## example series

### geometric series

$$
a_n=ar^{n-1}
\\[12pt]
s_n=\frac{a(1-r^n)}{1-r}
\\[12pt]
\sum a_n=\begin{cases}
    \displaystyle\frac{a}{1-r}&-1<r<1
    \\
    \text{DNE}&\text{otherwise}
\end{cases}
$$

#### power series $\sum x^n$

$$
\sum_{n=0}^∞ x^n=\frac{1}{1-x}
$$

### harmonic series

$$
a_n=\frac{1}{n}
$$

- divergent

    $$
    \sum_{n=1}^∞ \frac{1}{n}=∞
    $$

### $p$-series

$$
\sum_{n=1}^∞ \frac{1}{n^p}\begin{cases}
    \text{converge}&p>1
    \\
    \text{diverge}&p≤1
\end{cases}
$$

- $p=2$

$$
\sum_{n=1}^∞ \frac{1}{n^2}=\frac{\pi^2}{6}
$$

## divergence test

$\sum a_n$ converge $⇒ \displaystyle\lim_{n → ∞}a_n=0$

$\displaystyle\lim_{n → ∞}a_n≠0\text{ or DNE} ⇒ \sum a_n$ diverge

## integral test

$∃\ N≥1\in\N^+,\ f(n)=a_n$ continuous decreasing positive on $[N,∞)$

$∫_1^∞ f(x)\ dx$ converge $⇔ \sum a_n$ converge

### remainder estimate for integral test

$f$ decreasing on $[n,∞)$
$$
R_n=s-s_n
\\[12pt]
∫_{n+1}^∞ f(x)\ dx≤R_n≤∫_n^∞ f(x)\ dx
$$

## comparison test

$\sum b_n$ converge, $∀\ n,a_n≤b_n$\
$⇒ a_n$ converge

$\sum b_n$ diverge, $∀\ n,b_n≤a_n$\
$⇒ a_n$ diverge

## limit comparison test

$$
\lim_{n → ∞}\frac{a_n}{b_n}=\begin{cases}
    C≠0& ⇒ a_n,b_n\text{ have same convergence}
    \\[12pt]
    0,b_n\text{ converge}& ⇒ a_n\text{ converge}
    \\[12pt]
    ∞,b_n\text{diverge}& ⇒ a_n\text{ diverge}
\end{cases}
$$

## alternating series

$$
∀\ n≥1\in\N,
\qquad
a_n\cdot a_{n+1}<0
$$

### alternating series test

alternating series $a_n$

$$
\begin{rcases}
    ∀\ n≥1\in\N,
    \quad
    |a_n|≤|a_{n+1}|
    \\[12pt]
    \displaystyle\lim_{a_n → ∞}=0
\end{rcases}
⇒ a_n\text{ converge}
$$

### alternating series estimation theorem

$a_n$ satisfy alternating series test

$$
|R_n|=|s-s_n|≤|a_{n+1}|
$$

## absolute convergence

$$
\sum|a_n|\text{ converge}
$$

$ ⇒ \sum a_n$ absolutely converge

- $ ⇒ \sum a_n$ converge

### conditional convergence

$\sum a_n$ converge but not absolutely converge

$ ⇒ \sum a_n$ conditionally converge

### ratio test

$$
\lim_{n → ∞}\left|
    \frac{a_{n+1}}{a_n}
\right|
=L\begin{cases}
    <1 ⇒ \sum a_n\text{ absolutely converge}
    \\[12pt]
    >1\text{ or } ∞ ⇒ \sum a_n\text{ diverge}
\end{cases}
$$

### root test

$$
\lim_{n → ∞}\sqrt[n]{|a_n|}
=L\begin{cases}
    <1 ⇒ \sum a_n\text{ absolutely converge}
    \\[12pt]
    >1\text{ or } ∞ ⇒ \sum a_n\text{ diverge}
\end{cases}
$$

## convergence test strategy

1. special series
    1. $p$-series
    1. geometric series
1. similar form to special series\
    $⇒$ (limit) comparison test
1. divergence test
1. alternating series test
1. absolute convergence
    1. ratio test
    1. $(b_n)^n ⇒ $ root test
1. integral test

## power series

power series centered at $a$
(power series about $a$)

$$
\sum_{n=0}^∞ c_n(x-a)^n
$$

- $c_n$ coefficient

### radius of convergence $R$

$a_n$ converge when $x$ is within $R$ to $a$

1. $R=0$\
    converge iff $x=a$
1. $R=∞$\
    converge for $x\in\R$
1. $R=C>0$\
    converge if $|x-a|<R$,
    diverge if $|x-a|>R$

#### interval of convergence

1. $\{a\}$
1. $\R$
1. ⏎

    - $[a-R,a+R]$
    - $[a-R,a+R)$
    - $(a-R,a+R]$
    - $(a-R,a+R)$

#### find interval of convergence

1. find radius of convergence using ratio test/ root test
1. check endpoint

### differentiation or integration of power series

equal to each term different or integrate

#### convergence and differentiability of power series

power series
$$
\sum a_n=\sum_{n=0}^∞ c_n(x-a)^n
$$

has radius of convergence $R$

$ ⇒ $ function

$$
f(x)=\sum_{n=0}^∞ c_n(x-a)^n
$$

differentiable on $(a-R,a+R)$

1. derivative

    $$
    f'(x)
    =\sum_{n=0}^∞ \frac{d}{dx}\left(
        c_n(x-a)^n
    \right)
    \\[12pt]
    =\sum_{n=1}^∞ c_nn(x-a)^{n-1}
    $$

    - $n$ start from $1$ because the term at $0$ is $0$

1. integral

    $$
    ∫f(x)\ dx
    =\sum_{n=0}^∞ ∫c_n(x-a)^n\ dx
    \\[12pt]
    =\sum_{n=0}^∞ c_n\frac{(x-a)^{n+1}}{x+1}+C
    $$

### function $f(x)$'s power series expansion

$$
f(x)=\sum_{n=0}^∞ c_n(x-a)^n
\qquad
|x-a|<R
$$

$ ⇔ $

$$
c_n=\frac{f^{(n)}(a)}{n!}
$$

## Taylor series

Taylor series of $f$ at $a$ (/ about $a$ / centered at $a$)

$$
f(x)=\sum_{n=0}^∞ \frac{f^{(n)}(a)}{n!}(x-a)^n
$$

### Maclaurin series

Taylor series at $0$

$$
f(x)=\sum_{n=0}^∞ \frac{f^{(n)}(0)}{n!}x^n
$$

### $n$-th degree Taylor polynomial $T_n$

$n$-th degree Taylor polynomial $T_n$ of $f$ at $a$

$$
T_n(x)=\sum_{i=0}^n \frac{f^{(n)}(a)}{n!}(x-a)^n
$$

### remainder of Taylor series $R_n$

$$
R_n(x)=f(x)-T_n(x)
$$

- for $|x-a|<R$

    $$
    \lim_{n → ∞}R_n(x)=0
    $$

    $ ⇒ f$ equal sum of its Taylor series

#### Taylor's inequality

$|f^{(n+1)}(x)|≤M$ for $|x-a|≤d$

$$
⇒
|R_n(x)|≤\frac{M}{(n+1)!}|x-a|^{n+1}
$$

for $|x-a|≤d$

- used to prove equivalence between function and sum of Taylor series
- a convergent sequence $(x\in\R)$

    $$
    \lim_{n → ∞}\frac{x^n}{n!}=0
    $$

#### Maclaurin series for $e^x$

$$
e^x=\sum_{n=0}^∞ \frac{x^n}{n!}
$$

- let $x=1$
    $$
    e=\sum_{n=0}^∞ \frac{1}{n!}
    $$

#### Maclaurin series for trigonometric function

$$
\sin x
=\sum_{n=0}^∞ (-1)^n \frac{x^{2n+1}}{(2n+1)!}
\\[12pt]
\cos x
=\sum_{n=0}^∞ (-1)^n \frac{x^{2n}}{(2n)!}
$$

#### binomial series

$|x|<1$

$$
(1+x)^k
=\sum_{n=0}^∞ \Bigr(
    \begin{matrix}
        k \\ n
    \end{matrix}
\Bigr)x^n
$$
