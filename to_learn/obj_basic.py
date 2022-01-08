class A:
    def setage(self, age):
        print("This wont be called, if the ocject is C !!!")
        # IMPORTANT: Python searches for the first function/attribute match. It is important the order you inherit superclasses
        # TEST: Try to change from inheriting firstly B, then A, to the opposite

class B:
    def setage(self, age):
        self.age = age

class C(B,A):
    def setname(self, name):
        self.name = name

class D():
    def __init__(self, name) -> None: # Initializer
        self.name = name
        self.buddy = None
    
    def __add__(self, name):
        return D(self.name + name)

bob = C()
bob.setname('bob')
bob.setage(12)

alice = D('alice')
alice.height = 160 # We can create new variables
alice_wonder = alice + "_wonder" # Creates a new instance

josh = D('josh')
alice.buddy = josh

print(bob.name)
print(bob.age)
print(alice.name)
print(alice.height)
print(alice_wonder.name)
print(alice.buddy.name)
