<!-- toc -->
# Complex Sequence and Series

# sequence

## sequence convergence

- $z_n=x_n+iy_n,z=x+iy ⇒$

    $$
    \lim_{n → ∞}z_n=z ⇔ \lim_{n → ∞}x_n=x\text{ and } \lim_{n → ∞}y_n=y
    $$

# series

## series convergence

$∑z_n$ converge to $S$ $⇔$ partial sum $S_N$ converge to $S$

- $z_n=x_n+iy_n,S=X+iY ⇒$

    $$
    ∑z_n=S ⇔ ∑x_n=X\text{ and }∑y_n=Y
    $$

- [divergence test](sequence_series.html#divergence-test)
- [absolute convergence](sequence_series.html#absolute-convergence)

## remainder

$$
\rho_N=S-S_N
$$

- $∑z_n$ converge $⇔ \lim_{N → ∞}\rho_N=0$

## power series

see also [power series](sequence_series.html#power-series)

- $\sum_{n=0}^∞ c_n(z-z_0)^n$ converge to $S(z)$ for $z=z_1≠z_0$\
    $⇒$ absolutely convergent in circle $|z-z_0|<|z_1-z_0|$
    - circle of convergence, biggest such circle
- $S(z)$ is continuous function inside circle of convergence

### power series integration

can integrate term by term within circle of convergence

$$
∫_Cg(z)S(z)\ dz=∑_{n=0}^∞ a_n ∫_Cg(z)(z-z_0)^ndz
$$

- $S(z)$ holomorphic
    <details>
    <summary>
    proof
    </summary>

    let $C$ be any closed contour and set $g(z)=1$

    $$
    ∫_CS(z)\ dz=∑_{n=0}^∞ a_n ∫_C(z-z_0)^ndz=
    ∑_{n=0}^∞ 0=0
    $$

    by Morera's theorem, $S(z)$ is holomorphic
    </details>

- can differentiate $S(z)$ term by term

### Taylor's theorem

$f$ holomorphic in $|z-z_0|<R_0$

$⇒ f$ analytic,

$$
f(z)=∑_{n=0}^∞ a_n(z-z_0)^n,\quad
a_n=\frac{f^{(n)}(z_0)}{n!}
$$

<details>
<summary>proof using Cauchy's integral formula</summary>

when $z_0=0$

$$
f(z)=\frac{1}{2\pi i}∫_C \frac{1}{s-z}f(s)\ ds\\[12pt]=
\frac{1}{2\pi i}∫_C \left(
    ∑_{n=0}^{N-1}\frac{1}{s^{n+1}}z^n+\frac{z^N}{(s-z)s^N}
\right) f(s)\ ds\\[12pt]=
∑_{n=0}^{N-1}z^n\frac{1}{2\pi i}∫_C \frac{f(s)\ ds}{s^{n+1}}+\underbrace{
    \frac{z^N}{2\pi i}∫_C \frac{f(s)\ ds}{(s-z)s^N}
}_{\rho_N}\\[12pt]=
∑_{n=0}^{N-1}z^n \frac{f^{(n)}(0)}{n!}+\rho_N
$$

by the upper bound theorem, for $r:=|z|$,

$$
|\rho_N|=\left(
    \frac{r}{R}
\right)^N \frac{\|f\|_∞ R}{R-r} → 0
$$

as $R → ∞$
</details>

### uniqueness of Taylor series

in $|z-z_0|<R$,
power series $∑_{n=0}^∞ a_n(z-z_0)^n$ converge to $f(z)$

$⇒$ it is *the* Taylor series of $f$ about $z_0$

<details>
<summary>
proof using power series integration and Cauchy's integral formula
</summary>

$$
g(x):=\frac{1}{2\pi i(z-z_0)^{m+1}}\\[12pt]
\underbrace{∫_Cg(z)f(z)\ dz}_ {\begin{align*}=
    &\frac{1}{2\pi i}∫_C \frac{f(z)\ dz}{(z-z_0)^{m+1}}\\[12pt]=
    &\frac{f^{(m)}(z_0)}{m!}
\end{align*}}=\underbrace{∑_{n=0}^∞ a_n∫_C g(z)(z-z_0)^n\ dz}_{\begin{align*}=
    &∑_{n=0}^∞ a_n\frac{1}{2\pi i}∫_C(z-z_0)^{n-m-1}\ dz\\[12pt]=
    &a_m
\end{align*}}
$$
</details>
