#! /usr/bin/perl -wT

use strict; use warnings;

# for = foreach

for (1 .. 10) {
    print $_, "\n";
}

print ($_, "\n") for (-10 .. 0);

# Infinity loop
while (<STDIN>) {  }

my $false = 0;

# until = while not

until ($false) {  }

# break -> last
# continue -> next
# redo -> start this iteration again
# goto -> goto label
# labels for while, until and for
# labels usually are UPEPRCASE
# OUTER:
# while (1) {
#   while (1) {
#   break OUTER;
#   }
# }
