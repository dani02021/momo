#! /usr/bin/perl -wT

use strict; use warnings;

my @List = ('jan', 'feb', 'mar', 'apr', 'jun', 'jul');

print $List[0], "\n";
print $List[0,1], "\n";
print $List[(1,2)], "\n";
print $List[-1], "\n";
