#! /usr/bin/perl

use strict; use warnings;

print 2 * 5, "\n";
# print (2 * 5) * 10; BAD -> give warning, print does not know what to print
print ((2 * 5) * 10, "\n");
print 2**8, "\n";
print -2**8, "\n"; # WARN: - unary operator is 'runned' after the pow operation...wtf perl!?
print ((-2)**8, "\n");
print 15 / 6, "\n";
print 15 % 6, "\n";
