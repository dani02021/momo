import sys
import numpy

ar = input()
n = int(ar.split(" ")[0])
a = int(ar.split(" ")[1])
b = int(ar.split(" ")[2])
c = int(ar.split(" ")[3])

if n > 100_000 or a > 100_000 or \
    b > 100_000 or c > 100_000:
    print('Error: Too large numbers')
    sys.exit()

to4ki1 = numpy.fromiter((a*i for i in range(int(n/a) + 1)), numpy.int32)
to4ki2 = numpy.fromiter((n-(b*i) for i in range(int(n/b), -1, -1)), numpy.int32)

count = 0

for x in to4ki1:
    for y in to4ki2:
        if abs(x - y) == c:
            count = count + 1

print(n - (count * c))
