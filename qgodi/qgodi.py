
txt = input()
k = int(txt.split(" ")[0])
l = int(txt.split(" ")[1])
r = int(txt.split(" ")[2])

qgodi = [[0 for col in range(l)] for row in range(k)]

gnila1S = input()
qgodi[k - int(gnila1S.split(" ")[0])][int(gnila1S.split(" ")[1]) - 1] = 1

gnila2S = input()
if gnila2S:
    qgodi[k - int(gnila2S.split(" ")[0])][int(gnila2S.split(" ")[1]) - 1] = 1

for i in range(1, r+1):
    for row in range(k):
        for col in range(l):
            if qgodi[row][col] == i:
                if row > 0:
                    if not qgodi[row - 1][col]:
                        qgodi[row - 1][col] = i + 1
                if row < k-1:
                    if not qgodi[row + 1][col]:
                        qgodi[row + 1][col] = i + 1
                if col > 0:
                    if not qgodi[row][col - 1]:
                        qgodi[row][col - 1] = i + 1
                if col < l-1:
                    if not qgodi[row][col+ 1]:
                        qgodi[row][col + 1] = i + 1

count = 0

for row in range(k):
    for col in range(l):
        if qgodi[row][col] == 0:
            count = count + 1

print(count)