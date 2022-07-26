#! /usr/bin/perl -wT

use DBI;
use Getopt::Std;
use Email::Sender::Simple qw(sendmail);
use Email::Simple;
use Email::Sender::Transport::SMTP::Persistent qw();
use Try::Tiny;

use strict; use warnings;

getopt('up');

# print "@ARGV\n";

my ($opt_u, $opt_p);
my $dbh;

#
# Email statuses
# 0 -> Exist
# 1 -> Email sent
# 2 -> Activated
# 3 -> Used
#

try {
    my $driver = "Pg";
    my $database = "ecommercenodejs";
    my $dsn = "DBI:$driver:dbname=$database;host=localhost;port=5432";
    my $user = defined($opt_u) ? $opt_u : die "No -u argument supplied!";
    my $pass = defined($opt_p) ? $opt_p : die "No -p argument supplied!";

    $dbh = DBI->connect($dsn, $user, $pass, { RaiseError => 1 }) or die DBI::errstr;

    # Connect to G-Mail
    my $transport = Email::Sender::Transport::SMTP::Persistent->new({
            host => 'smtp.gmail.com',
            port => 465,
            ssl => 1,
            sasl_username => 'danielgudjenev@gmail.com',
            sasl_password => 'ynimcicxhgzifbct '
    });
    
    my $stmt = q(
            SELECT
                user_vouchers.id    AS id,
                users.username      AS username,
                users.email         AS email,
                promotions.name     AS promotion,
                user_vouchers.token AS token
            FROM user_vouchers
            JOIN users          ON user_vouchers."userId"       = users.id
            JOIN vouchers       ON user_vouchers."voucherId"    = vouchers.id
                JOIN promotions ON vouchers."promotionId"       = promotions.id
            WHERE
                    user_vouchers.status = 0
                AND users."emailConfirmed"      = true
                AND NOW() BETWEEN
                        promotions."startDate"
                    AND promotions."endDate"
            ORDER BY vouchers."createdAt"
            );
            
    my $sth = $dbh->prepare( $stmt  );

    my $rv = $sth->execute() or die DBI::errstr;

    print DBI::errstr if $rv < 0;
    
    while (my $rowref = $sth->fetchrow_hashref()) {
        my %row = %$rowref;

        my $username = $row{'username'};
        my $subject = 'Test E-Mail';
        my $promotion = $row{'promotion'};
        my $token = $row{'token'};
        my $message =
            "Congratz!
            You have a voucher!
            Promotion: $promotion and your link is:
            10.21.9.163/verify_token/$token";
        
        my $msg = Email::Simple->create(
            header  => [
                From    => 'danielgudjenev@gmail.com',
                To      => $row{'email'},
                Subject => 'Hey I just met you'
            ],
            body    => $message
        );
          
        sendmail(
            $msg,
            { transport => $transport }
        );

        my $sth = $dbh->prepare("UPDATE user_vouchers SET status = 1 WHERE id = $row{'id'};");
        my $rv = $sth->execute();
        
        print "Email Sent!\n$msg\n";
    }
} catch {
    my $sth = $dbh->prepare('INSERT INTO logs(level, message, "longMessage") VALUES (?, ?, ?);');
    my $rv = $sth->execute('error', "Error while trying to send email!", $_);

    print "Error caught! $_";
};
