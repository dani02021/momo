#! /usr/bin/perl -wT

use strict; use warnings;

my %currency = (
    'euro' => .5,
    'dollar' => .63,
    'lev' => 1
);

my ($money, $curr);

print "Enter your money in bgn:", "\n";
$money = <STDIN>;

print "Enter currency:", "\n";
$curr = <STDIN>;

# Remove whitespace and new lines
chomp($money, $curr);

my $rate = $currency{$curr};

# unless = if not
die "Unknown currency" unless defined($rate);

print "Your money converted is: ", $currency{$curr} * $money, " ", $curr, "\n";
