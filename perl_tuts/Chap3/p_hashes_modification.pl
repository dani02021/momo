#! /usr/bin/perl -wT

use strict; use warnings;

my %hashish = (
    1 => 10,
    2 => 20,
    3 => 30
);

$hashish{4} = 40;
$hashish{5} = 50;

delete $hashish{5};

for (keys %hashish) {
    print "$_\n";
}
