#! /usr/bin/perl -wT

use warnings; use strict;

print "Contents of the current directory:\n";

opendir DH, "." or die "Couldn't open the current directory: $!";

while ($_ = readdir(DH)) { # Get files in the dir
    next if $_ eq "." or $_ eq "..";
    print $_, " " x (30-length($_));
    print "d" if -d $_;
    print "r" if -r _;
    print "w" if -w _;
    print "x" if -x _;
    print "o" if -o _;
    print "\t";
    print -s _ if -r _ and -f _;
    print "\n";
}

# INFO:
# _ IS A SPECIAL VARIABLE
# PERL IS GETTING FILE STATS JUST ONCE
# AND SAVING THEM IN _;
# SO INSTEAD OF GETTING THE FILE STATS AGAIN AND
# AGAIN, JUST USE THE CACHED ONES
