from math import exp, log, sqrt
# Every function can be treated as "object" and vice versa. They are called first-class objects

# 1. Function passed to another function
def apply_func(x, f):
    return f(x)
def apply_funcs(x, fs):
    result = []
    for f in fs:
        result.append(f(x))
    # OR [f(x) for f in fs]
    return result


print(apply_func(-10, abs)) # IMPORTANT: Without brackets ()
print(apply_funcs(10, [log, sqrt])) # IMPORTANT: Without brackets ()

# 2. Function as variable
i = exp

print(i(20))

# 3. Objects as functions
# init is called on initialization, then call -> so the class behaves like function
class Printer:
  
  def __init__(self, s):
    self.string = s
    
  def __call__(self):
    print(self.string)

s1 = Printer('Hello')