#! /usr/bin/perl

#
# String compare operators (based on ASCII code value) are:
# gt -> greater, ge -> greater or equal,
# lt -> less, le -> less or equal,
# eq -> equal, ne -> not equal
# cmp -> ?
#

use strict; use warnings;

print "abc" . "def",                      "\n";
print "abc" x3,                           "\n";
print "Ba", "na" x(4*3),                  "\n";
print "30" > "10",                        "\n";
print "ASCII value of a is: ", ord('a'),  "\n";
print "a" gt "A",                         "\n";
