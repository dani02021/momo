import math
import timeit

class Point:
    def __init__(self, x, y) -> None:
        self.x = x
        self.y = y
        self.disabled = False
    
    def __str__(self):
        return "(" + str(self.x) + ", " + str(self.y) + ")"

# python3 -m timeit -s "from random import randint;from square import isPerfectSquare" -n 100000 "isPerfectSquare(randint(0, 100000))"
# 1.06 nanosec per loop for 100 000 loops with random int [0;100 000)
def isPerfectSquare(n):
    x = n

    if x & 4294967295 == 0:
        x >>= 32
    if x & 65535 == 0:
        x >>= 16
    if x & 255 == 0:
        x >>= 8
    if x & 15 == 0:
        x >>= 4
    if x & 3 == 0:
        x >>= 2
    
    if x & 7 != 1:
        return -1
    
    return math.sqrt(n)

# python3 -m timeit -s "from random import randint;from square import isPerfectSquare1" -n 100000 "isPerfectSquare1(randint(0, 100000))"
# 940 nanosec per loop for 100 000 loops with random int [0;100 000)
def isPerfectSquare1(n):
    nj = n & 0xF

    if nj == 0 or nj == 1 or nj == 4 or nj == 9:
        tst = math.sqrt(n)
        tst = int(tst)
        
        return tst
    
    return -1

if __name__ == "__main__":
    a = int(input())

    points = []
    max = 0

    for x in range(a+1):
        for y in range(a+1):
            if y > x:
                continue
            points.append(Point(x, y))
    
    uniques = set()

    for i in range(len(points)):
        a1 = points[i]

        for z in range(len(points)):
            b = points[z]

            if a1.disabled or b.disabled:
                continue

            if a1.x == b.x or a1.y == b.y:
                continue

            xpos = a1.x - b.x
            ypos = a1.y - b.y
            dist = isPerfectSquare(xpos * xpos + ypos * ypos)

            if dist == -1:
                continue

            dist = int(dist)

            if max < dist:
                max = dist
            
            uniques.add(dist)
        
        a1.disabled = True
    
    print(str(max) + " " + str(len(uniques)))
