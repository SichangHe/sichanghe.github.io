<!-- toc -->
# Calculus

# function

## piecewise defined function

different formula for different part of domain

- step function

## composite function $f\circ g$

# mathematical model

## empirical model

model based entirely on data

# limit

$f$ is defined on interval containing $a$ except possibly $a$

$$
\lim_{x → a}f(x)=L
\\[12pt]
⇔ ∀\ \varepsilon>0,\ ∃\ \delta>0,
\\[12pt]
\text{if}\quad
0<|x-a|<\delta
\quad\text{then}\quad
|f(x)-L|<\varepsilon
$$

- limit exist iff limit from both side exist

    $$
    \lim_{x → a}f(x)=L
    \quad\text{iff }
    \lim_{x → a^-}f(x)=L
    \text{ and }
    \lim_{x → a^+}f(x)=L
    $$

## limit law

- linear: sum law, difference law, constant multiplication law
- product law, power law
- quotient law

    $$
    \lim_{x → a}\frac{f(x)}{g(x)}
    =\frac{\lim_{x → a}f(x)}{\lim_{x → a}g(x)}
    \quad\lim_{x → a}g(x)≠0
    $$

derivative rule

- $∀\ r>0$ rational

    $$
    \lim_{x → ∞}\frac{1}{x^r}=0
    $$

    - limit calculation technique\
        divide numerator and denominator by highest power of $x$

## direct substitution property

polynomial limit can be pulled out

$$
\lim_{h → 0}\frac{b^h-1}{h}=\ln b
$$

## limit comparison

$f(x)≤g(x)$ near $a$

$$
⇒ \lim_{x → a}f(x)
≤ \lim_{x → a}g(x)
$$

### squeeze theorem (sandwich theorem)

$f(x)≤g(x)≤h(x)$ near $a$,

$$
\lim_{x → a}f(x)=\lim_{x → a}h(x)=L
\\[12pt]
⇒ \lim_{x → a}g(x)=L
$$

e.g.

$$
\lim_{h → 0}\frac{\sin h}{h}=1
$$

## continuity

$f$ is continuous at $a$

$$
⇔ \lim_{x → a}f(x)=f(a)
$$

- continuous from the left/ right
- continuous on an interval $⇔$ continuous at every point in interval
- continuous function after operation in limit law are still continuous
- function continuous in domain
    - polynomial
    - rational
    - (inverse) trigonometric
    - exponential
    - logarithmic

### discontinuity

- removable\
    redefining $f$ at single point remove discontinuity
- unremovable
    - infinite discontinuity
    - jump discontinuity

### intermediate value theorem

$f$ continuous on $[a,b],f(a)≠f(b)$,\
$⇒ ∀\ N\in(f(a),f(b)),
\quad ∃\ c\in(a,b),f(c)=N$

# derivative $f'(a)$

derivative of $f$ at $a$

$$
f'(a)=\lim_{h → 0}\frac{f(a+h)-f(a)}{h}
\\[12pt]
=\lim_{x → a}\frac{f(x)-f(a)}{x-a}
$$

## derivative function $f'(x)$

$$
f'(x)=\lim_{h → 0}\frac{f(x+h)-f(x)}{h}
\\[12pt]
=y'
=\frac{dy}{dx}
=\frac{df}{dx}
=\frac{d}{dx}f(x)
=Df(x)
=D_xf(x)
$$

differential operator $D$, $\frac{d}{dx}$

$$
f'(a)=\frac{dy}{dx}\Bigr|_{x=a}
=\left.\frac{dy}{dx}\right] _{x=a}
$$

## differentiability

$f$ is differentiable at $a$\
$⇔ f'(x)$ exist

$f$ is differentiable on interval\
$⇔ f$ is differentiable at every point in the interval

- $f$ differentiable at $a ⇒ f$ continuous at $a$

## second derivative

$$
f''(x)=\frac{d}{dx}\left(
    \frac{dy}{dx}
\right)
=\frac{d^2y}{dx^2}
$$

## derivative rule

- linear: constant multiplication, sum, difference rule
- definition of $e$

    $$
    \lim_{h → 0}\frac{e^h-1}{h}=1
    $$

- product rule

    $$
    \frac{d}{dx}(uv)=u \frac{dv}{dx}+v \frac{du}{dx}
    $$

- quotient rule

    $$
    \frac{d}{dx}\left(
        \frac{u}{v}
    \right)
    =\frac{v \frac{du}{dx}-u \frac{dv}{dx}}{v^2}
    $$

- chain rule

    $$
    \frac{dy}{dx}=\frac{dy}{du}\frac{du}{dx}
    $$

## implicit differentiation

differentiate both side of equation

### derivative of (inverse) trigonometric function

$$
\frac{d}{dx}(\tan x)=\sec^2\!x
\\[12pt]
\frac{d}{dx}(\csc x)=-\csc x\cot x
\\[12pt]
\frac{d}{dx}(\sec x)=\sec x\tan x
\\[12pt]
\frac{d}{dx}(\cot x)=-\csc^2\!x
\\[12pt]
\frac{d}{dx}(\sin^{-1}\!x)=\frac{1}{\sqrt{1-x^2}}
\\[12pt]
\frac{d}{dx}(\cos^{-1}\!x)=-\frac{1}{\sqrt{1-x^2}}
\\[12pt]
\frac{d}{dx}(\tan^{-1}\!x)=\frac{1}{1+x^2}
\\[12pt]
\frac{d}{dx}(\cot^{-1}\!x)=-\frac{1}{1+x^2}
\\[12pt]
\frac{d}{dx}(\sec^{-1}\!x)=\frac{1}{x\sqrt{x^2-1}}
\\[12pt]
\frac{d}{dx}(\csc^{-1}\!x)=-\frac{1}{x\sqrt{x^2-1}}
$$

### derivative of logarithmic function

$$
\frac{d}{dx}(\ln|u|)=\frac{du}{udx}
\\[12pt]
\frac{d}{dx}\ln|x|=\frac{1}{x}
$$

## logarithmic differentiation

take the logarithm of both side of equation and differentiate

## differential $dy$

$$
dy=\frac{dy}{dx}dx
$$

## hyperbolic function

$$
\sinh x=\frac{e^x-e^{-x}}{2}
\\[12pt]
\cosh x=\frac{e^x+e^{-x}}{2}
$$

- hyperbolic identity similar to trigonometric identity
- inverse hyperbolic function composed of logarithm
- derivative of hyperbolic function compose of hyperbolic functions
- derivative of inverse hyperbolic function have similar form
    like that of trigonometric function

# extremum

## extreme value theorem

$f$ continuous on closed interval\
$⇒ f$ has absolute maximum and absolute minimum in the interval

## Fermat's theorem

$f$ has extremum at $a$, $f'(a)$ exist\
$⇒ f'(c)=0$

## critical number $a$

$f'(a)=0$ or $f'(a)$ DNE

### closed interval method

find absolute extremum of continuous function $f$ on closed interval
by checking the value of the critical number and endpoint

## mean value theorem

$f$ continuous on $[a,b]$, differentiable on $(a,b)$\
$⇒ ∃\ c\in(a,b),f'(c)=\frac{f(b)-f(a)}{b-a}$

- $∀\ x\in(a,b),f'(x)=0 ⇒ ∀\ x\in(a,b),f(x)=C$
- $∀\ x\in(a,b),f'(x)=g'(x) ⇒ ∀\ x\in(a,b),f(x)=g(x)+C$

### Rolle's theorem

$f$ continuous on $[a,b]$, differentiable on $(a,b)$, $f(a)=f(b)$\
$⇒ ∃\ c\in(a,b),f'(c)=0$

## derivative test

### first derivative test

- increasing/ decreasing
- extremum

### second derivative test

#### concave upward/ downward

graph of $f$ lie above/ below all its tangent

#### inflection point

# indeterminate form

- $\frac{0}{0}$
- $\frac{∞}{∞}$

form that can transform to indeterminate form

- $0 \cdot ∞$
- $∞ - ∞$
- $0^∞$
- $∞^0$
- $1^∞$

## L'Hospital's rule

$f,g$ differentiable, $g'(x)≠0$ near $a$ (excluding $a$),
$\lim_{x → a}\frac{f(x)}{g(x)}$ is in indeterminate form\
$$
⇒ \lim_{x → a}\frac{f(x)}{g(x)}
=\lim_{x → a}\frac{f'(x)}{g'(x)}
$$

# antiderivative

$$
F'=f
$$

- $F(x)+C$ are also antiderivative of $f(x)$

# integral

## definite integral

$$
∫_a^bf(x)\ dx
=\lim_{n → ∞}\sum_{i=1}^nf(x_i^*)\Delta x
$$

- integrable
- integral sign $∫$
- integrand $f(x)$
- limit of integration
    - lower limit $a$
    - upper limit $b$
- Riemann sum

    $$
    \sum_{i=1}^nf(x_i^*)\Delta x
    $$

### midpoint rule

choose $x^*$ to be the midpoint

### property of definite integral

$$
∫_a^bf(x)\ d(x)=-∫_b^af(x)\ dx
\\[12pt]
∫_a^af(x)\ dx=0
\\[12pt]
∫_a^bf(x)\ d(x)+∫_b^cf(x)\ d(x)
=∫_a^cf(x)\ d(x)
\\[12pt]
f(x)≥0 ⇒ ∫_a^bf(x)\ d(x)≥0
\\[12pt]
f(x)≥g(x) ⇒ ∫_a^bf(x)\ d(x)≥∫_a^bg(x)\ d(x)
\\[12pt]
m≤f(x)≤M ⇒ m(b-a)≤∫_a^bf(x)\ d(x)≤M(b-a)
$$

- linear

## fundamental theorem of calculus

$f$ continuous on $[a,b]$

$$
⇒ g(x)=∫_a^xf(t)\ dt\qquad a≤x≤b
$$

continuous on $[a,b]$ and differentiable on $(a,b)$\
$g'(x)=f(x)$

$F$ is any antiderivative of $f$

$$
⇒ ∫_a^bf(x)\ dx=F(b)-F(a)
$$

## indefinite integral

$$
∫f(x)\ dx
$$

mean

$$
F'(x)=f(x)
$$

### net change theorem

$$
∫_a^bF'(x)\ dx=F(b)-F(a)
$$

## substitution rule

$$
∫v(u(x))\frac{du}{dx}dx
=∫v(u)du
\\[12pt]
∫_a^bv(u(x))\frac{du}{dx}dx
=∫_{u(a)}^{u(b)}v(u)du
$$

$\Leftarrow$ chain rule

### trigonometric integral and trigonometric substitution

from $\sin^2\!x+\cos^2\!x=1$

$$
\sqrt{a-x^2}=\sqrt{a}\cos\theta
\qquad(x=\sqrt{a}\sin\theta,\theta\in \left[
    -\frac{\pi}{2},\frac{\pi}{2}
\right])
\\[12pt]
∫\sin^{2k-1}\!x\cos^n\!x\ dx
=-∫(1-\cos^2\!x)^{k-1}\cos^n\!x\ d(\cos x)
\\[12pt]
∫\sin^m\!x\cos^{2k-1}\!x\ dx
=∫\sin^m\!x(1-\sin^2\!x)^{k-1}\ d(\sin x)
$$

from $\sec^2\!x-\tan^2\!x=1$

$$
\sqrt{x^2-a}=\sqrt{a}\tan\theta
\qquad(x=\sqrt{a}\sec\theta,\theta\in \left[
    0,\frac{\pi}{2}
\right) \cup \left[
    \pi,\frac{3\pi}{2}
\right))
\\[12pt]
∫\tan^m\!x\sec^{2k}\!x\ dx
=∫\tan^m\!x(\tan^2\!x+1)^{k-1}\ d(\tan x)
\\[12pt]
∫\tan^{2k-1}\!x\sec^n\!x\ dx
=∫(\sec^2\!x-1)^{k-1}\sec^{n-1}\!x\ d(\sec x)
$$

$$
∫\tan x\ dx=\ln|\sec x|+C
\\[12pt]
∫\sec x\ dx=\ln|\sec x+\tan x|+C
$$

## rational function integral

$$
\frac{
    a_{1} x^{t}+a_{2} x^{t-1}+\cdots+a_{t+1}
}{
    \left(
        b_{1} x+c_{1}
    \right)^{m_{1}} \ldots\left(
        b_{n} x+c_{n}
    \right)^{m_{n}}\left(
        d_{1} x^{2}+h_{1}
    \right)^{p_{1}} \ldots\left(
        d_{q} x^{2}+h_{q}
    \right)^{p_{q}}
}
\\
=\frac{A_{11}}{b_{1} x+c_{1}}
+\cdots
+\frac{A_{1 m_{1}}}{\left(
    b_{1} x+c_{1}
\right)^{m_{1}}}
+\cdots
+\frac{A_{n 1}}{b_{n} x+c_{n}}
+\cdots
+\frac{A_{n m_{n}}}{\left(
    b_{n} x+c_{n}
\right)^{m_{n}}}
+\frac{C_{11} x+D_{11}}{d_{1} x^{2}+h_{1}}
+\cdots
\\
+\frac{C_{1 p_{1}} x+D_{1 p_{1}}}{\left(
    d_{1} x^{2}+h_{1}
\right)^{p_{1}}}
+\cdots
+\frac{C_{q 1} x+D_{q 1}}{d_{q} x^{2}+h_{q}}
+\cdots
+\frac{C_{q p_{q}} x+D_{q p_{q}}}{\left(
    d_{q} x^{2}+h_{q}
\right)^{p_{q}}}
$$

$$
∫\frac{dx}{x^2+a^2}=\frac{1}{a}\tan^{-1}\left(
    \frac{x}{a}
\right)
\\[12pt]
∫\frac{dx}{x^2-a^2}=\frac{1}{2a}\ln\left|
    \frac{x-a}{x+a}
\right|
$$

## symmetric integral

$$
f(-x)=f(x) ⇒ ∫_{-a}^af(x)\ dx=2∫_0^af(x)\ dx
\\[12pt]
f(-x)=-f(x) ⇒ ∫_{-a}^af(x)\ dx=0
$$

## volume from integral

from $x=a$ to $x=b$,
rotate $y=f(x)$ and $y=g(x)$ about $x$-axis,
volume:

$$
∫_a^bA(x)\ dx
=∫_a^b\pi\left|
    (f(x))^2-(g(x))^2
\right|\ dx
$$

from $x=a$ to $x=b$,
rotate $y=f(x)$ and $y=g(x)$ about $y$-axis,
volume:

$$
∫_a^bl(x)h(x)\ dx
=∫_a^b2\pi x|f(x)-g(x)|\ dx
$$

## arc length from integral

$$
∫_P^Q\ ds
=∫_P^Q\sqrt{(dx)^2+(dy)^2}
\\[12pt]
=∫_a^b\sqrt{1+\left(
    \frac{df}{dx}
\right)^2}\ dx
$$

## surface area from integral

from $x=a$ to $x=b$,
rotate $y=f(x)$ about $y$-axis,
surface area:

$$
∫_a^bl(x)\ d(arc\\_length(x))
\\[12pt]
=∫_a^b2\pi f(x)\sqrt{1+\left(
    \frac{df}{dx}
\right)^2}\ dx
$$

## average of function

$$
f_{ave}=\frac{1}{b-a}∫_a^bf(x)\ dx
$$

### mean value theorem for integral

$f$ continuous $[a,b] ⇒ ∃\ c\in [a,b]$

$$
f(c)=f_{ave}
$$

## integration by part

$$
∫u\ dv=uv-∫v\ du
$$

$\Leftarrow$ power rule

## improper integral

### integral with infinite interval

- $f$ continuous on $[a,∞)$
- $\lim_{t → ∞}∫_a^tf(x)\ dx$ exist

$$
⇒∫_a^∞f(x)\ dx
=\lim_{t → ∞}∫_a^tf(x)\ dx
$$

- opposite for $∫_{-∞}^af(x)\ dx$
- **convergent** if limit exist
    - **divergent** if limit DNE
- both side exist $⇒ ∫_{-∞}^∞f(x)\ dx$ is their sum

### discontinuous integral

- $f$ continuous on $[a,b)$, discontinuous at $b$
- $\lim_{t → b^-}∫_a^tf(x)\ dx$ exist

$$
⇒ ∫_a^bf(x)\ dx
=\lim_{t → b^-}∫_a^tf(x)\ dx
$$

- opposite for when $f$ continuous on $(a,b]$, discontinuous at $a$
- **convergent** if limit exist
    - **divergent** if limit DNE
- both side exist $⇒$ can connect them

### improper integral comparison

$f(x)≥g(x)≥0$, $∫_a^∞f(x)\ dx$ converge\
$⇒ ∫_a^∞g(x)\ dx$ converge
