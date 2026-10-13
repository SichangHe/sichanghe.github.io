import re,sys
f,p=sys.argv[1],sys.argv[2]
b=int(sys.argv[3]) if len(sys.argv)>3 else 200
a=int(sys.argv[4]) if len(sys.argv)>4 else 400
n=int(sys.argv[5]) if len(sys.argv)>5 else 3
t=open(f"{D}/cx_metrics/joined/j_{f}.txt".replace("{D}",sys.argv[0].rsplit('/tools',1)[0])).read()
for i,m in enumerate(re.finditer(p,t,re.I)):
    if i>=n:break
    print("["+str(m.start())+"]",t[max(0,m.start()-b):m.end()+a],"\n--")
