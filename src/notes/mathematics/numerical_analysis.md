<!-- toc -->
# Numerical Analysis

# gradient descent

## line search

## gradient descent momentum

## stochastic gradient descent (SGD)

# integration

followed from [Riemann sum](analysis.md#riemann-sum)

$f\in c[a,b]$,
partition evenly into $N$ subinterval

$$
h:=x_i-x_{i-1}=\frac{b-a}{N}\\[12pt]
$$

## first-order method

$$
R_N:=\sum_{i=1}^Nf(x_i^*)(x_i-x_{i-1})=
h\sum_{i=1}^Nf(x_i^*)
$$

$|f'(x)|≤M ⇒$

$$
\left|\int_a^bf(x)\ dx-R_N\right|≤Mh(b-a)
$$

## second-order method

$$
T^i(x):=f(x_{i-1})+f'(x_{i-1})(x_i-x_{i-1})\\[12pt]
T_N:=\sum_{i=1}^N\int_{x_{i-1}}^{x_i}T^i(x)\ dx=
h\sum_{i=1}^Nf(x_{i-1})+\frac{h^2}{2}\sum_{i=1}^Nf'(x_{i-1})
$$

$|f''(x)|≤M ⇒$

$$
\left|\int_a^bf(x)\ dx-T_N\right|≤\frac{Mh^2(b-a)}{6}
$$

## midpoint rule

$$
R_N:=\sum_{i=1}^Nf(\bar x_i)(x_i-x_{i-1})
,\quad
\bar x_i=\frac{x_{i-1}+x_i}{2}
$$

$|f''(x)|≤M ⇒$

$$
\left|\int_a^bf(x)\ dx-R_N\right|≤\frac{Mh^2(b-a)}{24}
$$
