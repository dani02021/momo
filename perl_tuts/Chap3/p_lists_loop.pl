#! /usr/bin/perl -wT

use warnings; use strict;

my @array = qw(America Asia Europe Africa);
my $element;

# FOR <ITERATOR> (<ARRAY>) {  <BLOCK> }
for $element (@array) {
    print "$element",        "\n";
}

# If no iterator is given, use $_ -> default scalar

for (@array) {
    print "Element: $_",  "\n"; 
}

for (1 .. 10) {
    print $_, "\n";
}
