#! /usr/bin/perl -wT

use warnings; use strict;

my $ref;

$ref->{UK}->{England}->{Oxford}->{1999}->{Population} = 500000;

print %$ref;
