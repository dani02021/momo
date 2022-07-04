#! /usr/bin/perl -wT

use strict; use warnings;

print "List:";

my @List = (1, 2, 3);
print @List, "\n";

@List = qw/one two three/;

print @List;
