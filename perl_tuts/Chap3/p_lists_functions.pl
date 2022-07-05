#! /usr/bin/perl -wT

my @List = (1 .. 5);

print reverse "@List\n";

for (reverse @List) {
    print "$_..\n";
}

my @List1 = (@List, 6 .. 9);

$lastElemInArray = pop @List1; # Get last elem + removes from list

# push <array>, <elements>
push @List1, (9, 10);

print "@List1\n";

# shift and unshift are doing the same but in the start of the array
# unshift - add
# shift - removes

unshift @List1, 0;

print "@List1\n";

my $firstElem = shift @List1;

# Sort - default by ASCII code

push @List1, -1;

my @sorted = sort @List1;

print "@sorted\n"; # Sadly bad ;(

# Lets sort it by custom rule

@sorted = sort { $a <=> $b } @sorted;

print "@sorted\n" # Gud ;)
