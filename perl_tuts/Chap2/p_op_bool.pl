#! /usr/bin/perl

#
# Truth is something that is not 0, empty string, undefined or empty list
#

use strict; use warnings;

print 1 > 0,            "\n";
print 1 > 0 && -1 > 0,  "\n";
print 1 > 0 || -1 > 0,  "\n";
print !(1 > 0),         "\n";
print !10;
