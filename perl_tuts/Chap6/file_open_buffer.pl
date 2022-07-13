#! /usr/bin/perl5 -wT

$| = 1;

for( 1...20 ) {
    print '.';
    sleep 1;
}
print "\n";

# This WONT WORK as expected
# The OS waits for 20 seconds and then print all dots
# because the OS buffers the output in memory
# To fix SET $| to 1 which disables buffering
