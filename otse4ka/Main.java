import java.util.Scanner;
import java.lang.Math;

public class Main {
    public static void main(String[] args) {
        Scanner scan = new Scanner(System.in);
    
        String ar = scan.nextLine();
    
        int n = Integer.parseInt(ar.split(" ")[0]);
        int a = Integer.parseInt(ar.split(" ")[1]);
        int b = Integer.parseInt(ar.split(" ")[2]);
        int c = Integer.parseInt(ar.split(" ")[3]);
    
        int to4ki1[] = new int[(n / a) + 1];
        int to4ki2[] = new int[(n / b) + 1];
    
        if(n > 100000 || a > 100000 ||
            b > 100000 || c > 100000) {
                System.err.println("ERROR: Too large numbers!");
                return;
        }

        // If Gergana starts from 0
        for(int i = 0; i < to4ki1.length; i++) {
            to4ki1[i] = a * i; // Georgi
        }
    
        for(int i = to4ki2.length - 1; i >= 0; i--) {
            to4ki2[i] = n - (b * i);
        }
    
        int count = 0;
        for(int i = 0; i < to4ki1.length; i++) {
            for(int z = 0; z < to4ki2.length; z++) {
                if(Math.abs(to4ki1[i] - to4ki2[z]) == c) {
                    count++;
                }
            }
        }
    
        System.out.println(n - (count * c));
    }
}