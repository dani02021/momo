package qgodi;

import java.util.Arrays;
import java.util.Scanner;

public class Main {

	public static void main(String[] args) {
		Scanner scan = new Scanner(System.in);

		String fr = scan.nextLine();

		int k = Integer.parseInt(fr.split(" ")[0]);
		int l = Integer.parseInt(fr.split(" ")[1]);
		int r = Integer.parseInt(fr.split(" ")[2]);

		int[][] qgodi = new int[k][l];

		String gnila1S = scan.nextLine();
		String gnila2S = scan.nextLine();

		if(gnila2S != "") {
			qgodi[k - Integer.parseInt(gnila2S.split(" ")[0])]
					[Integer.parseInt(gnila2S.split(" ")[1]) - 1] = 1;
		}

		qgodi[k - Integer.parseInt(gnila1S.split(" ")[0])]
				[Integer.parseInt(gnila1S.split(" ")[1]) - 1] = 1;

		System.out.println(Arrays.deepToString(qgodi));

		for(int i = 1; i <= r; i++) {
			for(int row = 0; row < k; row++) {
				for(int col = 0; col < l; col++) {
					if(qgodi[row][col] == i) {
						if(row > 0) {
							if(qgodi[row - 1][col] == 0)
								qgodi[row - 1][col] = i+1;
						}
						if(row < k-1) {
							if(qgodi[row + 1][col] == 0)
								qgodi[row + 1][col] = i+1;
						}
						if(col > 0) {
							if(qgodi[row][col - 1] == 0)
								qgodi[row][col - 1] = i+1;
						}
						if(col < l-1) {
							if(qgodi[row][col + 1] == 0)
								qgodi[row][col + 1] = i+1;
						}
					}
				}
			}
			System.out.println(Arrays.deepToString(qgodi));
		}

		// Get result
		int count = 0;

		for(int row = 0; row < k; row++) {
			for(int col = 0; col < l; col++) {
				if(qgodi[row][col] == 0)
					count++;
			}
		}

		System.out.println(Arrays.deepToString(qgodi));
		System.out.println(count);

		scan.close();
	}

}