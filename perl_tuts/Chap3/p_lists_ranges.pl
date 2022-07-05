#! /usr/bin/perl -wT

use strict; use warnings;

print ( (1 .. 10), "\n"); # Gives list from 1 to 10 included

my @List = (0, -1, -2, -3, -4);

print ( @List[1 .. 3], "\n" );
