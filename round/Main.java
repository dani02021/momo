import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Scanner;

public class Main {
    class Circle {
        public int x, y, r;
        public Circle(int x, int y, int r) {
            this.x = x;
            this.y = y;
            this.r = r;
        }

        // Intersect at two points
        public boolean intersect(Circle b) {
            if(this == b)
                return false;
            
            double d = calcDist(this, b);

            if(d == 0 && r == b.r)
                return false;
            if(d > r + b.r)
                return false;
            if(d <= Math.abs(r - b.r))
                return false;
            
            return true;
        }
    }

    class Point {
        public int x, y;
        public Point(int x, int y) {
            this.x = x;
            this.y = y;
        }
    }

    class Graph {
    private int V;   // No. of vertices
    private LinkedList<Point> adj[]; //Adjacency Lists
 
    // Constructor
    public Graph(int v) {
        V = v;
        adj = new LinkedList[v];
        for (int i=0; i<v; ++i)
            adj[i] = new LinkedList();
    }
 
    // Function to add an edge into the graph
    public void addEdge(Point v,Point w) {
        adj[points.indexOf(v)].add(w);
    }
 
    // prints BFS traversal from a given source s
    public void BFS(Point s) {
        // Mark all the vertices as not visited(By default
        // set as false)
        boolean visited[] = new boolean[V];
 
        // Create a queue for BFS
        LinkedList<Point> queue = new LinkedList<Point>();
 
        // Mark the current node as visited and enqueue it
        visited[points.indexOf(s)]=true;
        queue.add(s);
 
        while (queue.size() != 0)
        {
            // Dequeue a vertex from queue and print it
            s = queue.poll();
            System.out.print(s+" ");
 
            // Get all adjacent vertices of the dequeued vertex s
            // If a adjacent has not been visited, then mark it
            // visited and enqueue it
            Iterator<Point> i = adj[points.indexOf(s)].listIterator();
            while (i.hasNext())
            {
                Point n = i.next();
                if (!visited[points.indexOf(n)])
                {
                    visited[points.indexOf(n)] = true;
                    queue.add(n);
                }
            }
        }
    }
    }

    static ArrayList<Circle> circles = new ArrayList<Circle>();
    static ArrayList<Point> points = new ArrayList<Point>();

    public static void main(String[] args) {
        Scanner scan = new Scanner(System.in);

        int n = Integer.parseInt(scan.nextLine()); // n circles
        for(int i = 0; i < n; i++) {
            String cords = scan.nextLine();
            String[] cor = cords.split(" ");
            circles.add(new Circle(Integer.parseInt(cor[0]), Integer.parseInt(cor[1]), Integer.parseInt(cor[2])));
            points.add(new Point(Integer.parseInt(cor[0]), Integer.parseInt(cor[1])));
        }
        scan.close();

        Graph g = new Graph(points.size());

        for(int i = 0; i < circles.size(); i++) {
            Circle a = circles.get(i);
            for(int z = 0; z < circles.size(); z++) {
                Circle b = circles.get(z);

                if(a.intersect(b)) {
                    g.addEdge(circles.indexOf(a), points.get(b));
                    g.addEdge(circles.indexOf(b), points.get(a));
                }
            }
        }

        g.BFS(points.get(0));
    }

    public static double calcDist(Circle a, Circle b) {
        return Math.sqrt(Math.pow(a.x-b.x, 2) + Math.pow(a.y-b.y, 2));
    }
}
