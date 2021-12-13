import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Scanner;

import math, sys
from collections import deque

circles = []
points = []

def calcDist(a, b):
    return math.sqrt(pow(a.x - b.x, 2) + pow(a.y - b.y, 2))

class Circle:
    def __init__(self, x, y, r):
        self.x = x
        self.y = y
        self.r = r
    
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

class Graph:
    def __init__(self, v) -> None:
        self.V = v
        self.adj = deque()
        self.dist = [0] * self.V
        self.pred = [0] * self.V

        for i in range(v):
            self.adj.append(deque())
    
    def addEdge(self, v, w):
        self.adj[points.index(v)].add(w)
    
    def BFS(self, s) -> bool:
        visited = [False] * self.V

        for i in range(self.V):
            self.dist[i] = sys.maxsize()
            self.pred[i] = -1
        
        queue = deque()

        visited[points.index(s)] = True
        self.dist[points.index(s)] = 0
        queue.append(s)

        while len(queue) != 0:
            s = queue.pop()

            for n in s:
                if not visited[points.index(s)]:
                    visited[points.index(s)] = True
                    self.dist[points.index(s)] = self.dist[points.index(s)] + 1
                    self.pred[points.index(s)] = points.index(s)
                    queue.append(n)

                    if n == points.get(len(points) - 1):
                        return True
            
        return False

    def printShortestDistance(self, s):
        if not self.BFS(s):
            print('-1')
            return
        
        path = deque()
        crawl = points.get(len(points) - 1)
        path.append(crawl)

        while self.pred[points.index(crawl)] != -1:
            path.append(points.get(self.pred[points.index(crawl)]))
            crawl = points.get(self.pred[points.index(crawl)])
        
        print(self.dist[points.index(points.get(len(points) - 1))])

public class Main {

	public static void main(String[] args) {
		Scanner scan = new Scanner(System.in);

		int n = Integer.parseInt(scan.nextLine());
        // Get x y r of n circles
		for (int i = 0; i < n; i++) {
			String cords = scan.nextLine();
			String[] cor = cords.split(" ");
			circles.add(new Circle(Integer.parseInt(cor[0]), Integer.parseInt(cor[1]), Integer.parseInt(cor[2])));
			points.add(new Point(Integer.parseInt(cor[0]), Integer.parseInt(cor[1])));
		}

		scan.close();

		Graph g = new Graph(points.size());

        // Connect the points
		for (int i = 0; i < circles.size(); i++) {
			Circle a = circles.get(i);
			for (int z = 0; z < circles.size(); z++) {
				Circle b = circles.get(z);

				if (a.intersect(b)) {
					g.addEdge(points.get(circles.index(a)), points.get(circles.index(b)));
				}
			}
		}

        // Return the edges = shortest path
		g.BFS(points.get(0));
		g.printShortestDistance(points.get(0));
	}
}
