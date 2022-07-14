#! /usr/bin/perl -wT

use strict; use warnings;

my $text = 'Search here yo!';

# Use !~ for not found
# /$pattern/ -> use var in regex
# /\Qyo+/ -> \Q - Disables + - * etc special meanings
# //ig -> i - Ignore case; g -> Search globally
# Custom Delimeters
# Replacing from regex is called substitude and its done with
# s/// instead of just searching //
# Instead of s/// You can use s() or something else just like in q() for strings

if ($text =~ /yo/) {
    print "FOUND\n";
} else {
    print "NOT FOUND ;(\n";
}

# Substitution

$text =~ s/yo/brat/;

# Just s/yo/brat/ works for $_ variable

print $text, "\n";

# Split

my $toSpl = 'kake:sake:lake:make:jake';

my @Spl = split /:/, $toSpl; # Split $toSpl if arg not given use $_

# Join the elements using different delimeter

my $joined = join ';', @Spl;

# Transliteration
# Replace character with another one

tr/123456/abcdef/; # Replace 1 with a, 2 with b and so on from variable $!

# INFO: You can put comments in regex lol
