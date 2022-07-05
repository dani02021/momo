#! /usr/bin/perl -wT

use strict; use warnings;

my %hashish = (
    1 => 10,
    2 => 20,
    3 => 30
);

print %hashish, "\n";
print ( (reverse %hashish), "\n");
print %hashish{3}, "\n";
