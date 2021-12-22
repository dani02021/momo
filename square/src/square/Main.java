package square;

import java.util.HashSet;
import java.util.Scanner;

class Point {
	public int x, y;
	public boolean disabled;
	public Point(int x, int y) {
		this.x = x;
		this.y = y;
	}
}

public class Main {

	public static void main(String[] args) { // 670 - 905 445 with y >= x or 905 445 y > x
		Scanner scan = new Scanner(System.in);
		int a = scan.nextInt(), indexPoint = 0;
		scan.close();
		
		Point[] points = new Point[(a+1)*(a+1)];
		
		for(int x = 0; x <= a; x++) {
			for(int y = 0; y <= a; y++) {
				if(y > x)
					continue;
				points[++indexPoint] = new Point(x, y);
			}
		}
		
		int max = 0;
		HashSet<Integer> uniques = new HashSet<Integer>();
		int index = 0, indexMax = indexPoint*indexPoint; // Cut the iterations by half, point 0 -> point 1 <=> point 1 -> point 0
		
		for(int i = 0; i < indexPoint; i++) {
			Point a1 = points[i];
			
			for(int z = 0; z < indexPoint; z++) {
				Point b = points[z];
				
				if(a1 == null || b == null || a1.disabled || b.disabled)
					continue;
				
				//double percent = (double) ++index / indexMax;
				//if((percent * 100) % 1 == 0)
				//	System.out.println(i + "/" + indexPoint);
				
				if(a1.x == b.x || a1.y == b.y)
					continue;
				
				int xpos = Math.abs(a1.x - b.x);
				int ypos = Math.abs(a1.y - b.y);
				double dist = isPerfectSquare( (int) (xpos * xpos + ypos * ypos));
				
				if(dist == -1D)
					continue;
				
				int distI = (int) dist;
				
				//max -= ((max-distI)&((max-distI)>>31)); - LOL the code below is faster than this line, idk why xd
				if(max < distI)
					max = distI;
				
				uniques.add(distI);
			}
			if(a1 != null)
				a1.disabled = true;
		}
		// Go to all unique vals and get the max
		// Go to all unique vals
		
		System.out.println(max + " " + uniques.size());
	}
	
	boolean[] pre = {
			false, false, false, false, true, false, // 0 - 5
			false, false, false, true, false, // 6 - 10
			false, false, false, false, false, // 11 - 15
			true, false, false, false, false, // 16 - 20
			false, false, false, false, true, // 21 - 25
			false, false, false, false, false, // 26 - 30
			false, false, false, false, false, // 31 - 35
			true, false, false, false, false, // 36 - 40
			false, false, false, false, false, // 41 - 45
			false, false, false, true, false, // 46 - 50
			false, false, false, false, false, // 51 - 55
			false, false, false, false, false, // 56 - 60
			false, false, false, true, false, // 61 - 65
			};
	
	// This works because of Newton-Hensel lemma
	// But idk why it works
	public final static double isPerfectSquare(long n)
	{
		long x = n;
		// Divide out powers of 4 using binary search
	    if((x & 4294967295L) == 0)
	        x >>= 32;
	    if((x & 65535) == 0)
	        x >>= 16;
	    if((x & 255) == 0)
	        x >>= 8;
	    if((x & 15) == 0)
	        x >>= 4;
	    if((x & 3) == 0)
	        x >>= 2;

	    if((x & 7) != 1)
	        return -1D;
		
		return Math.sqrt(n);
	}

}
