import math, sys
from collections import deque

circles = []
points = []

def calcDist(a, b):
    return math.sqrt(pow(a.x - b.x, 2) + pow(a.y - b.y, 2))

class Circle:
    def __init__(self, x, y, r) -> None:
        self.x = x
        self.y = y
        self.r = r
    
    def __str__(self):
        return "(" + str(self.x) + ", " + str(self.y) + ", " + str(self.r) + ")"
    
    def intersect(self, b) -> bool:
        if self == b:
            return False
        
        d = calcDist(self, b)

        if ((d == 0 and self.r == b.r) or (d >= self.r + b.r) or (d <= abs(self.r - b.r))):
            return False
        
        return True

class Point:
    def __init__(self, x, y) -> None:
        self.x = x
        self.y = y
    
    def __str__(self):
        return "(" + str(self.x) + ", " + str(self.y) + ")"

class Graph:
    def __init__(self, v) -> None:
        self.V = v
        self.adj = deque()
        self.dist = [0] * self.V
        self.pred = [0] * self.V

        for i in range(v):
            self.adj.append(deque())
    
    def addEdge(self, v, w) -> None:
        self.adj[points.index(v)].append(w)
    
    def BFS(self, s) -> bool:
        visited = [False] * self.V

        for i in range(self.V):
            self.dist[i] = sys.maxsize
            self.pred[i] = -1
        
        queue = deque()

        visited[points.index(s)] = True
        self.dist[points.index(s)] = 0
        queue.append(s)
        
        while len(queue) != 0:
            s = queue.pop()

            for n in self.adj[points.index(s)]:
                if not visited[points.index(n)]:
                    visited[points.index(n)] = True
                    self.dist[points.index(n)] = self.dist[points.index(s)] + 1
                    self.pred[points.index(n)] = points.index(s)
                    queue.append(n)

                    if n == points[len(points) - 1]:
                        return True
            
        return False

    def printShortestDistance(self, s) -> None:
        if not self.BFS(s):
            print('-1')
            return
        
        path = deque()
        crawl = points[len(points) - 1]
        path.append(crawl)

        while self.pred[points.index(crawl)] != -1:
            path.append(points[self.pred[points.index(crawl)]])
            crawl = points[self.pred[points.index(crawl)]]
        
        print(self.dist[points.index(points[len(points) - 1])])

if __name__ == "__main__":
    n = int(input())

    for i in range(n):
        coords = input()
        coor = coords.split(" ")
        circles.append(Circle(int(coor[0]), int(coor[1]), int(coor[2])))
        points.append(Point(int(coor[0]), int(coor[1])))

    g = Graph(len(points))

    for i in range(len(circles)):
        a = circles[i]
        for z in range(len(circles)):
            b = circles[z]

            if a.intersect(b):
                g.addEdge(points[circles.index(a)], points[circles.index(b)])
        
    g.BFS(points[0])
    g.printShortestDistance(points[0])
