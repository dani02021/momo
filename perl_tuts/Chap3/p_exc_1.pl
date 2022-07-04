#! /usr/bin/perl -wT

use warnings use strict;

# ($a, $b, $c) = (1, 2);  # Throw error on strict, variable is created, just not used
($a, $b) = (1, 2, 3);   # Does not throw error on strict, value is created, just not used

print "$a\n";
