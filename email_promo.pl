#! /usr/bin/perl -wT -l ~/perl5/lib/perl5

use DBI;
use Getopt::Std;
use Email::Sender::Simple qw(sendmail);
use Email::Simple;
use Email::Sender::Transport::SMTP qw();
use Try::Tiny;

use strict; use warnings;

getopt('up');

# print "@ARGV\n";

# Fix for Insecure Env Path
$ENV{ 'PATH'  } = '/bin:/usr/bin:/usr/local/bin';
delete @ENV{ 'IFS', 'CDPATH', 'ENV', 'BASH_ENV'  };

our($opt_u, $opt_p);

try {
    ;
} catch {
    die "Yay error caught!";
};
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

    my $msg = Email::Simple->create(
        header  => [
            From    => 'danielgudjenev@gmail.com',
            To      => $to,
            Subject => 'Hey I just met you'
        ],
        body    => 'Hey yo!'
    );

    my $transport = Email::Sender::Transport::SMTP->new({
            host => 'smtp.gmail.com',
            port => 587,
            sasl_username => 'danielgudjenev@gmail.com',
            sasl_password => 'ynimcicxhgzifbct '
    });

    sendmail(
        $msg,
        $transport
    );

    print "Email Sent yo!\n$msg\n";

    # system("/usr/local/bin/sendEmail -f danielgudjenev\@gmail.com -t @row[1] -s smtp.gmail.com:587 -xu danielgudjenev\@gmail.com -xp ynimcicxhgzifbct -u \"test email\" -m \"$row[2] $row[3]\" > /dev/null");
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
