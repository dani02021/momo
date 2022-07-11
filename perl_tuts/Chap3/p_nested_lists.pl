#! /usr/bin/perl -wT

use strict; use warnings;

# No nested lists !?
# Perl removes the nested list, put the elements in one global list
#
my @List = ((1, 2, 3), 4, 5);

print @List;
