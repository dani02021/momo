import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Scanner;

class Circle {
	public int x, y, r;

	public Circle(int x, int y, int r) {
		this.x = x;
		this.y = y;
		this.r = r;
	}

	@Override
	public String toString() {
		return "(" + x + ", " + y + ", " + r + ")";
	}

	// Intersect at two points
	public boolean intersect(Circle b) {
		if (this == b)
			return false;

		double d = Main.calcDist(this, b);

		if ((d == 0 && r == b.r) || (d >= r + b.r) || (d <= Math.abs(r - b.r)))
			return false;

		System.out.println("INTERSECT: " + this + " " + b + " " + Math.abs(r - b.r) + " " + d);
		return true;
	}
}

class Point {
	public int x, y;

	public Point(int x, int y) {
		this.x = x;
		this.y = y;
	}

	@Override
	public String toString() {
		return "(" + x + ", " + y + ")";
	}
}

class Graph {
	private int V; // No. of vertices
	private LinkedList<Point> adj[]; // Adjacency Lists
	int dist[];
	int pred[];

	// Constructor
	public Graph(int v) {
		V = v;
		adj = new LinkedList[v];
		dist = new int[V];
		pred = new int[V];
		for (int i = 0; i < v; ++i)
			adj[i] = new LinkedList<Point>();
	}

	// Function to add an edge into the graph
	public void addEdge(Point v, Point w) {
		adj[Main.points.indexOf(v)].add(w);
	}

	// prints BFS traversal from a given source s
	public boolean BFS(Point s) {
		// Mark all the vertices as not visited
		boolean visited[] = new boolean[V];

		for (int i = 0; i < V; i++) {
			dist[i] = Integer.MAX_VALUE;
			pred[i] = -1;
		}

		// Create a queue for BFS
		LinkedList<Point> queue = new LinkedList<>();

		// Mark the current node as visited and enqueue it
		visited[Main.points.indexOf(s)] = true;
		dist[Main.points.indexOf(s)] = 0;
		queue.add(s);

		while (queue.size() != 0) {
			s = queue.poll();

			// Get all adjacent vertices of the dequeued vertex s
			// If a adjacent has not been visited, then mark it
			// visited and enqueue it
			Iterator<Point> i = adj[Main.points.indexOf(s)].listIterator();
			while (i.hasNext()) {
				Point n = i.next();
				if (!visited[Main.points.indexOf(n)]) {
					visited[Main.points.indexOf(n)] = true;
					dist[Main.points.indexOf(n)] = dist[Main.points.indexOf(s)] + 1;
					pred[Main.points.indexOf(n)] = Main.points.indexOf(s);
					queue.add(n);

					if (n == Main.points.get(Main.points.size() - 1))
						return true;
				}
			}
		}

		return false;
	}

	public void printShortestDistance(Point s) {
		if (!BFS(s)) {
			System.out.println("-1");
			return;
		}

		// LinkedList to store path
		LinkedList<Point> path = new LinkedList<>();
		Point crawl = Main.points.get(Main.points.size() - 1);
		path.add(crawl);
		while (pred[Main.points.indexOf(crawl)] != -1) {
			path.add(Main.points.get(pred[Main.points.indexOf(crawl)]));
			crawl = Main.points.get(pred[Main.points.indexOf(crawl)]);
		}

		// Print distance
		System.out.println(dist[Main.points.indexOf(Main.points.get(Main.points.size() - 1))]);

		// Print path
		/*
		 * System.out.println("Path is ::");
		 * for (int i = path.size() - 1; i >= 0; i--) {
		 *	System.out.print(path.get(i) + " ");
		 * }
		 */
	}
}

public class Main {
	static ArrayList<Circle> circles = new ArrayList<>();
	static ArrayList<Point> points = new ArrayList<>();

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
					g.addEdge(points.get(circles.indexOf(a)), points.get(circles.indexOf(b)));
				}
			}
		}

        // Return the edges = shortest path
		g.BFS(points.get(0));
		g.printShortestDistance(points.get(0));
	}

    // Euclidean distance
	public static double calcDist(Circle a, Circle b) {
		return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
	}
}
