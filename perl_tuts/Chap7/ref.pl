#! /usr/bin/perl5 -wT

use warnings; use strict;

# WARNING
# Array and hash is created with () !!!

my @arr = (10,5,6);

# 1. Anonymous data
# data without a name - reference only
# [] for array and {} for hash
# returns reference !!!
[1,2,3];

my @anon_arr = [1,2,3]; # anon_arr is a reference to the array (1,2,3) !!!

print @anon_arr; # Prints memory address to the array

# 2. Referencing
# Get reference of something is by using \ before the element
# Reference is special type of scalar
# In a hash a reference can be value but can't be a key

print \@arr;

# 3. Dereference
# Put curly braces and type depending on what you expoect to get

print @{\@arr}; # Get reference of array which is scalar and I expect array so I put @ before {}

# You can achieve the same thing without curly brackets!
my $arr_ref = \@arr;
print @$arr_ref;

# Arrow rule
my @array = (68, 101, 114, 111, 117);
my $ref = \@array;
${$ref}[0] = 100;
print "Array is now : @array\n";

# Instead, use
my @array = (68, 101, 114, 111, 117);
my $ref = \@array;
$ref->[0] = 100;
print "Array is now : @array\n";
