# Probability and Statistics

⌊*x*⌋= the greatest integer smaller than *x*

$$\lim_{n \rightarrow \infty}\left( 1 + \frac{r}{B} \right)^{A} = e^{r}\\if\\\lim_{n \rightarrow \infty}\frac{A'}{B'} = 1$$

sequence

index variable

explicit formulas

recurrence relation

arithmetic sequences

geometric sequences

bounded above/ below

(un)bounded

convergent ⇒ bounded

bounded, monotone ⇒ convergent

series

convergent vs divergent series

harmonic sum $\sum_{n = 1}^{\infty}\frac{1}{n} = \infty$

*p* series:
$\sum_{n = 1}^{\infty}\frac{1}{n^{p}}\left\{\begin{array}{r}
convergent,\\p > 1 \\
divergent,\\p \leq 1
\end{array} \right.\\$

$\sum_{n = 1}^{\infty}\frac{1}{n^{2}} = \frac{\pi^{2}}{6}$

$\sum_{n = k}^{\infty}a_{n}$ convergent ⇒
lim<sub>*n* → ∞</sub>*a*<sub>*n*</sub> = 0

lim<sub>*n* → ∞</sub>*a*<sub>*n*</sub> ≠ 0⇒
$\sum_{n = k}^{\infty}a_{n}$ divergent

tests

divergence test

partial sum

geometric: |*q*| < 1

integral: *f*, *f*(*n*) = *a*<sub>*n*</sub>, continuous, ultimately
decreasing 🡪 same

comparison:

$\lim_{n \rightarrow \infty}\frac{a_{n}}{b_{n}} = c \Rightarrow \left\{\begin{array}{r}
same,c \neq 0 \\
a_{n}convergent,\\c = 0,\\b_{n}convergent \\
a_{n}divergent,\\c = \infty,\\b_{n}divergent
\end{array} \right.\\$

scaling with $\sum_{n = 1}^{\infty}\frac{1}{n^{p}}(p > 1)$ or
$\sum_{n = 1}^{\infty}\frac{1}{n}$

alternating:
|*a*<sub>*n* + 1</sub>| − |*a*<sub>*n*</sub>| < 0, ∀ *n* > *n*<sub>0</sub>, lim<sub>*n* → ∞</sub>*a*<sub>*n*</sub> = 0⇒
convergent

absolute convergence: $\sum_{}^{}\left| a_{n} \right|$ convergent

conditional convergence: $\sum_{}^{}a_{n}$ convergent, but
$\sum_{}^{}\left| a_{n} \right|$ divergent

$\sum_{}^{}\left| a_{n} \right|$ convergent
$\Rightarrow \sum_{}^{}a_{n}$ convergent

ratio:
$\lim_{n \rightarrow \infty}\left| \frac{a_{n + 1}}{a_{n}} \right|\left\{\begin{array}{r}
 < 1 \Rightarrow \sum_{}^{}a_{n}absolutely\\convergent \\
 > 1 \Rightarrow \sum_{}^{}a_{n}divergent
\end{array} \right.\\$

root:
$\lim_{n \rightarrow \infty}\sqrt[n]{|a_{n}|}\left\{\begin{array}{r}
 > 1 \Rightarrow divergent \\
 < 1 \Rightarrow convergent
\end{array} \right.\\$

uniform convergence:

*f*<sub>*n*</sub>(*x*) converge to *f*(*x*):
*f*<sub>*n*</sub>(*x*) → *f*(*x*) as *n* → ∞

∃*N*(*ε*) independent to *x*,
∀*n* > *N*, |*f*<sub>*n*</sub>(*x*) − *f*(*x*)| < *ε*⇔ uniform
convergence: *f*<sub>*n*</sub> ⇉ *f*

dominated convergence: *f*<sub>*i*</sub>(*x*) → *f*(*x*) as *x* → ∞,
∃*g*, ∀*x*, *i*, *f*<sub>*i*</sub>(*x*) < *g*(*x*) ⇒ lim<sub>*i* → ∞</sub>∫<sub>*a*</sub><sup>*b*</sup>*f*<sub>*i*</sub>(*x*)*d**x* = ∫<sub>*a*</sub><sup>*b*</sup>*f*(*x*)*d**x*

power series: $\sum_{n = 0}^{\infty}{c_{n}(x - a)^{n}}$

center *a*, coefficient *c*<sub>*n*</sub>

 ⇒ *x* = *a*⇔ convergent

or ∀*x* ∈ ℝ, convergent

or ∃*R* > 0, |*x* − *a*| < *R*⇒ convergent, |*x* − *a*| > *R*⇒
divergent

method:
$\rho = \lim_{n \rightarrow \infty}\left| \frac{c_{n + 1}}{c_{n}} \right|$,
radius of convergence $R = \frac{1}{\rho}$

|*x* − *a*| < *R*⇒ absolutely convergent, |*x* − *a*| > *R*⇒
divergent *from ratio test*

Bessel function of the first kind:
$J_{0} = \sum_{n = 0}^{\infty}\frac{( - 1)^{n}x^{2n}}{2^{2n}(n!)^{2}}$

basic formula:
$\frac{1}{1 - x} = \sum_{n = 0}^{\infty}x^{n}\\for\\|x| < 1$

plug out terms, create (*x* − *a*), see something as 1 − *x*, do it,
range

Taylor and Maclaurin Series:
$f(x) = \sum_{n = 0}^{\infty}\frac{f^{(n)}(a)}{n!}(x - a)^{n}$

$\frac{1}{1 - x} = \sum_{n = 0}^{\infty}x^{n}\\for\\|x| < 1$

$\ln(1 + x) = \sum_{n = 0}^{\infty}{( - 1)^{n}\frac{x^{n + 1}}{n + 1}}$
*f**o**r* |*x*| < 1

$- \ln(1 - x) = \sum_{n = 1}^{\infty}\frac{x^{n}}{n}$

$e^{x} = \sum_{n = 0}^{\infty}\frac{x^{n}}{n!}$

$\sin x = \sum_{n = 0}^{\infty}{( - 1)^{n}\frac{x^{2n + 1}}{(2n + 1)!}}$

$\cos x = \sum_{n = 0}^{\infty}{( - 1)^{n}\frac{x^{2n}}{(2n)!}}$

$\tan^{- 1}x = \sum_{n = 0}^{\infty}{( - 1)^{n}\frac{x^{2n + 1}}{2n + 1}}$
*f**o**r* |*x*| < 1

$(1 + x)^{k} = \sum_{n = 0}^{\infty}{\left( \begin{array}{r}
k \\
n
\end{array} \right)x^{n}}$

$(x + y)^{k} = \sum_{n = 0}^{\infty}{\left( \begin{array}{r}
k \\
n
\end{array} \right)x^{n}y^{k - n}} = \sum_{n = 0}^{k}{\left( \begin{array}{r}
k \\
n
\end{array} \right)x^{n}y^{k - n}}$

differentiation and integration:
$f^{'}(x) = \sum_{n = 1}^{\infty}\frac{f^{(n)}(a)}{n!}\left( (x - a)^{n} \right)^{'} = \sum_{n = 1}^{\infty}\frac{f^{(n)}(a)}{n!}{n(x - a)}^{n - 1}$,
$\int_{}^{}{f(x)dx} = \sum_{n = 0}^{\infty}\frac{f^{(n)}(a)}{n!}\int_{}^{}{(x - a)^{n}dx} = \sum_{n = 0}^{\infty}\frac{f^{(n)}(a)}{n!}\frac{(x - a)^{n + 1}}{n + 1} + C$

may lose boundary of convergence

Cauchy product:
$f(x)g(x) = \sum_{n = 0}^{\infty}{a_{n}x^{n}}\sum_{n = 0}^{\infty}{b_{n}x^{n}} = \sum_{n = 0}^{\infty}{c_{n}x^{n}}$,
$c_{n} = \sum_{k = 0}^{\infty}{a_{k}b_{n - k}}$

$\left( \begin{array}{r}
k \\
n
\end{array} \right) = \frac{k!}{n!(k - n)!} = \frac{k(k - 1)\ldots(k - n + 1)}{n!}$

probability

sample space *S*: nonempty set

collection of events: subset of *S*: *P*(*S*)

probability measure *P*(*A*) ∈ [0, 1], *P*(⌀) = 0, *P*(*S*) = 1

$P\left( \bigcup_{i = 1}^{n}A_{i} \right) = \sum_{i = 1}^{n}{P\left( A_{i} \right)}$
if *A*<sub>*i*</sub>… are mutually disjoint

symmetric difference: *A**Δ**B* = (*A* ∖ *B*) ∪ (*B* ∖ *A*)

complement: *A*<sup>*c*</sup> :  = *S* ∖ *A*

disjoint:
*A* ∩ *B* = ⌀ ⇔ *A* ⊆ *B*<sup>*c*</sup> ⇒ *A* ∖ *B* = *A* ∩ *B*<sup>*c*</sup>

De Morgan Laws:
(*A* ∪ *B*)<sup>*c*</sup> = *A*<sup>*c*</sup> ∩ *B*<sup>*c*</sup>, (*A* ∩ *B*)<sup>*c*</sup> = *A*<sup>*c*</sup> ∪ *B*<sup>*c*</sup>

*A* = *B* ⇔ *A* ⊆ *B*, *B* ⊆ *A*

cardinality: |*A*|= \# of elements in *A*

inclusion-exclusion principle:
|*A* ∪ *B*| = |*A*| + |*B*| − |*A* ∩ *B*|, |*A* ∪ *B* ∪ *C*| = |*A*| + |*B*| + |*C*| − |*A* ∩ *B*| − |*A* ∩ *C*| − |*B* ∩ *C*| + |*A* ∩ *B* ∩ *C*|

partition of the sample: *B*<sub>*i*</sub>, disjoint,
*S* = *B*<sub>1</sub> ∪ *B*<sub>2</sub> ∪ …

*P*(*A*) = *P*(*A* ∩ *B*<sub>1</sub>) + *P*(*A* ∩ *B*<sub>2</sub>) + …

*P*(*A* ∖ *B*) = *P*(*A* ∩ *B*<sup>*c*</sup>) = *P*(*A*) − *P*(*B*)

not necessarily disjoint:
*P*(*A*<sub>1</sub> ∩ *A*<sub>2</sub> ∩ …) ≤ *P*(*A*<sub>1</sub>) + *P*(*A*<sub>2</sub>) + …

independent: *P*(*A* ∩ *B*) = *P*(*A*)*P*(*B*) for two events, and
*P*(*A*<sub>1</sub> ∩ … ∩ *A*<sub>*i*</sub>) = *P*(*A*<sub>1</sub>)…*P*(*A*<sub>*i*</sub>)
for more events

uniform probability: $P(A) = \frac{|A|}{|S|}$

continuous uniform distribution:
$P\left( \lbrack x,y\rbrack \right) = \frac{y - x}{b - a}$,
[*x*, *y*] ⊂ [*a*, *b*]

combinatorics: length *k*, *n* symbols  ⇒ *n*<sup>*k*</sup>

ordered subset $\Rightarrow {\frac{n!}{(n - k)!} = n}^{\underline{k}}$

binomial: $\left( \begin{array}{r}
n \\
k
\end{array} \right) = \frac{n!}{k!(n - k)!},or\\0\\if\\k < 0\\or\\k > n$

$\left( \begin{array}{r}
n \\
k
\end{array} \right) = \left( \begin{array}{r}
n - 1 \\
k
\end{array} \right) + \left( \begin{array}{r}
n - 1 \\
k - 1
\end{array} \right)$

$\left( \begin{array}{r}
2n \\
n
\end{array} \right) = \sum_{k = 0}^{n}\left( \begin{array}{r}
n \\
k
\end{array} \right)^{2}$

generating function: $f(x) = \sum_{n = 0}^{\infty}{a_{n}x^{n}}$

exponential generating function:
$f(x) = \sum_{n = 0}^{\infty}{a_{n}\frac{x^{n}}{n}}$

Bayes’ theorem:
$P\left( B \middle| A \right) = \frac{P(B \cap A)}{P(A)} = \frac{P(B)}{P(A)}P\left( A \middle| B \right)$

random variable *X*(*b**l**a*) = 2

discrete: $\sum_{x\mathbb{\in R}}^{}{P(X = x)} = 1$

PDF probability mass/ density function:
*p*<sub>*X*</sub>(*x*) = *P*(*X* = *x*)

$P(X = x) = \sum_{i}^{}{P\left( A_{i} \right)}P(X = x|A_{i})$

law of total probability:
$P(A) = \sum_{x\mathbb{\in R}}^{}{P(X = x)P\left( A \middle| X = x \right)}$

Bernoulli: *p*<sub>*X*</sub>(0) = *q*, *p*<sub>*X*</sub>(1) = *p*

Binomial: $p_{X}(k) = \left( \begin{array}{r}
n \\
k
\end{array} \right)p^{k}q^{n - k}$

*r*<sub>*X*</sub>(*t*) = (*t**p* + *q*)<sup>*n*</sup>

geometric: *p*<sub>*X*</sub>(*k*) = *p**q*<sup>*k*</sup>

$E(X) = \frac{q}{p},var(X) = \frac{q}{p^{2}}$

negative-binomial: $p_{X}(k) = \left( \begin{array}{r}
r + k - 1 \\
k
\end{array} \right)p^{r}q^{k} = ( - 1)^{k}\left( \begin{array}{r}

- r \\
k
\end{array} \right)p^{r}q^{k}$

Poisson: $p_{X}(k) = e^{- \lambda}\frac{\lambda^{k}}{k!}$

*E*(*X*) = *v**a**r*(*X*) = *λ*

hypergeometric: $p_{X}(k) = \frac{\left( \begin{array}{r}
M \\
k
\end{array} \right)\left( \begin{array}{r}
N - M \\
n - k
\end{array} \right)}{\left( \begin{array}{r}
n \\
N
\end{array} \right)}$

continuous distribution:
*p*<sub>*X*</sub>(*k*) = 0 ∀ *x* ∈ ℝ,∫<sub>−∞</sub><sup>∞</sup>*f*(*x*)*d**x* = 1

uniform: $f(x) = \left\{\begin{array}{r}
\frac{1}{b - a},a \leq x \leq b \\
0
\end{array} \right.\\$

$var(X) = \frac{(b - a)^{2}}{12}$

exponential: $f(x) = \left\{\begin{array}{r}
\lambda e^{- \lambda x},0 \leq x \\
0,x < 0
\end{array} \right.\\$

*P*(*x* ≥ *t*) = *e*<sup>−*λ**t*</sup>

$E(X) = \frac{1}{\lambda},var(X) = \frac{1}{\lambda^{2}}$

$r_{X}(t) = \frac{\lambda}{\lambda - \ln t}\\if\\\lambda - \ln t > 0$

normal:
$f(x) = n\left( x;\mu,\sigma^{2} \right) : = \frac{1}{\sqrt{2\pi}\sigma}e^{- \frac{(x - \mu)^{2}}{2\sigma^{2}}}$

$\Phi(x) = \frac{1}{\sqrt{2\pi}}\int_{- \infty}^{x}{e^{- \frac{t^{2}}{2}}dt}$

gamma: $f(x) = \left\{\begin{array}{r}
\frac{\lambda^{\alpha}x^{\alpha - 1}}{\Gamma(\alpha)}e^{- \lambda x},x \geq 0 \\
0,x < 0
\end{array} \right.\\$

$\Gamma(x) = \int_{0}^{\infty}{t^{x - 1}e^{- t}dt} = \left\{\begin{array}{r}
(x - 1)!,x \in N* \\
\sqrt{\pi},x = \frac{1}{2}
\end{array} \right.\\$

*Γ*(*x* + 1) = *x**Γ*(*x*)

chi-squared: *Χ*<sup>2</sup>(*n*) is the distribution of
*Z* = *X*<sub>1</sub><sup>2</sup> + … + *X*<sub>*n*</sub><sup>2</sup>
with *X*<sub>*i*</sub> ∼ *N*(0, 1)

$Z\sim\Gamma\left( \frac{n}{2},\frac{1}{2} \right)$

*E*(*Z*) = *n*

$f_{Z}(z) = \frac{1}{\sqrt{2\pi z}}e^{- \frac{z}{2}}$ for *z* ≥ 0 if
*n* = 1

t (or student): *t*(*n*) is the distribution of
$Z = \frac{X}{\sqrt{\frac{X_{1}^{2} + \ldots + X_{n}^{2}}{n}}}$ with
*X*<sub>*i*</sub> ∼ *N*(0, 1)

$T = \frac{\overline{X} - \mu}{\frac{{\overline{S}}_{n}}{\sqrt{n}}}\sim t(n - 1)$

<img src="./media/image1.tiff" style="width:4.26389in;height:2.47222in"
alt="Table Description automatically generated" />

CDF cumulative distribution fun
$F_{X}(x) = P(X \leq x) = \left\{\begin{array}{r}
\sum_{y_{i} \leq x}^{}{f_{X}\left( y_{i} \right)},discrete \\
\int_{- \infty}^{x}{f_{X}(t)dt},continuous
\end{array} \right.\\$

joint distributions *Y* = *h*(*X*)

if *X* discrete, then
$P_{Y}(y) = \sum_{x \in h^{- 1}\\ y\\}^{}{P_{X}(x)}$

if *X* continuous, *h*(*x*) monotone where
*f*<sub>*X*</sub>(*x*) > 0, then
$f_{Y}(y) = \frac{f_{X}\left( h^{- 1}(y) \right)}{{|h}^{'}\left( h^{- 1}(y) \right)|}$

marginal distribution:
*F*<sub>*X*</sub>(*x*) = lim<sub>*y* → ∞</sub>*F*<sub>*X*, *Y*</sub>(*x*, *y*)

joint probability fun

marginal PDF: $p_{X}(x) = \sum_{y}^{}{p_{X,Y}(x,y)}$ *table*

joint density fun:
*f*(*x*, *y*), ∫<sub>−∞</sub><sup>∞</sup>∫<sub>−∞</sub><sup>∞</sup>*f*(*x*, *y*)*d**x**d**y* = 1

marginal PDF
*f*<sub>*X*</sub>(*x*) = ∫<sub>−∞</sub><sup>∞</sup>*f*<sub>*X*, *Y*</sub>(*x*, *y*)*d**y*

independent $P\left( A \middle| B \right) = \frac{P(A \cap B)}{P(B)}$

$p_{Y|X}\left( y \middle| x \right) = \frac{p_{X,Y}(x,y)}{\sum_{z}^{}{p_{X,Y}(x,z)}} = \frac{p_{X,Y}(x,y)}{p_{X}(x)}$
*or f*

continuous:
$P(a \leq Y \leq b,X = x) = \int_{a}^{b}\frac{f_{X,Y}(x,y)dy}{f_{X}(x)}$

law of total prob:
*P*((*X*, *Y*) ∈ *B*) = ∬<sub>*B*</sub>*f*<sub>*X*</sub>(*x*)*f*<sub>*Y*|*X*</sub>(*y*|*x*)*d**x**d**y*

independent random variables:
∀*B*<sub>1</sub>, *B*<sub>2</sub>, *P*(*X* ∈ *B*<sub>1</sub>, *Y* ∈ *B*<sub>2</sub>) = *P*(*X* ∈ *B*<sub>1</sub>)*P*(*Y* ∈ *B*<sub>2</sub>)

expectation: *E*(*X**Y*) = *E*(*X*)*E*(*Y*) if *X*, *Y* independent

variance:
*v**a**r*(*X*) = *E*((*X* − *μ*<sub>*x*</sub>)<sup>2</sup>) = *E*(*X*<sup>2</sup>) − *E*<sup>2</sup>(*X*),
*v**a**r*(*X* + *Y*) = *v**a**r*(*X*) + *v**a**r*(*Y*) + 2*c**o**v*(*X*, *Y*)

covariance:
*c**o**v*(*X*, *Y*) = *E*((*X* − *μ*<sub>*X*</sub>)(*Y* − *μ*<sub>*Y*</sub>)) = *E*(*X**Y*) − *E*(*X*)*E*(*Y*)

*c**o**v*(*a**X* + *b**Y*, *Z*) = *a* *c**o**v*(*X*, *Z*) + *b* *c**o**v*(*Y*, *Z*)

correlation: $corr(X,Y) = \frac{cov(X,Y)}{Sd(X)Sd(Y)}$

i.i.d. mutually independent and identically distributed

*X*<sub>1</sub>, …, *X*<sub>*n*</sub> ∼ *B**e**r**n**o**u**l**l**i*(*p*) *i*. *i*. *d*.  ⇒ *X*<sub>1</sub> + … + *X*<sub>*n*</sub> ∼ *B*(*n*, *p*)

*X*<sub>1</sub> ∼ *B*(*n*<sub>1</sub>, *p*), *X*<sub>2</sub> ∼ *B*(*n*<sub>2</sub>, *p*) ⇒ *X*<sub>1</sub> + *X*<sub>2</sub> ∼ *B*(*n*<sub>1</sub> + *n*<sub>2</sub>, *p*)

*X*<sub>1</sub> ∼ *P**o**i**s**s**o**n*(*λ*<sub>1</sub>), *X*<sub>2</sub> ∼ *P**o**i**s**s**o**n*(*λ*<sub>2</sub>) ⇒ *X*<sub>1</sub> + *X*<sub>2</sub> ∼ *P**o**i**s**s**o**n*(*λ*<sub>1</sub> + *λ*<sub>2</sub>)

generating fun: *r*<sub>*X*</sub>(*t*) = *E*(*t*<sup>*X*</sup>)

*r*<sub>*X* + *Y*</sub>(*t*) = *r*<sub>*X*</sub>(*t*)*r*<sub>*Y*</sub>(*t*)

*k*th moment: *E*(*X*<sup>*k*</sup>)

*k*th central moment: *E*((*X* − *μ*<sub>*x*</sub>)<sup>*k*</sup>)

moment-generating fun:
$M_{X}(s) = E\left( e^{Xs} \right) = r_{X}\left( e^{s} \right) = \sum_{n = 0}^{\infty}{\frac{E\left( X^{n} \right)}{n!}s^{n}}$

*M*<sub>*X*</sub><sup>(*k*)</sup>(0) = *E*(*X*<sup>*k*</sup>)

*M*<sub>*X* + *Y*</sub>(*s*) = *M*<sub>*X*</sub>(*s*)*M*<sub>*Y*</sub>(*s*)
*X, Y independent, work for* *r*<sub>*X*</sub>(*t*)

uniqueness: if
∃*s*<sub>0</sub> > 0, *M*<sub>*X*</sub>(*s*) < ∞ ∀*s* ∈ (−*s*<sub>0</sub>, *s*<sub>0</sub>), *M*<sub>*X*</sub>(*s*) = *M*<sub>*Y*</sub>(*s*),
then *X*, *Y* have the same distribution *also work for* *r*

characteristic fun: *c*<sub>*X*</sub>(*s*)= *E*(*e*<sup>*i**X**s*</sup>)

inequalities

Markov’s:$P(X \geq a) \leq \frac{E(X)}{a}$ *X* ≥ 0, *a* > 0

Chebychev’s:
$P\left( \left| X - \mu_{X} \right| \geq a \right) \leq \frac{var(X)}{a^{2}}$
*a* > 0

Cauchy-Schwarz: $\left| cov(X,Y) \right| \leq \sqrt{var(X)var(Y)}$

=, iff $X - \mu_{X} = \frac{cov(X,Y)}{var(Y)}(Y - \mu_{Y})$ if
*v**a**r*(*Y*) > 0

law of large number

sample sum: *S*<sub>*n*</sub> = *X*<sub>1</sub> + … + *X*<sub>*n*</sub>
for {*X*<sub>*i*</sub>} i. i. d.

sample average:
$M_{n} = \overline{X} = \frac{1}{n}\left( X_{1} + \ldots + X_{n} \right) = \frac{S_{n}}{n}$

WLLN weak: lim<sub>*n* → ∞</sub>*P*(|*M*<sub>*n*</sub> − *μ*| ≥ *ε*) = 0
for {*X*<sub>*i*</sub>} same *μ*, *v**a**r* ≤ *v*, *v* < ∞,
*ε* > 0 *not necessarily i. i. d.*

$M_{n}\overset{P}{\rightarrow}\mu$

SLLN strong: *P*{lim<sub>*n* → ∞</sub>*M*<sub>*n*</sub> = *μ*} = 1 for
{*X*<sub>*i*</sub>} i. i. d.

$M_{n}\overset{a.s.}{\rightarrow}\mu$x

central limit theorem:
lim<sub>*n* → ∞</sub>*P*(*Z*<sub>*n*</sub> ≤ *x*) = *P*(*Z* ≤ *x*) for
{*X*<sub>*i*</sub>} i. i. d, *Z* ∼ *N*(0, 1),
$Z_{n} = \frac{S_{n} - n\mu}{\sqrt{n}\sigma} = \sqrt{n}\left( \frac{M_{n} - \mu}{\sigma} \right)$

$\Phi(x) = \lim_{n \rightarrow \infty}{P\left( Z_{n} \leq x \right)} = \lim_{n \rightarrow \infty}{P\left( S_{n} \leq n\mu + x\sqrt{n}\sigma \right)} = \lim_{n \rightarrow \infty}{P\left( M_{n} \leq \mu + \frac{x\sigma}{\sqrt{n}} \right)}$

$Z_{n}\overset{D}{\rightarrow}Z\sim N(0,1)$

convolution: for *X*, *Y* independent, *Z* = *X* + *Y*

discrete: $p_{Z}(z) = \sum_{w}^{}{p_{X}(z - w)p_{Y}(w)}$

continuous:
*f*<sub>*Z*</sub>(*z*) = ∫<sub>−∞</sub><sup>∞</sup>*f*<sub>*X*</sub>(*z* − *w*)*f*<sub>*Y*</sub>(*w*)*d**w*

different convergence

$X_{n}\overset{P}{\rightarrow}Y$: {*X*<sub>*n*</sub>} converges in
probability to *Y*, if
lim<sub>*n* → ∞</sub>*P*(|*X*<sub>*n*</sub> − *Y*| ≥ *ε*) = 0

$X_{n}\overset{a.s.}{\rightarrow}Y$: {*X*<sub>*n*</sub>} converges with
probability 1 (almost surely) to *Y*, if
lim<sub>*n* → ∞</sub>*P*(*X*<sub>*n*</sub> = *Y*) = 1

$X_{n}\overset{D}{\rightarrow}Y$: {*X*<sub>*n*</sub>} converges in
distribution to *Y*, if
lim<sub>*n* → ∞</sub>*P*(*X*<sub>*n*</sub> ≤ *x*) = *P*(*Y* ≤ *x*) ∀ *x* ∈ {*x*|*P*(*Y* = *x*) = 0}

$X_{n}\overset{a.s.}{\rightarrow}Y \Rightarrow X_{n}\overset{D}{\rightarrow}Y \Rightarrow X_{n}\overset{P}{\rightarrow}Y$

sample

sample variance:
$\overline{S_{n}^{2}} = \frac{1}{n - 1}\sum_{j = 1}^{n}\left( X_{j} - \overline{X} \right)^{2}$

*k*th sample moment: $\overline{x^{k}}$

point estimation

the method of moments:
 ${\widehat{\mu}}_{n} = \overline{X},{\widehat{\sigma}}^{2} = \overline{X^{2}} - {\overline{X}}^{2}$

MLE maximum likelihood estimation: make *L* big as possible

maximum likelihood fun:
*L*(*θ*; *x*<sub>1</sub>, …, *x*<sub>*n*</sub>) = *p*(*X*<sub>1</sub> = *x*<sub>1</sub>, …*X*<sub>*n*</sub> = *x*<sub>*n*</sub>|*θ*)
*or f*

*x*<sub>1</sub>, …, *x*<sub>*n*</sub> independent:
$L\left( \theta;x_{1},\ldots,x_{n} \right) = \prod_{j = 1}^{n}{p\left( X_{j} = x_{j} \middle| \theta \right)}$

good point estimator

unbiased: *E*(*θ̂*<sub>*n*</sub>) = *θ*

consistent: ${\widehat{\theta}}_{n}\overset{P}{\rightarrow}\theta$

mean squared error *E*((*θ̂*<sub>*n*</sub> − *θ*)<sup>2</sup>) is small

confidence interval:
*P*(*θ̂*<sub>*n*</sub><sup>−</sup> ≤ *θ* ≤ *θ̂*<sub>*n*</sub><sup>+</sup>) ≥ 1 − *α*

 ⇐ *P*(*a* ≤ *g*(*θ*) ≤ *b*) ≥ 1 − *α*

*N*, *t*: let −*b* = *a*,

*Χ*<sup>2</sup>: let
$a = Χ_{\frac{\alpha}{2}}^{2}(n),b = Χ_{1 - \frac{\alpha}{2}}^{2}(n)$

deal with *X*<sub>*i*</sub> ∼ *N*(*μ*, *σ*<sup>2</sup>)

 ${\overline{S}}^{2} = \frac{1}{n - 1}\sum_{i = 1}^{n}\left( X_{i} - \overline{X} \right)^{2}$

$\sigma = \sigma_{0} \Rightarrow \frac{\overline{X} - \mu}{\sigma_{0}/\sqrt{n}}\sim N(0,1) \Rightarrow \mu$

$\frac{\overline{X} - \mu}{{\overline{S}}_{n}/\sqrt{n}}\sim t(n - 1) \Rightarrow \mu$

*μ* = *μ*<sub>0</sub>:
$\frac{1}{\sigma^{2}}\sum_{i = 1}^{n}\left( X_{i} - \mu_{0} \right)^{2}\sim Χ^{2}(n) \Rightarrow \sigma$

$\frac{(n - 1){\overline{S}}^{2}}{\sigma^{2}}\sim Χ^{2}(n - 1) \Rightarrow \sigma$

hypothesis testing

null hypothesis *H*<sub>0</sub>

type *I*/ *II* error: *H*<sub>0</sub> true/ false

level of significance *α*: probability for type *I* error

power of the test 1 − *β*, *β*: probability for type *II* error

*p*-value: probability that *H*<sub>0</sub> is true

reject if *p*-value  < *α*

for {*X*<sub>*i*</sub> ∼ *N*(*μ*, *σ*<sub>0</sub><sup>2</sup>)} i.i.d.,
use $\frac{\overline{X} - \mu_{0}}{\sigma_{0}/\sqrt{n}}\sim N(0,1)$

for two samples,
$T = \frac{\left( {\overline{X}}_{1} - \mu_{1} \right) - ({\overline{X}}_{2} - \mu_{2})}{\sqrt{\frac{S_{1}^{2}}{n_{1}} + \frac{S_{2}^{2}}{n_{2}}}}\sim t(df),df = \frac{\left( \frac{S_{1}^{2}}{n_{1}} + \frac{S_{2}^{2}}{n_{2}} \right)^{2}}{\frac{1}{n_{1} - 1}\left( \frac{S_{1}^{2}}{n_{1}} \right)^{2} + \frac{1}{n_{2} - 1}\left( \frac{S_{2}^{2}}{n_{2}} \right)^{2}}$

linear regression

linear least squares $\left\{\begin{array}{r}
m = \frac{\sum_{j = 1}^{n}{\left( x_{j} - \overline{x} \right)\left( y_{j} - \overline{y} \right)}}{\sum_{j = 1}^{n}{(x_{j} - \overline{x})}} \\
b = \overline{y} - m\overline{x}
\end{array} \right.\\$

correlation coefficient:
$r = corr(X,Y) = \frac{n\sum_{j = 1}^{n}\left( x_{j}y_{j} \right) - \sum_{j = 1}^{n}x_{j}\sum_{j = 1}^{n}y_{j}}{\sqrt{\left\lbrack \sum_{j = 1}^{n}x_{j}^{2} - \left( \sum_{j = 1}^{n}x_{j} \right)^{2} \right\rbrack\left\lbrack \sum_{j = 1}^{n}y_{j}^{2} - \left( \sum_{j = 1}^{n}y_{j} \right)^{2} \right\rbrack}}$

standard statistical model:
*Y*<sub>*j*</sub> = *β*<sub>0</sub> + *β*<sub>1</sub>*x*<sub>*j*</sub> + *e*<sub>*j*</sub>, *j* = 1, 2, …, *n*

*E*(*e*<sub>*j*</sub>) = 0, *v**a**r*(*e*<sub>*j*</sub>) = *σ*<sup>2</sup>

intercept *β*<sub>0</sub>, slope *β*<sub>1</sub>, residual
*e*<sub>*j*</sub>

estimators $\left\{\begin{array}{r}
{\widehat{\beta}}_{1} = \frac{1}{l_{XX}}\sum_{j = 1}^{n}{\left( x_{j} - \overline{x} \right)\left( y_{j} - \overline{y} \right)} = \frac{1}{l_{XX}}\left( \sum_{j = 1}^{n}{x_{j}y_{j}} - n\overline{x}\overline{y} \right) \\
{\widehat{\beta}}_{0} = \frac{\sum_{j = 1}^{n}x_{j}^{2}\sum_{j = 1}^{n}y_{j} - \sum_{j = 1}^{n}x_{j}\sum_{j = 1}^{n}{x_{j}y_{j}}}{n\sum_{j = 1}^{n}x_{j}^{2} - \left( \sum_{j = 1}^{n}x_{j} \right)^{2}}
\end{array} \right.\\$

$$l_{XX} = \sum_{j = 1}^{n}\left( x_{j} - \overline{x} \right)^{2} = \sum_{j = 1}^{n}x_{j}^{2} - n{\overline{x}}^{2}$$

*E*(*β̂*<sub>0</sub>) = *β*<sub>0</sub>, *E*(*β̂*<sub>1</sub>) = *β*<sub>1</sub>

$var\left( {\widehat{\beta}}_{0} \right) = \left( \frac{1}{n} + \frac{{\overline{x}}^{2}}{l_{XX}} \right)\sigma^{2},var\left( {\widehat{\beta}}_{1} \right) = \frac{\sigma^{2}}{l_{XX}},cov\left( {\widehat{\beta}}_{0},{\widehat{\beta}}_{1} \right) = - \frac{\overline{x}}{l_{XX}}\sigma^{2}$

if *e*<sub>*j*</sub> ∼ *N*(0, *σ*<sup>2</sup>) i.i.d., then
*β̂*<sub>0</sub>, *β̂*<sub>1</sub> normal dist

sum of squared errors SSE:
$S_{e}^{2} = \sum_{j = 1}^{n}\left( Y_{j} - {\widehat{\beta}}_{0} - {\widehat{\beta}}_{1}x_{j} \right)^{2}$

${\widehat{\sigma}}^{2} = \frac{S_{e}^{2}}{n - 2}$

$E\left( {\widehat{\sigma}}^{2} \right) = \sigma^{2},\frac{S_{e}^{2}}{\sigma^{2}}\sim Χ^{2}(n - 2),{\widehat{\sigma}}^{2}$
independent of *β̂*<sub>0</sub>, *β̂*<sub>1</sub>

$$\sigma\\known\frac{{\widehat{\beta}}_{1} - \beta_{1}}{\sigma/\sqrt{l_{XX}}}\sim N(0,1) \Rightarrow {\widehat{\beta}}_{1}$$

$$\frac{{\widehat{\beta}}_{1} - \beta_{1}}{\widehat{\sigma}/\sqrt{l_{XX}}}\sim t(n - 2) \Rightarrow {\widehat{\beta}}_{1}$$

$$\sigma\\known\frac{{\widehat{\beta}}_{0} - \beta_{0}}{\sigma/\sqrt{\frac{1}{n} + \frac{{\overline{x}}^{2}}{l_{XX}}}}\sim N(0,1) \Rightarrow {\widehat{\beta}}_{0}$$

$$\frac{{\widehat{\beta}}_{0} - \beta_{0}}{\widehat{\sigma}/\sqrt{\frac{1}{n} + \frac{{\overline{x}}^{2}}{l_{XX}}}}\sim t(n - 2) \Rightarrow {\widehat{\beta}}_{0}$$

1 − *α* confidence interval for *β̂*<sub>0</sub>, *β̂*<sub>1</sub>

<img src="./media/image2.tiff" style="width:3.18056in;height:2.11111in"
alt="Text, letter Description automatically generated" />

1 − *α* <u>confidence interval</u> for *σ*<sup>2</sup>

$$\left\lbrack \frac{(n - 2){\widehat{\sigma}}^{2}}{Χ_{\frac{\alpha}{2}}^{2}(n - 2)},\frac{(n - 2){\widehat{\sigma}}^{2}}{Χ_{1 - \frac{\alpha}{2}}^{2}(n - 2)} \right\rbrack$$

${\widehat{y}}_{0}\sim N\left( \beta_{0} + \beta_{1}x_{0},\left( \frac{1}{n} + \frac{\left( x_{0} - \overline{x} \right)^{2}}{l_{XX}} \right)\sigma^{2} \right)$

1 − *α* confidence interval for *y*<sub>0</sub> = *E*(*ŷ*<sub>0</sub>):
$\left\lbrack y_{0} - t_{1 - \frac{\alpha}{2}}(n - 2)\widehat{\sigma}\sqrt{\frac{1}{n} + \frac{\left( x_{0} - \overline{x} \right)^{2}}{l_{XX}}},y_{0} + t_{1 - \frac{\alpha}{2}}(n - 2)\widehat{\sigma}\sqrt{\frac{1}{n} + \frac{\left( x_{0} - \overline{x} \right)^{2}}{l_{XX}}} \right\rbrack$
