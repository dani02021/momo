import sys


def calcCourses(a, capacity):

    kk = 0
    sum = 0

    b = a.copy()

    while True:
        for i in range(len(b) - 1, 0, -1):
            num = b[i]
            if capacity < num:
                # Capacity is too low
                return -1
            
            sum += num
            if sum > capacity:
                sum -= num
            else:
                b[i] = 0
		
        if(sum == 0):
            break
        else:
            sum = 0
            kk+=1
        
    return kk

str1 = input().split(" ")
str2 = input().split(" ")
n = int(str1[0])
k = int(str1[1])
a = []

for i in range(len(str2)):
	a.append(int(str2[i]))

if n != len(a):
	print("Error")
	sys.exit()

if len(a) < k:
	print("Error: Elements count is smaller than courses!")
	sys.exit()

a.sort()
		
capacity = a[int(len(a) / 2)]

j = calcCourses(a, capacity)

if j == -1 or j >= k:
    while(True):
        j = calcCourses(a, capacity)
        
        if(j == k):
            break
        capacity+=1

elif j < k:
    while(True):
        j = calcCourses(a, capacity)
        
        if j > k:
            capacity+=1
            break

        capacity-=1

print(capacity)