package raft;

import java.util.Arrays;
import java.util.Scanner;

public class Main {

	public static void main(String[] args) {
		Scanner scan = new Scanner(System.in);
		
		String[] str1 = scan.nextLine().split(" ");
		String[] str2 = scan.nextLine().split(" ");
		
		scan.close();
		
		int n = Integer.parseInt(str1[0]);
		int k = Integer.parseInt(str1[1]);
		
		int[] a = new int[str2.length];
		
		for(int i = 0; i < str2.length; i++) {
			a[i] = Integer.parseInt(str2[i]);
		}
		
		if(n != a.length) {
			System.out.println("Error");
			return;
		}
		
		if(a.length < k) {
			System.out.println("Error: Elements count is smaller than courses!");
			return;
		}
		
		Arrays.sort(a);
		
		int capacity = a[a.length / 2];
		
		int j = calcCourses(a, capacity);
		
		if(j == -1 || j >= k) {
			while(true) {
				j = calcCourses(a, capacity);
				
				if(j == k) {
					break;
				}
				
				capacity++;
			}
		} else if(j < k) {
			while(true) {
				j = calcCourses(a, capacity);
				
				if(j > k) {
					capacity++;
					break;
				}
				
				capacity--;
			}
		}
		
		System.out.println(capacity);
	}
	
	/*
	 * Calculate courses needed based on boat capacity
	 */
	public static int calcCourses(int a[], int capacity) {
		int kk = 0;
		
		int sum = 0;
		
		int b[] = Arrays.copyOf(a, a.length);
		
		while(true) {
			for(int i = b.length-1; i>=0; i--) {
				int num = b[i];
				if(capacity < num) {
					// Capacity is too low
					return -1;
				}
				sum += num;
				if(sum > capacity)
					sum -= num;
				else {
					b[i] = 0;
				}
			}
			
			if(sum == 0)
				break;
			else {
				sum = 0;
				kk++;
			}
		}
		return kk;
	}
}