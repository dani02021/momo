import java.util.ArrayList;
import java.util.Arrays;
import java.util.Scanner;

public class Main {

    public static char[][] plane;
    public static ArrayList<Character> objs;
    public static void main(String[] args) {
        Scanner scan = new Scanner(System.in);
        int n = scan.nextInt();
        
        scan.nextLine(); // java...

        plane = new char[n*n][n*n];

        objs = new ArrayList<Character>();

        for (int i = 0; i < n*n; i++) {
            String obj = scan.nextLine();
            
            String[] objSplit = obj.split(" ");
            for (int a = 0; a < n*n; a++) {
                char ch = objSplit[a].toCharArray()[0];
                
                if (ch != '0' && !objs.contains(ch))
                    objs.add(ch);

                plane[a][i] = ch;
            }
        }

        for(int i=0; i<plane.length; i++) {
            for(int j=0; j<plane[i].length; j++) {
                int iArr = 0;

                if (plane[j][i] == '0') {
                    while (true) {
                        if (iArr == objs.size()) {
                            while(true) {
                                plane[j][i] = '0';

                                int[] locs = moveBack(j, i);
    
                                j = locs[0];
                                i = locs[1];

                                // System.out.println("move back " + j + " " + i);

                                iArr = objs.indexOf(plane[j][i]) + 1;

                                if (iArr != objs.size())
                                    break;
                            }
                        }
    
                        plane[j][i] = objs.get(iArr);
    
                        if (!hasViolation(j, i, n))
                            break;
                        
                        iArr++;
                    }
                }

                // System.out.println("Values at arr["+j+"]["+i+"] is "+plane[j][i]);
            }
        }

        System.out.println();

        for(int i=0; i<plane.length; i++) {
            for(int j=0; j<plane[i].length; j++) {
                System.out.print(plane[j][i] + " ");
            }
            System.out.println();
        }

        scan.close();
    }

    public static int[] moveBack(int j, int i) {
        if (j == 0) {
            i--;
            j = plane[i].length - 1;
        } else j--;

        return new int[] {j, i};
    }

    // i = col j = row
    public static boolean hasViolation(int j, int i, int n) {
        char ch = plane[j][i];

        if (ch == '0')
            return false;

        // Only element on the whole row
        for (int j1 = 0; j1 < plane[i].length; j1++) {
            if (j == j1)
                continue;
            
            char ch1 = plane[j1][i];

            if (ch == ch1)
                return true;
        }

        // Only element on the whole column
        for (int i1 = 0; i1 < plane.length; i1++) {
            if (i == i1)
                continue;
            
            char ch1 = plane[j][i1];

            if (ch == ch1)
                return true;
        }

        // Only element on the sub-block
        int subblockrow = i / n; // [0-1) is first row
        int subblockcol = j / n; // [0-1) is first col

        int iEnd = subblockrow * n + (n - 1);
        int jEnd = subblockcol * n + (n - 1);

        for(int iBlock = subblockrow * n; iBlock <= iEnd; iBlock++) {
            for(int jBlock = subblockcol * n; jBlock <= jEnd; jBlock++) {
                if (i == iBlock || j == jBlock)
                    continue;
                
                char chBlock = plane[jBlock][iBlock];

                if (ch == chBlock)
                    return true;
                
                // System.out.println("Values at arr2["+jBlock+"]["+iBlock+"] is "+plane[jBlock][iBlock]);
            }
        }

        return false;
    }
}