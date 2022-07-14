#! /usr/bin/perl5 -wT

use strict; use warnings;

# FH -> File handler
# $! -> Special var in Perl for storing last error

open FH, '<', 'output.txt' or die $!;

print FH "this is text\n";

# Read from file
# <> -> Diamond/Readline operator
# Reads line by line

while(<FH>) {
    print $_;
}

# <ARGV> = <> !!!
# while (<>) { ... }

# File lines to array
my @lines = <FH>;

# Chomp and Diamon operator uses line separator variable
# $/ -> by defaut is \n but can be changed

$/ = ' ';

while (<FH>) {
    print $_;
}

# WARB: Setting $/ to undef is gonna read the whole file

close FH;
