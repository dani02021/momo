"""
    1. Read from file as string
    2. Write to file as string
    3. Write to file as binary
    4. Append a list to file
    5. Write object to a file
"""
import pickle

def readf():
    with open('to_learn/sample.txt', 'r') as f:
        print(f.read()) # read() reads all the file, readLine() reads by line, readLines() -> iterator

def writefs():
    with open('to_learn/sample.txt', 'w') as f:
        f.write('This is a \n')
        f.write('sample text!\n')

def writefb():
    with open('to_learn/sample.txt', 'wb') as f:
        f.write(b'255')

def append():
    with open('to_learn/sample.txt', 'a') as f:
        f.write(str([1,2,3,'4']))

def writeobj():
    with open('to_learn/sample.txt', 'wb') as f:
        pickle.dump({'a': 1, 'b': 2}, f)

def readobj():
    with open('to_learn/sample.txt', 'rb') as f:
        print(pickle.load(f))

append()
readf()