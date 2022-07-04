#! /usr/bin/perl

use strict; use warnings;

print "text",   "\n";
print 'text',   "\n";
print qq(text), '\n';
print qq#text#, "\n";
print <<EOF;
text
EOF
print 'im ded';
