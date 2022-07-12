#! /usr/bin/perl -wT

use DBI;
use Getopt::Std;
use MIME::Lite;

use strict; use warnings;

getopt('up');

# print "@ARGV\n";

# Fix for Insecure Env Path
$ENV{ 'PATH'  } = '/bin:/usr/bin:/usr/local/bin';
delete @ENV{ 'IFS', 'CDPATH', 'ENV', 'BASH_ENV'  };

our($opt_u, $opt_p);

print "$opt_u$opt_p\n";

my $driver = "Pg";
my $database = "ecommercenodejs";
my $dsn = "DBI:$driver:dbname=$database;host=localhost;port=5432";
my $user = defined($opt_u) ? $opt_u : die "No -u argument supplied!";
my $pass = defined($opt_p) ? $opt_p : die "No -p argument supplied!";

my $dbh = DBI->connect($dsn, $user, $pass, { RaiseError => 1 })
    or die DBI::errstr;

my $stmt = q(
            SELECT
                username, email, promotions.name, token
            FROM user_vouchers
            JOIN users          ON user_vouchers."userId"  = users.id
            JOIN vouchers       ON "voucherId"             = vouchers.id
                JOIN promotions ON "promotionId"           = promotions.id
            WHERE
                    "emailSend"      = false
                AND "emailConfirmed" = true
                AND active           = false
                AND NOW() BETWEEN   promotions."startDate"
                              AND   promotions."endDate";
            );

my $sth = $dbh->prepare( $stmt  );
my $rv = $sth->execute() or die $DBI::errstr;

print $DBI::errstr if $rv < 0;

while (my @row = $sth->fetchrow_array()) {
    print "@row\n";
    
    my $to = $row[1];
    my $subject = 'Test E-Mail';
    my $promotion = $row[2];
    my $token = $row[3];
    my $message = "Promo: $promotion and your token is: $token";

    $msg = MIME::Lite->new(
        From => 'danielgudjenev@gmail.com',
        To => $to,
        Subject => $subject
        Data => $message
    );

    $msg->send('smtp', 'smtp.gmail.com', AuthUser=>'danielgudjenev@gmail.com', AuthPass=>'ynimcicxhgzifbct');

    print "Email Sent yo!\n$msg\n";

    system("/usr/local/bin/sendEmail -f danielgudjenev\@gmail.com -t @row[1] -s smtp.gmail.com:587 -xu danielgudjenev\@gmail.com -xp ynimcicxhgzifbct -u \"test email\" -m \"$row[2] $row[3]\" > /dev/null");
    print "$?\n";
}

my $to = 'akea@abv.bg';
my $subject = 'Test Email';
my $message = 'This is test email sent by Perl Script';



print "$?\n";

if ($? == 0) {
    print "Email Sent Successfully\n";
} else {
    print "Email is not sent!\n";
}
