#! /usr/bin/perl -wT

use strict; use warnings;

#
# Hashes has NO order!
#

my %GuyAges = (
    'Daniel', 19,
    'Monika', 20, # Don't blame me uwu
    'Angel', 22,  # Hopefully
    'Velko', 24,  # I pray to god
    'Mitko', 24,  # for this to be right
    'Ilko', -1,   # they ded
    'Didi', -1,   # we should accept it :(
);

my %BetterAges = (
    'Daniel'  => 19,
    'Monika'  => 20, # Don't blame me uwu
    'Angel'   => 22, # Hopefully
    'Velko'   => 24, # I pray to god
    'Mitko'   => 24, # for this to be right
    'Ilko'    => -1, # they ded
    'Didi'    => -1, # we should accept it :(
);;

print "%GuyAges\n"; # wtf, can't stringify?
print %GuyAges, "\n"; # Always in random order
