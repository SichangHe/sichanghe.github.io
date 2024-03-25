let a = ["a"];
for (; ;) {
    let b = ["a"];
    a.push(b);
    a = b;
}
